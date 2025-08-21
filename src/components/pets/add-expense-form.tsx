
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
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const expenseFormSchema = z.object({
  petId: z.string({ required_error: 'Selecione um pet.'}),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  category: z.enum(['Alimentação', 'Brinquedos', 'Saúde', 'Banho e Tosa', 'Outros'], { required_error: 'Selecione uma categoria.' }),
  description: z.string().min(2, { message: 'A descrição é obrigatória.' }),
  amount: z.coerce.number().min(0.01, { message: 'O valor deve ser maior que zero.' }),
});

type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

interface AddExpenseFormProps {
  pets: Pet[];
  onSuccess?: () => void;
}

export function AddExpenseForm({ pets, onSuccess }: AddExpenseFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      petId: '',
      date: new Date().toISOString().split('T')[0],
      category: undefined,
      description: '',
      amount: undefined,
    },
  });

  async function onSubmit(values: ExpenseFormValues) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você precisa estar logado para adicionar uma despesa.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, "expenses"), {
        ownerUid: user.uid,
        petId: values.petId,
        date: values.date,
        category: values.category,
        description: values.description,
        amount: values.amount,
        createdAt: serverTimestamp(),
      });

      toast({
        title: "Sucesso!",
        description: `Despesa adicionada com sucesso.`,
      });
      form.reset();
      onSuccess?.();
    } catch (e: any) {
      console.error("Error adding document: ", e);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Ocorreu um erro ao adicionar a despesa. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Nova Despesa</DialogTitle>
        <DialogDescription>
          Preencha as informações abaixo para registrar um novo gasto.
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um pet" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {pets.map(pet => (
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
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (R$)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="50,00" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

           <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Alimentação">Alimentação</SelectItem>
                      <SelectItem value="Brinquedos">Brinquedos</SelectItem>
                      <SelectItem value="Saúde">Saúde</SelectItem>
                      <SelectItem value="Banho e Tosa">Banho e Tosa</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ração super premium 15kg" {...field} disabled={isSubmitting}/>
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
              {isSubmitting ? 'Salvando...' : 'Salvar Despesa'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
