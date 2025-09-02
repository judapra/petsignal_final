'use client'

import { useState, useEffect } from 'react';
import { SavedLocation } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, MapPin, Scissors, Stethoscope, Trees, ShoppingCart, MoreVertical, Edit, Trash2, ExternalLink } from "lucide-react";
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { AddLocationForm } from '@/components/pets/add-location-form';
import { EditLocationForm } from '@/components/pets/edit-location-form';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';


const typeIcons: { [key: string]: JSX.Element } = {
  Grooming: <Scissors className="h-5 w-5 text-primary" />,
  Vet: <Stethoscope className="h-5 w-5 text-primary" />,
  Park: <Trees className="h-5 w-5 text-primary" />,
  'Pet Shop': <ShoppingCart className="h-5 w-5 text-primary" />,
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<'add' | 'edit' | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<SavedLocation | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setLocations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const locationsQuery = query(collection(db, "locations"), where("ownerUid", "==", user.uid));
    
    const unsubscribe = onSnapshot(locationsQuery, (snapshot) => {
      const locationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedLocation));
      setLocations(locationsData.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    }, (error) => {
        console.error("Error fetching locations: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setActiveDialog(null);
    setSelectedLocation(null);
  }
  
  const handleDeleteLocation = async (locationId: string) => {
    try {
      await deleteDoc(doc(db, "locations", locationId));
      toast({ title: "Sucesso", description: "Local excluído com sucesso." });
    } catch (error) {
      console.error("Error deleting location: ", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o local." });
    }
  };

  const openDialog = (type: 'add' | 'edit', location?: SavedLocation) => {
    setActiveDialog(type);
    setSelectedLocation(location || null);
    setIsDialogOpen(true);
  }

  const openMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) handleSuccess()}}>
      <AlertDialog>
        <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-3xl font-bold font-headline">Locais Salvos</h1>
            <p className="text-muted-foreground">Seus lugares favoritos para serviços e diversão para pets.</p>
            </div>
            <Button onClick={() => openDialog('add')}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Local
            </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
             [...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader><Skeleton className="h-5 w-2/3" /></CardHeader>
                    <CardContent className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                    </CardContent>
                </Card>
             ))
            ) : locations.length > 0 ? (
            locations.map((location) => (
                <Card key={location.id} className="flex flex-col">
                  <CardHeader className="flex-row items-start justify-between space-y-0 pb-2">
                      <div>
                          <CardTitle className="text-lg font-medium font-headline">{location.name}</CardTitle>
                          <CardDescription>{location.type}</CardDescription>
                      </div>
                      {typeIcons[location.type] || <MapPin className="h-5 w-5 text-primary" />}
                  </CardHeader>
                  <CardContent className="flex-grow flex flex-col justify-between">
                      <p className="flex items-start gap-2 text-sm text-muted-foreground mt-2"><MapPin className="h-4 w-4 mt-0.5 shrink-0" /> {location.address}</p>
                      <div className="flex items-center justify-end gap-2 mt-4">
                          <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => openMaps(location.address)}>
                             Ver no mapa <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                          <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDialog('edit', location)}>
                                  <Edit className="mr-2 h-4 w-4" /> Editar
                                </DropdownMenuItem>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem className="text-destructive focus:text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso excluirá permanentemente o local.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteLocation(location.id)} className="bg-destructive hover:bg-destructive/90">
                                    Sim, Excluir
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                      </div>
                  </CardContent>
                </Card>
            ))
            ) : (
             <Card className="md:col-span-2 lg:col-span-3 flex items-center justify-center border-2 border-dashed bg-transparent min-h-[140px] text-center">
                <div className="text-muted-foreground">
                    <h3 className="text-lg font-semibold">Nenhum local salvo</h3>
                    <p className="mt-1">Comece adicionando um pet shop ou clínica veterinária.</p>
                     <Button variant="outline" className="mt-4" onClick={() => openDialog('add')}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Adicionar Local
                    </Button>
                </div>
            </Card>
            )}
        </div>
         <DialogContent>
            {activeDialog === 'add' && <AddLocationForm onSuccess={handleSuccess} />}
            {activeDialog === 'edit' && selectedLocation && <EditLocationForm location={selectedLocation} onSuccess={handleSuccess} />}
        </DialogContent>
        </div>
       </AlertDialog>
    </Dialog>
  );
}
