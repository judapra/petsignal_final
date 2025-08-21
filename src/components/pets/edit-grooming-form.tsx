
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Pet, Grooming, SavedLocation } from '@/lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

const groomingFormSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  location: z.string().min(2, { message: 'O local é obrigatório.' }),
  services: z.string().min(3, { message: 'Descreva os serviços realizados.' }),
  cost: z.coerce.number().optional(),
  notes: z.string().optional(),
  status: z.enum(['Agendado', 'Concluído', 'Cancelado']),
});

type GroomingFormValues = z.infer<typeof groomingFormSchema>;

interface EditGroomingFormProps {
  pet: Pet;
  grooming: Grooming;
  locations?: SavedLocation[];
  onSuccess?: () => void;
}

export function EditGroomingForm({ pet, grooming, locations = [], onSuccess }: EditGroomingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const form = useForm<GroomingFormValues>({
    resolver: zodResolver(groomingFormSchema),
    defaultValues: {
      date: new Date(grooming.date).toISOString().split('T')[0],
      location: grooming.location || '',
      services: grooming.services || '',
      cost: grooming.cost ?? undefined,
      notes: grooming.notes || '',
      status: grooming.status,
    },
  });

  async function onSubmit(values: GroomingFormValues) {
    if (!user || !pet || !grooming) {
        toast({ variant: "destructive", title: "Erro", description: "Dados insuficientes para atualizar." });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const petRef = doc(db, "pets", pet.id);
        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) throw new Error("Pet não encontrado.");

        const petData = petSnap.data() as Pet;
        const groomingIndex = petData.groomings.findIndex(g => g.id === grooming.id);
        
        if (groomingIndex === -1) throw new Error("Agendamento não encontrado.");

        const wasCompleted = grooming.status === 'Concluído';
        const isNowCompleted = values.status === 'Concluído';

        const updatedGroomings = [...petData.groomings];
        updatedGroomings[groomingIndex] = {
            ...updatedGroomings[groomingIndex],
            date: values.date,
            location: values.location,
            services: values.services,
            cost: values.cost || 0,
            notes: values.notes || '',
            status: values.status,
        };

        await updateDoc(petRef, { groomings: updatedGroomings });

        // Se o status mudou para 'Concluído' e antes não era, e tem custo, adiciona a despesa
        if (isNowCompleted && !wasCompleted && values.cost && values.cost > 0) {
            await addDoc(collection(db, "expenses"), {
                ownerUid: user.uid,
                petId: pet.id,
                date: values.date,
                category: 'Banho e Tosa',
                description: `Serviços: ${values.services}`,
                amount: values.cost,
                createdAt: serverTimestamp(),
            });
            toast({ title: "Sucesso!", description: "Agendamento atualizado e despesa registrada." });
        } else {
            toast({ title: "Sucesso!", description: "Agendamento atualizado." });
        }
        
        onSuccess?.();
    } catch (error) {
        console.error("Error updating grooming session:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o agendamento." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Agendamento de {pet.name}</DialogTitle>
        <DialogDescription>
          Atualize os dados do agendamento.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Agendado">Agendado</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                      <SelectItem value="Cancelado">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custo (Opcional)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um local salvo" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {locations.filter(l => l.type === 'Grooming' || l.type === 'Pet Shop').length > 0 ? 
                            locations.filter(l => l.type === 'Grooming' || l.type === 'Pet Shop').map(loc => (
                                <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                            )) : <SelectItem value="-" disabled>Nenhum local cadastrado</SelectItem>
                        }
                    </SelectContent>
                  </Select>
                  <FormDescription className='flex items-center gap-1'>
                        Não encontrou o local? 
                        <Button variant="link" className="p-0 h-auto" asChild>
                           <Link href="/locations">
                                <PlusCircle className="mr-1 h-3 w-3" /> Adicionar novo local
                           </Link>
                        </Button>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="services"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Serviços *</FormLabel>
                  <FormControl>
                    <Input placeholder="Banho, tosa higiênica, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Observações adicionais" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar Alterações"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
