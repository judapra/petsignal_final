'use client';

import { useState, useEffect } from 'react';
import { Pet, Grooming, SavedLocation } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, MoreVertical, Edit, Trash2, Scissors, CheckCircle, Clock, XCircle, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { AddGroomingForm } from '@/components/pets/add-grooming-form';
import { EditGroomingForm } from '@/components/pets/edit-grooming-form';
import { Skeleton } from '@/components/ui/skeleton';

type EnrichedGrooming = Grooming & { petName: string; petId: string; address?: string };

type DeletionTarget = { type: 'grooming'; item: EnrichedGrooming };

export default function GroomingPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [deletionTarget, setDeletionTarget] = useState<DeletionTarget | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setPets([]);
      setLocations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    let petsLoaded = false;
    let locationsLoaded = false;

    const checkLoading = () => {
      if (petsLoaded && locationsLoaded) {
        setLoading(false);
      }
    };

    const petsQuery = query(collection(db, "pets"), where("ownerUid", "==", user.uid));
    const locationsQuery = query(collection(db, "locations"), where("ownerUid", "==", user.uid));

    const unsubscribePets = onSnapshot(petsQuery, (snapshot) => {
      const petsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
      setPets(petsData);
      petsLoaded = true;
      checkLoading();
    });
    
    const unsubscribeLocations = onSnapshot(locationsQuery, (snapshot) => {
        const locationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedLocation));
        setLocations(locationsData);
        locationsLoaded = true;
        checkLoading();
    });

    return () => {
        unsubscribePets();
        unsubscribeLocations();
    };
  }, [user]);

  const allGroomings: EnrichedGrooming[] = pets.flatMap(pet => 
    (pet.groomings || []).map(g => {
        const locationDetails = locations.find(l => l.name === g.location);
        return { ...g, petName: pet.name, petId: pet.id, address: locationDetails?.address };
    })
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setActiveDialog(null);
    setSelectedItem(null);
  }
  
  const handleDelete = async () => {
    if (!deletionTarget) return;

    const { item } = deletionTarget;
    const petRef = doc(db, "pets", item.petId);

    try {
        const petSnap = await getDoc(petRef);
        if (!petSnap.exists()) throw new Error("Pet não encontrado");

        const petData = petSnap.data() as Pet;
        const updatedArray = (petData.groomings || []).filter(g => g.id !== item.id);
        await updateDoc(petRef, { groomings: updatedArray });

        toast({ title: "Sucesso!", description: "Agendamento de banho e tosa excluído." });
    } catch (error) {
        console.error("Erro ao excluir agendamento:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o agendamento."});
    } finally {
        setDeletionTarget(null);
    }
  };

  const openDialog = (type: string, item: any = null) => {
      setActiveDialog(type);
      setSelectedItem(item);
      setIsDialogOpen(true);
  }

  const navigateToPetProfile = (petId: string) => {
    router.push(`/pets/${petId}`);
  };
  
  const openMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }

  const statusIcons: { [key: string]: JSX.Element } = {
    Agendado: <Clock className="h-4 w-4 text-blue-500" />,
    Concluído: <CheckCircle className="h-4 w-4 text-green-500" />,
    Cancelado: <XCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <AlertDialog onOpenChange={(isOpen) => !isOpen && setDeletionTarget(null)}>
      <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) handleSuccess() }}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                <Scissors className="h-8 w-8 text-primary"/>
                Banho e Tosa
              </h1>
              <p className="text-muted-foreground">Gerencie os agendamentos de banho e tosa dos seus pets.</p>
            </div>
            <Button onClick={() => openDialog('add-grooming')}>
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Agendamento
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Agendamentos</CardTitle>
              <CardDescription>Todos os seus registros de banho e tosa em um só lugar.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pet</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Serviços</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                            <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-8 w-8 float-right" /></TableCell>
                        </TableRow>
                    ))
                  ) :
                  allGroomings.length > 0 ? allGroomings.map((g) => (
                    <TableRow key={`${g.id}-${g.petId}`}>
                      <TableCell>
                        <Button variant="link" onClick={() => navigateToPetProfile(g.petId)} className="p-0 h-auto">
                          {g.petName}
                        </Button>
                      </TableCell>
                      <TableCell>{new Date(g.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                      <TableCell>
                        {g.address ? (
                            <Button variant="link" onClick={() => openMaps(g.address!)} className="p-0 h-auto flex items-center gap-1">
                                {g.location}
                                <ExternalLink className="h-3 w-3" />
                            </Button>
                        ) : (
                            g.location
                        )}
                      </TableCell>
                      <TableCell>{g.services}</TableCell>
                      <TableCell>
                        <Badge variant={
                          g.status === 'Concluído' ? 'default' : g.status === 'Cancelado' ? 'destructive' : 'secondary'
                        } className="flex items-center gap-1.5 w-fit">
                          {statusIcons[g.status]}
                          {g.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDialog('edit-grooming', g)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletionTarget({ type: 'grooming', item: g })}>
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={6} className="text-center py-10">Nenhum agendamento encontrado.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <DialogContent>
            {activeDialog === 'add-grooming' && <AddGroomingForm allPets={pets} locations={locations} onSuccess={handleSuccess} />}
            {activeDialog === 'edit-grooming' && selectedItem && <EditGroomingForm pet={pets.find(p => p.id === selectedItem.petId)!} grooming={selectedItem} locations={locations} onSuccess={handleSuccess} />}
        </DialogContent>
      </Dialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
          <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá excluir permanentemente o registro de banho e tosa.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
          >
              Sim, Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}