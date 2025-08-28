

'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from "next/image";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { collection, query, where, getDocs, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Pet, Exam, Vaccination, Medication, Consultation, WeightEntry, SavedLocation } from "@/lib/placeholder-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dog, Cat, Syringe, FileText, Stethoscope, Pill } from "lucide-react";
import WeightTracker from "@/components/pets/weight-tracker";
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/icons';


export default function PublicPetProfilePage() {
  const params = useParams();
  const { toast } = useToast();
  const shareId = params.shareId as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [calculatedAge, setCalculatedAge] = useState<string | null>(null);

  const calculateAge = (birthDate: string) => {
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

  const fetchPetByShareId = useCallback(() => {
    if (!shareId) return;

    setLoading(true);

    const petsRef = collection(db, "pets");
    const q = query(petsRef, where("shareId", "==", shareId));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const petDoc = querySnapshot.docs[0];
        const petData = { id: petDoc.id, ...petDoc.data() } as Pet;
        setPet(petData);

        if (petData.birthDate) {
          setCalculatedAge(calculateAge(petData.birthDate));
        } else {
          setCalculatedAge(null);
        }
      } else {
        toast({ variant: 'destructive', title: 'Perfil não encontrado', description: 'O link de compartilhamento pode estar inválido ou o perfil foi removido.' });
        notFound();
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pet by shareId:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados do pet." });
      setLoading(false);
      notFound();
    });

    return () => unsubscribe();
  }, [shareId, toast]);

  useEffect(() => {
    const unsubscribe = fetchPetByShareId();
    return () => unsubscribe?.();
  }, [fetchPetByShareId]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <Skeleton className="h-[150px] w-[150px] rounded-full" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-6 w-1/4" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </CardContent>
        </Card>
      </div>
    )
  }

  if (!pet) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
            <h1 className="text-2xl font-bold">Perfil não encontrado</h1>
            <p className="text-muted-foreground">O link pode estar quebrado ou o perfil foi removido.</p>
        </div>
    ); 
  }

  return (
      <div className="bg-background min-h-screen">
          <header className="p-4 border-b bg-card">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <Logo />
                   <div className="text-right">
                       <p className="font-semibold text-foreground">Perfil de {pet.name}</p>
                       <p className="text-xs text-muted-foreground">Compartilhado via PetSignal</p>
                   </div>
              </div>
          </header>
          <main className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
            <div className="flex flex-col items-start gap-6 md:flex-row">
              <Image
                src={pet.photoUrl || 'https://placehold.co/150x150.png'}
                alt={`Foto de ${pet.name}`}
                width={150}
                height={150}
                className="rounded-full object-cover border-4 border-card shadow-md"
                data-ai-hint={`${pet.species}`}
              />
              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                    <h1 className="text-4xl font-bold font-headline">{pet.name}</h1>
                    {pet.isDeceased && <Badge variant="destructive">Falecido(a)</Badge>}
                </div>
                <div className="flex items-center gap-4 text-muted-foreground mt-2">
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

            <Tabs defaultValue="overview">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="consultations">Consultas</TabsTrigger>
                <TabsTrigger value="vaccinations">Vacinas</TabsTrigger>
                <TabsTrigger value="exams">Exames</TabsTrigger>
                <TabsTrigger value="medications">Medicamentos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                  <Card>
                      <CardHeader>
                          <CardTitle>Detalhes do Pet</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                          <div className="flex justify-between items-center p-2 rounded-md">
                              <span className="font-medium text-muted-foreground">Nascimento</span>
                              <span>
                                {pet.birthDate ? new Date(pet.birthDate).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}
                                {pet.isBirthDateApproximate && " (Aprox.)"}
                              </span>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-md">
                              <span className="font-medium text-muted-foreground">Idade</span>
                              <span>{calculatedAge ?? 'N/A'}</span>
                          </div>
                           <div className="flex justify-between items-center p-2 rounded-md">
                              <span className="font-medium text-muted-foreground">Peso</span>
                              <span>{pet.weight ? `${pet.weight} kg` : 'N/A'}</span>
                          </div>
                           <div className="flex justify-between items-center p-2 rounded-md">
                              <span className="font-medium text-muted-foreground">Microchip ID</span>
                              <span>{pet.microchip || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center p-2 rounded-md">
                              <span className="font-medium text-muted-foreground">Castrado(a)</span>
                              <Badge variant={pet.isSpayed ? "default" : "secondary"}>
                                  {pet.isSpayed ? "Sim" : "Não"}
                              </Badge>
                          </div>
                      </CardContent>
                  </Card>
              </TabsContent>

              <TabsContent value="consultations" className="mt-6">
                <Card>
                   <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Consultas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Motivo</TableHead><TableHead>Local</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {pet.consultations?.length > 0 ? pet.consultations.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>{new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                            <TableCell>{c.reason}</TableCell>
                            <TableCell>{c.location || 'N/A'}</TableCell>
                          </TableRow>
                        )): <TableRow><TableCell colSpan={3} className="text-center py-10">Nenhuma consulta registrada.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="vaccinations" className="mt-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Syringe className="h-5 w-5 text-primary" /> Vacinas</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Vacina</TableHead><TableHead>Veterinário</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {pet.vaccinations?.length > 0 ? pet.vaccinations.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((v) => (
                          <TableRow key={v.id}>
                            <TableCell>{v.vaccineName}</TableCell>
                            <TableCell>{v.vetName}</TableCell>
                            <TableCell>{new Date(v.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center py-10">Nenhuma vacina registrada.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
    
              <TabsContent value="exams" className="mt-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Exames</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Tipo de Exame</TableHead><TableHead>Data</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {pet.exams?.length > 0 ? pet.exams.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e) => (
                          <TableRow key={e.id}>
                            <TableCell>{e.type}</TableCell>
                            <TableCell>{new Date(e.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={2} className="text-center py-10">Nenhum exame registrado.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
    
              <TabsContent value="medications" className="mt-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-primary" /> Medicamentos</CardTitle></CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Dosagem</TableHead><TableHead>Frequência</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {pet.medications?.length > 0 ? pet.medications.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell>{m.name}</TableCell>
                            <TableCell>{m.dosage}</TableCell>
                            <TableCell>{m.frequency}</TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={3} className="text-center py-10">Nenhuma medicamento registrado.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </main>
      </div>
  );
}