
'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Pet } from "@/lib/placeholder-data";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { PlusCircle, Dog, Cat } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Skeleton } from "../../../components/ui/skeleton";
import { onAuthStateChanged } from "firebase/auth";
import { Dialog, DialogTrigger, DialogContent } from "../../../components/ui/dialog";
import { AddPetForm } from "../../../components/pets/add-pet-form";

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddPetDialogOpen, setIsAddPetDialogOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setPets([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const petsCollection = collection(db, "pets");
    const q = query(petsCollection, where("ownerUid", "==", user.uid));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const petsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
      setPets(petsList);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pets:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <Dialog open={isAddPetDialogOpen} onOpenChange={setIsAddPetDialogOpen}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">Meus Pets</h1>
            <p className="text-muted-foreground">Gerencie os perfis dos seus companheiros.</p>
          </div>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Novo Pet
            </Button>
          </DialogTrigger>
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                    <Skeleton className="h-40 w-full rounded-md" />
                </CardHeader>
                <CardContent className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pets.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {pets.map((pet) => (
              <Link href={`/pets/${pet.id}`} key={pet.id} className="group">
                <Card className="overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1">
                  <div className="aspect-square overflow-hidden">
                    <Image
                      src={pet.photoUrl || 'https://placehold.co/400x400.png'}
                      alt={`Foto de ${pet.name}`}
                      width={400}
                      height={400}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      data-ai-hint={`${pet.species}`}
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>{pet.name}</span>
                        {pet.species === 'Dog' ? <Dog className="h-5 w-5 text-muted-foreground" /> : <Cat className="h-5 w-5 text-muted-foreground" />}
                    </CardTitle>
                    <CardDescription>{pet.breed || 'Sem raça definida'}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed rounded-lg">
            <h3 className="text-xl font-semibold">Nenhum pet encontrado</h3>
            <p className="text-muted-foreground mt-2 mb-4">Que tal adicionar seu primeiro companheiro?</p>
            <DialogTrigger asChild>
                <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Adicionar Pet
                </Button>
            </DialogTrigger>
          </div>
        )}
      </div>
      <DialogContent>
        <AddPetForm onSuccess={() => setIsAddPetDialogOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
