
'use client';

import { useState, useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { collection, query, where, getDocs, doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Pet, Exam, Vaccination, Medication, Consultation, WeightEntry } from '@/lib/placeholder-data';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { Dog, Cat, Syringe, FileText, Stethoscope, Pill } from 'lucide-react';
import WeightTracker from '@/components/pets/weight-tracker';
import { Logo } from '@/components/icons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function PublicPetProfilePage() {
  const params = useParams();
  const shareId = params.shareId as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) {
      setError("ID de compartilhamento inválido.");
      setLoading(false);
      return;
    }

    const petsRef = collection(db, 'pets');
    const q = query(petsRef, where('shareId', '==', shareId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (querySnapshot.empty) {
        setError("Perfil de pet não encontrado ou o compartilhamento foi desativado.");
        setPet(null);
      } else {
        const petData = querySnapshot.docs[0].data() as Pet;
        setPet(petData);
        setError(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching shared pet:", err);
      setError("Ocorreu um erro ao buscar o perfil do pet.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [shareId]);


  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-secondary">
          <div className="space-y-6 max-w-4xl w-full mx-auto p-4">
            <div className="flex flex-col items-center gap-6 md:flex-row">
              <Skeleton className="h-[150px] w-[150px] rounded-full" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-6 w-1/4" />
              </div>
            </div>
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-1/3" />
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
          </div>
      </div>
    );
  }

  if (error) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-secondary p-4 text-center">
            <Logo />
            <h2 className="mt-8 text-2xl font-bold text-destructive">Oops! Algo deu errado.</h2>
            <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!pet) {
    return notFound();
  }
  
   const calculateAge = (birthDate?: string) => {
      if (!birthDate) return 'N/A';
      const birthDateObj = new Date(birthDate);
      const today = new Date();
      let ageYears = today.getFullYear() - birthDateObj.getFullYear();
      let ageMonths = today.getMonth() - birthDateObj.getMonth();
      if (ageMonths < 0 || (ageMonths === 0 && today.getDate() < birthDateObj.getDate())) {
        ageYears--;
        ageMonths = (12 + ageMonths) % 12;
      }
      if (ageYears > 0) {
        return `${ageYears} ano${ageYears > 1 ? 's' : ''}`;
      } else {
         const finalMonths = Math.max(ageMonths, 0)
        return `${finalMonths} mes${finalMonths !== 1 ? 'es' : ''}`;
      }
  }


  return (
    <div className="min-h-screen bg-secondary">
        <header className="bg-card py-4 shadow-sm">
            <div className="max-w-4xl mx-auto flex justify-center">
                 <Logo />
            </div>
        </header>
        <main className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
             <div className="space-y-6">
                <div className="flex flex-col items-center gap-6 md:flex-row bg-card p-6 rounded-lg shadow">
                  <Image
                    src={pet.photoUrl || 'https://placehold.co/150x150.png'}
                    alt={`Foto de ${pet.name}`}
                    width={150}
                    height={150}
                    className="rounded-full object-cover border-4 border-background"
                    data-ai-hint={`${pet.species}`}
                  />
                  <div className="flex-1 space-y-2 text-center md:text-left">
                      <h1 className="text-4xl font-bold font-headline">{pet.name}</h1>
                      <div className="flex items-center justify-center md:justify-start gap-4 text-muted-foreground mt-2">
                        <div className="flex items-center gap-2">
                            {pet.species === 'Dog' ? <Dog className="h-5 w-5" /> : <Cat className="h-5 w-5" />}
                            <span>{pet.species}</span>
                          </div>
                          {pet.breed && (
                            <div className="flex items-center gap-2">
                              <span className='text-xs'>●</span>
                              <span>{pet.breed}</span>
                            </div>
                          )}
                      </div>
                  </div>
                </div>

                 <Card>
                  <CardHeader>
                      <CardTitle>Detalhes do Pet</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="flex justify-between items-center p-2 rounded-md bg-background">
                          <span className="font-medium text-muted-foreground">Nascimento</span>
                          <span>
                            {pet.birthDate ? new Date(pet.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}
                            {pet.isBirthDateApproximate && " (Aprox.)"}
                          </span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-background">
                          <span className="font-medium text-muted-foreground">Idade</span>
                          <span>{calculateAge(pet.birthDate)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-background">
                          <span className="font-medium text-muted-foreground">Peso</span>
                          <span>{pet.weight ? `${pet.weight} kg` : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-background">
                          <span className="font-medium text-muted-foreground">Microchip ID</span>
                          <span>{pet.microchip || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-background">
                          <span className="font-medium text-muted-foreground">Plano de Saúde</span>
                          <span>{pet.healthPlan || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-background">
                          <span className="font-medium text-muted-foreground">Castrado(a)</span>
                          <Badge variant={pet.isSpayed ? "default" : "secondary"}>
                              {pet.isSpayed ? "Sim" : "Não"}
                          </Badge>
                      </div>
                  </CardContent>
              </Card>

              {pet.weightHistory && pet.weightHistory.length > 0 && <WeightTracker pet={pet} />}
              
               {pet.vaccinations && pet.vaccinations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Syringe /> Vacinas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vacina</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead>Próxima Dose</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pet.vaccinations.map(v => (
                          <TableRow key={v.id}>
                            <TableCell>{v.vaccineName}</TableCell>
                            <TableCell>{new Date(v.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                             <TableCell>{v.nextApplicationDate ? new Date(v.nextApplicationDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

            </div>
        </main>
    </div>
  );
}
