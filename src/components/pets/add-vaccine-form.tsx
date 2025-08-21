
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pet } from '../../lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

const vaccineFormSchema = z.object({
  petId: z.string({ required_error: 'Selecione um pet.'}),
  vaccineName: z.string().min(2, { message: 'O nome da vacina é obrigatório.' }),
  vetName: z.string().min(2, { message: 'O nome do veterinário é obrigatório.' }),
  crmv: z.string().min(1, { message: 'O CRMV é obrigatório.' }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  nextApplicationDate: z.string().optional(),
  cost: z.coerce.number().optional(),
});

type VaccineFormValues = z.infer<typeof vaccineFormSchema>;

interface AddVaccineFormProps {
  petId?: string;
  allPets?: Pet[];
  onSuccess?: () => void;
}

export function AddVaccineForm({ petId, allPets = [], onSuccess }: AddVaccineFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;
  
  const defaultPetId = petId || (allPets.length > 0 ? allPets[0].id : '');

  const form = useForm<VaccineFormValues>({
    resolver: zodResolver(vaccineFormSchema),
    defaultValues: {
      petId: defaultPetId,
      vaccineName: '',
      vetName: '',
      crmv: '',
      date: new Date().toISOString().split('T')[0],
      nextApplicationDate: '',
      cost: undefined,
    },
  });

  async function onSubmit(values: VaccineFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
    if (!values.petId) {
        toast({ variant: "destructive", title: "Erro", description: "Por favor, selecione um pet." });
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

        const newVaccine: {[key: string]: any} = {
            id: uuidv4(),
            vaccineName: values.vaccineName,
            vetName: values.vetName,
            crmv: values.crmv,
            date: values.date,
        };
        
        if (values.nextApplicationDate) newVaccine.nextApplicationDate = values.nextApplicationDate;
        
        const updatedVaccinations = [...(petData.vaccinations || []), newVaccine];

        await updateDoc(petRef, {
            vaccinations: updatedVaccinations
        });
        
        // Se houver custo, adiciona como uma despesa
        if (values.cost && values.cost > 0) {
            await addDoc(collection(db, "expenses"), {
                ownerUid: user.uid,
                petId: values.petId,
                date: values.date,
                category: 'Saúde',
                description: `Vacina: ${values.vaccineName}`,
                amount: values.cost,
                createdAt: serverTimestamp(),
            });
        }
        
        toast({ title: "Sucesso!", description: "Vacina adicionada." });
        onSuccess?.();
    } catch (error) {
        console.error("Error adding vaccine:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar a vacina." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Vacina</DialogTitle>
        <DialogDescription>
          Preencha os detalhes da vacina abaixo. Se houver custo, ele será adicionado às despesas.
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
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Adicionar Vacina"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
