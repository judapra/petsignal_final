
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Pet, Medication } from '../../lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const medicationFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome do medicamento é obrigatório.' }),
  dosage: z.string().min(1, { message: 'A dosagem é obrigatória.' }),
  frequency: z.string().min(3, { message: 'A frequência é obrigatória.' }),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data de início inválida."}),
  endDate: z.string().optional(),
  consultationId: z.string().optional(),
});

type MedicationFormValues = z.infer<typeof medicationFormSchema>;

interface EditMedicationFormProps {
  pet: Pet;
  medication: Medication;
  onSuccess?: () => void;
}

export function EditMedicationForm({ pet, medication, onSuccess }: EditMedicationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      name: medication.name || '',
      dosage: medication.dosage || '',
      frequency: medication.frequency || '',
      startDate: medication.startDate ? new Date(medication.startDate).toISOString().split('T')[0] : '',
      endDate: medication.endDate ? new Date(medication.endDate).toISOString().split('T')[0] : '',
      consultationId: medication.consultationId || 'none',
    },
  });

  async function onSubmit(values: MedicationFormValues) {
    if (!user || !pet || !medication) {
      toast({ variant: "destructive", title: "Erro", description: "Dados insuficientes para atualizar." });
      return;
    }
    setIsSubmitting(true);
    try {
        const petRef = doc(db, "pets", pet.id);
        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) throw new Error("Pet não encontrado.");
        
        const petData = petSnap.data() as Pet;
        const medicationIndex = petData.medications.findIndex(m => m.id === medication.id);

        if (medicationIndex === -1) throw new Error("Medicamento não encontrado.");
        
        const updatedMedications = [...petData.medications];
        updatedMedications[medicationIndex] = {
            ...updatedMedications[medicationIndex],
            name: values.name,
            dosage: values.dosage,
            frequency: values.frequency,
            startDate: values.startDate,
            endDate: values.endDate || undefined,
            consultationId: values.consultationId === 'none' ? undefined : values.consultationId,
        };

        await updateDoc(petRef, { medications: updatedMedications });
        toast({ title: "Sucesso!", description: "Medicamento atualizado." });
        onSuccess?.();
    } catch (error) {
        console.error("Error updating medication:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o medicamento." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Medicamento de {pet.name}</DialogTitle>
        <DialogDescription>
          Atualize os detalhes do medicamento abaixo.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Medicamento</FormLabel>
                <FormControl>
                  <Input placeholder="Apoquel" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="dosage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dosagem</FormLabel>
                <FormControl>
                  <Input placeholder="16mg" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="frequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Frequência</FormLabel>
                <FormControl>
                  <Input placeholder="Uma vez ao dia" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Início</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Final (Opcional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
            control={form.control}
            name="consultationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vincular à Consulta (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma consulta"/>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {pet.consultations?.length > 0 ? (
                      pet.consultations
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {new Date(c.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - {c.reason}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="-" disabled>Nenhuma consulta encontrada para este pet</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
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
