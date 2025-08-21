
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const locationFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome do local é obrigatório.' }),
  type: z.enum(['Grooming', 'Vet', 'Park', 'Pet Shop'], { required_error: 'Selecione um tipo.' }),
  address: z.string().min(5, { message: 'O endereço é obrigatório.' }),
});

type LocationFormValues = z.infer<typeof locationFormSchema>;

interface AddLocationFormProps {
  onSuccess?: () => void;
}

export function AddLocationForm({ onSuccess }: AddLocationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const form = useForm<LocationFormValues>({
    resolver: zodResolver(locationFormSchema),
    defaultValues: {
      name: '',
      type: undefined,
      address: '',
    },
  });

  async function onSubmit(values: LocationFormValues) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você precisa estar logado para adicionar um local.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "locations"), {
        ownerUid: user.uid,
        name: values.name,
        type: values.type,
        address: values.address,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Sucesso!",
        description: "Local adicionado com sucesso.",
      });
      form.reset();
      onSuccess?.();
    } catch (e: any) {
      console.error("Error adding document: ", e);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao adicionar o local. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Novo Local</DialogTitle>
        <DialogDescription>
          Preencha as informações abaixo para registrar um novo local.
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
              {isSubmitting ? 'Salvando...' : 'Salvar Local'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
