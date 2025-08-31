
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Input } from '../ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pet, SavedLocation } from '@/lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '../ui/textarea';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';

const groomingFormSchema = z.object({
  petId: z.string({ required_error: 'Selecione um pet.'}),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  location: z.string().min(2, { message: 'O local é obrigatório.' }),
  services: z.string().min(3, { message: 'Descreva os serviços realizados.' }),
  cost: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type GroomingFormValues = z.infer<typeof groomingFormSchema>;

interface AddGroomingFormProps {
  petId?: string;
  allPets?: Pet[];
  locations?: SavedLocation[];
  onSuccess?: () => void;
}

export function AddGroomingForm({ petId, allPets = [], locations = [], onSuccess }: AddGroomingFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const defaultPetId = petId || (allPets.length > 0 ? allPets[0].id : '');

  const form = useForm<GroomingFormValues>({
    resolver: zodResolver(groomingFormSchema),
    defaultValues: {
      petId: defaultPetId,
      date: new Date().toISOString().split('T')[0],
      location: '',
      services: '',
      notes: '',
      cost: undefined,
    },
  });

  async function onSubmit(values: GroomingFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const petRef = doc(db, "pets", values.petId);
        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) {
          throw new Error("Pet não encontrado.");
        }

        const petData = petSnap.data() as Pet;

        const newGrooming: {[key: string]: any} = {
            id: uuidv4(),
            petId: values.petId,
            date: values.date,
            location: values.location,
            services: values.services,
            cost: values.cost || 0,
            notes: values.notes || '',
            status: 'Agendado'
        };
        
        const updatedGroomings = [...(petData.groomings || []), newGrooming];
        
        await updateDoc(petRef, {
            groomings: updatedGroomings
        });

        toast({ title: "Sucesso!", description: "Agendamento de banho e tosa criado." });
        onSuccess?.();
    } catch (error) {
        console.error("Error adding grooming session:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível criar o agendamento." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Agendamento de Banho e Tosa</DialogTitle>
        <DialogDescription>
          Preencha os dados do agendamento. A despesa será criada quando o status for alterado para 'Concluído'.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="petId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet *</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!petId}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um pet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {allPets.map(pet => (
                        <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
                      ))}
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
                    <Textarea placeholder="Observações adicionais (ex: usar shampoo antialérgico)" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar Agendamento"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
