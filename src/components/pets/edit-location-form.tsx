
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { SavedLocation } from '@/lib/placeholder-data';

const locationFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome do local é obrigatório.' }),
  type: z.enum(['Grooming', 'Vet', 'Park', 'Pet Shop'], { required_error: 'Selecione um tipo.' }),
  address: z.string().min(5, { message: 'O endereço é obrigatório.' }),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface EditLocationFormProps {
  location: SavedLocation;
  onSuccess?: () => void;
}

export function EditLocationForm({ location, onSuccess }: EditLocationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: location.name || '',
      type: location.type,
      address: location.address || '',
    },
  });

  async function onSubmit(values: LocationFormValues) {
    if (!location.id) {
        toast({
            variant: "destructive",
            title: "Erro",
            description: "ID do local não encontrado.",
        });
        return;
    }
    setIsSubmitting(true);
    try {
      const locationRef = doc(db, "locations", location.id);
      await updateDoc(locationRef, values);
      toast({
        title: "Sucesso!",
        description: "Local atualizado com sucesso.",
      });
      onSuccess?.();
    } catch (e: any) {
      console.error("Error updating document: ", e);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o local. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Local</DialogTitle>
        <DialogDescription>
          Atualize as informações do local salvo.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Local</FormLabel>
                <FormControl>
                  <Input placeholder="Petz Morumbi" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

           <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Local</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Pet Shop">Pet Shop</SelectItem>
                      <SelectItem value="Vet">Veterinário</SelectItem>
                      <SelectItem value="Grooming">Banho e Tosa</SelectItem>
                      <SelectItem value="Park">Parque</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Input placeholder="Av. Giovanni Gronchi, 5819" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          
          <DialogFooter>
             <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
