'use client'

import { useState, useEffect } from 'react';
import { Pet, Expense } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, DollarSign, MoreHorizontal, Edit, Trash2, Loader2 } from "lucide-react";
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AddExpenseForm } from '@/components/pets/add-expense-form';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { EditExpenseForm } from '@/components/pets/edit-expense-form';
import { Skeleton } from '@/components/ui/skeleton';


export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<'add' | 'edit' | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setExpenses([]);
      setPets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const petsQuery = query(collection(db, "pets"), where("ownerUids", "array-contains", user.uid));
    const expensesQuery = query(collection(db, "expenses"), where("ownerUid", "==", user.uid));

    const unsubscribePets = onSnapshot(petsQuery, (snapshot) => {
      const petsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
      setPets(petsData);
    }, (error) => {
        console.error("Error fetching pets: ", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os pets." });
    });

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expensesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(expensesData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setLoading(false);
    }, (error) => {
        console.error("Error fetching expenses: ", error);
        setLoading(false);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as despesas." });
    });

    return () => {
      unsubscribePets();
      unsubscribeExpenses();
    };

  }, [user, toast]);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const getPetName = (petId: string) => {
    return pets.find(p => p.id === petId)?.name || 'N/A';
  }
  
  const handleFormSuccess = () => {
    setIsDialogOpen(false);
    setActiveDialog(null);
    setSelectedExpense(null);
  }

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteDoc(doc(db, "expenses", expenseToDelete));
      toast({ title: "Sucesso!", description: "Despesa excluída." });
    } catch (error) {
      console.error("Error deleting expense: ", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir a despesa." });
    } finally {
        setExpenseToDelete(null);
    }
  };
  
  const openDialog = (type: 'add' | 'edit', expense?: Expense) => {
    setActiveDialog(type);
    setSelectedExpense(expense || null);
    setIsDialogOpen(true);
  }

  const renderSkeleton = () => (
     [...Array(5)].map((_, i) => (
        <TableRow key={i}>
            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
        </TableRow>
    ))
  );

  return (
    <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleFormSuccess()}}>
      <AlertDialog onOpenChange={(isOpen) => { if (!isOpen) setExpenseToDelete(null) }}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-headline">Gerenciamento de Despesas</h1>
              <p className="text-muted-foreground">Acompanhe seus gastos relacionados a pets.</p>
            </div>
            <Button onClick={() => openDialog('add')}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Despesa
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary"/> Despesas Totais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {loading ? <Loader2 className="h-8 w-8 animate-spin" /> : totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Despesas</CardTitle>
              <CardDescription>Uma lista detalhada de todas as despesas registradas.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? renderSkeleton() : expenses.length > 0 ? (
                    expenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>{new Date(expense.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                        <TableCell>{getPetName(expense.petId)}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell className="text-right font-medium">
                          {expense.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                        <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog('edit', expense)}>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Editar
                                    </DropdownMenuItem>
                                  <AlertDialogTrigger asChild>
                                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setExpenseToDelete(expense.id)}>
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Excluir
                                      </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                </DropdownMenuContent>
                              </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">Nenhuma despesa encontrada.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <DialogContent>
              {activeDialog === 'add' && <AddExpenseForm pets={pets} onSuccess={handleFormSuccess} />}
              {activeDialog === 'edit' && selectedExpense && <EditExpenseForm expense={selectedExpense} pets={pets} onSuccess={handleFormSuccess} />}
          </DialogContent>
        </div>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta ação não pode ser desfeita. Isso irá excluir permanentemente a despesa.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
                onClick={handleDeleteExpense}
                className="bg-destructive hover:bg-destructive/90"
            >
                Sim, Excluir
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
