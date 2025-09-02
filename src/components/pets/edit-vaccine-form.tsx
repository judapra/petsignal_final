
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Pet, Vaccination } from '@/lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

const vaccineFormSchema = z.object({
  vaccineName: z.string().min(2, { message: 'O nome da vacina é obrigatório.' }),
  vetName: z.string().min(2, { message: 'O nome do veterinário é obrigatório.' }),
  crmv: z.string().min(1, { message: 'O CRMV é obrigatório.' }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  nextApplicationDate: z.string().optional(),
  cost: z.coerce.number().optional(),
});

type VaccineFormValues = z.infer<typeof vaccineFormSchema>;

interface EditVaccineFormProps {
  pet: Pet;
  vaccine: Vaccination;
  onSuccess?: () => void;
}

export function EditVaccineForm({ pet, vaccine, onSuccess }: EditVaccineFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const form = useForm<VaccineFormValues>({
    resolver: zodResolver(vaccineFormSchema),
    defaultValues: {
      vaccineName: vaccine.vaccineName || '',
      vetName: vaccine.vetName || '',
      crmv: vaccine.crmv || '',
      date: vaccine.date ? new Date(vaccine.date).toISOString().split('T')[0] : '',
      nextApplicationDate: (vaccine as any).nextApplicationDate ? new Date((vaccine as any).nextApplicationDate).toISOString().split('T')[0] : '',
      cost: (vaccine as any).cost ?? undefined,
    },
  });

  async function onSubmit(values: VaccineFormValues) {
    if (!user || !pet || !vaccine) {
      toast({ variant: "destructive", title: "Erro", description: "Dados insuficientes para atualizar." });
      return;
    }
    setIsSubmitting(true);
    try {
        const petRef = doc(db, "pets", pet.id);
        const petSnap = await getDoc(petRef);
        if (!petSnap.exists()) throw new Error("Pet não encontrado.");

        const petData = petSnap.data() as Pet;
        const vaccineIndex = petData.vaccinations.findIndex(v => v.id === vaccine.id);

        if (vaccineIndex === -1) throw new Error("Vacina não encontrada.");

        const updatedVaccinations = [...petData.vaccinations];
        updatedVaccinations[vaccineIndex] = {
            ...updatedVaccinations[vaccineIndex],
            vaccineName: values.vaccineName,
            vetName: values.vetName,
            crmv: values.crmv,
            date: values.date,
            nextApplicationDate: values.nextApplicationDate || undefined,
            cost: values.cost || 0,
        };

        const batch = writeBatch(db);
        batch.update(petRef, { vaccinations: updatedVaccinations });

        const newCost = values.cost ?? 0;
        const oldCost = (vaccine as any).cost ?? 0;

        if (newCost > 0 && oldCost === 0) {
            const expenseRef = doc(collection(db, "expenses"));
            batch.set(expenseRef, {
               ownerUid: user.uid,
               petId: pet.id,
               date: values.date,
               category: 'Saúde',
               description: `Vacina: ${values.vaccineName}`,
               amount: newCost,
               createdAt: serverTimestamp(),
            });
        }
        
        await batch.commit();
        toast({ title: "Sucesso!", description: "Vacina atualizada." });
        onSuccess?.();
    } catch (error) {
        console.error("Error updating vaccine:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar a vacina." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Vacina de {pet.name}</DialogTitle>
        <DialogDescription>
          Atualize os detalhes da vacina abaixo.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="vaccineName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Vacina</FormLabel>
                <FormControl>
                  <Input placeholder="V10" {...field} disabled={isSubmitting} />
                </FormControl>
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
                  <FormLabel>Data da Aplicação</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="nextApplicationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Próxima Aplicação (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
            control={form.control}
            name="vetName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Veterinário</FormLabel>
                <FormControl>
                  <Input placeholder="Dr. Silva" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="crmv"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CRMV</FormLabel>
                <FormControl>
                  <Input placeholder="SP-12345" {...field} disabled={isSubmitting} />
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
                  <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} value={field.value ?? ''} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="outline" type="button" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar Alterações"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
