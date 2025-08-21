
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pet } from '@/lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';


const medicationFormSchema = z.object({
  petId: z.string({ required_error: 'Selecione um pet.'}),
  name: z.string().min(2, { message: 'O nome do medicamento é obrigatório.' }),
  dosage: z.string().min(1, { message: 'A dosagem é obrigatória.' }),
  frequency: z.string().min(3, { message: 'A frequência é obrigatória.' }),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data de início inválida."}),
  endDate: z.string().optional(),
  consultationId: z.string().optional(),
});

type MedicationFormValues = z.infer<typeof medicationFormSchema>;

interface AddMedicationFormProps {
  petId?: string;
  allPets?: Pet[];
  onSuccess?: () => void;
}

export function AddMedicationForm({ petId, allPets = [], onSuccess }: AddMedicationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const defaultPetId = petId || (allPets.length > 0 ? allPets[0].id : '');
  const [selectedPetId, setSelectedPetId] = useState(defaultPetId);

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationFormSchema),
    defaultValues: {
      petId: defaultPetId,
      name: '',
      dosage: '',
      frequency: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      consultationId: '',
    },
  });

  const selectedPet = allPets.find(p => p.id === selectedPetId);

  async function onSubmit(values: MedicationFormValues) {
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

        const newMedication: {[key: string]: any} = {
            id: uuidv4(),
            petId: values.petId,
            name: values.name,
            dosage: values.dosage,
            frequency: values.frequency,
            startDate: values.startDate,
            consultationId: values.consultationId === 'none' ? undefined : values.consultationId,
        };

        if (values.endDate) newMedication.endDate = values.endDate;

        const updatedMedications = [...(petData.medications || []), newMedication];

        await updateDoc(petRef, {
            medications: updatedMedications
        });
        toast({ title: "Sucesso!", description: "Medicamento adicionado." });
        onSuccess?.();
    } catch (error) {
        console.error("Error adding medication:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar o medicamento." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Medicamento</DialogTitle>
        <DialogDescription>
          Preencha os detalhes do medicamento abaixo.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
              control={form.control}
              name="petId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet</FormLabel>
                   <Select 
                     onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPetId(value);
                     }}
                     defaultValue={field.value} 
                     disabled={!!petId || isSubmitting}
                   >
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
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting || !selectedPetId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma consulta"/>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                     <SelectItem value="none">Nenhuma</SelectItem>
                    {selectedPet && selectedPet.consultations?.length > 0 ? (
                      selectedPet.consultations
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
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Adicionar Medicamento"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
