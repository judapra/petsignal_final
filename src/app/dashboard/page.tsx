'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { Pet, Consultation, Vaccination } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PlusCircle, Dog, Cat, Syringe, Pill, Stethoscope, ArrowUpRight, Calendar, BarChart3, Heart, FileText, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { AddPetForm } from "@/components/pets/add-pet-form";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { onAuthStateChanged, User } from "firebase/auth";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";

const chartConfig = {
  vaccines: {
    label: "Vacinas",
    color: "#16a34a",
  },
  consultations: {
    label: "Consultas",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

type UpcomingEvent = (Consultation | Vaccination) & { type: string, petName: string };

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddPetDialogOpen, setIsAddPetDialogOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
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

  const allVaccinations = pets.flatMap(pet => (pet.vaccinations || []).map(v => ({...v, petId: pet.id, petName: pet.name })));
  const allMedications = pets.flatMap(pet => pet.medications || []);
  const allConsultations = pets.flatMap(pet => (pet.consultations || []).map(c => ({...c, petId: pet.id, petName: pet.name })));

  const upcomingEvents: UpcomingEvent[] = [
    ...allConsultations.map(c => ({...c, type: 'Consulta', petName: c.petName, date: c.date })),
    ...allVaccinations.map(v => ({...v, type: 'Vacina', petName: v.petName, date: v.nextApplicationDate || v.date }))
  ]
  .filter(event => {
    if (!event.date) return false;
    const eventDate = new Date(event.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDate >= today;
  })
  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  .slice(0, 5) as UpcomingEvent[];
  
  const activityData = pets.map(pet => ({
    name: pet.name,
    vaccines: (pet.vaccinations || []).length,
    consultations: (pet.consultations || []).length
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-6 md:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="lg:col-span-2 h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isAddPetDialogOpen} onOpenChange={setIsAddPetDialogOpen}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
            <p className="text-muted-foreground">Bem-vindo(a) ao seu PetSignal.</p>
          </div>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Adicionar Novo Pet
            </Button>
          </DialogTrigger>
        </div>

        {/* Stat Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link href="/pets">
            <Card className="hover:bg-muted transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Meus Pets</CardTitle>
                <Heart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pets.length}</div>
                <p className="text-xs text-muted-foreground">Gerencie seus pets</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/health?tab=vaccinations">
            <Card className="hover:bg-muted transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vacinas</CardTitle>
                <Syringe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allVaccinations.length}</div>
                <p className="text-xs text-muted-foreground">Controle de vacinas</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/health?tab=medications">
            <Card className="hover:bg-muted transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Medicamentos</CardTitle>
                <Pill className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allMedications.length}</div>
                <p className="text-xs text-muted-foreground">Medicações ativas</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/health?tab=consultations">
            <Card className="hover:bg-muted transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consultas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{allConsultations.length}</div>
                <p className="text-xs text-muted-foreground">Histórico médico</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3/> Resumo Geral</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                      <p className="text-2xl font-bold">{pets.length}</p>
                      <p className="text-sm text-muted-foreground">Pets</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                      <p className="text-2xl font-bold">{allVaccinations.length}</p>
                      <p className="text-sm text-muted-foreground">Vacinas</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                      <p className="text-2xl font-bold">{allConsultations.length}</p>
                      <p className="text-sm text-muted-foreground">Consultas</p>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                      <p className="text-2xl font-bold">{allMedications.length}</p>
                      <p className="text-sm text-muted-foreground">Medicamentos</p>
                  </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Dog /> Atividades por Pet</CardTitle>
              </CardHeader>
              <CardContent className="pl-2">
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={activityData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar dataKey="vaccines" name="Vacinas" fill="var(--color-vaccines)" radius={4} />
                    <Bar dataKey="consultations" name="Consultas" fill="var(--color-consultations)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar /> Próximos Compromissos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingEvents.length > 0 ? (
                    upcomingEvents.map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-md bg-secondary">
                            <div className="flex items-center gap-3">
                                {event.type === 'Consulta' ? <Stethoscope className="h-5 w-5 text-primary"/> : <Syringe className="h-5 w-5 text-primary" />}
                                <div>
                                    <p className="font-semibold text-sm">
                                        {event.type}: {event.type === 'Consulta' ? (event as Consultation).reason : (event as Vaccination).vaccineName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Pet: {event.petName || 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <Badge variant="outline">
                                {new Date(event.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' })}
                            </Badge>
                        </div>
                    ))
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        Nenhum compromisso futuro.
                    </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><CheckCircle /> O que fazer agora?</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                 <Link href="/expenses" className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                    <span className="font-semibold">Adicionar uma despesa</span>
                    <ArrowUpRight className="h-5 w-5" />
                </Link>
                 <Link href="/health" className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                    <span className="font-semibold">Ver o histórico de saúde</span>
                    <ArrowUpRight className="h-5 w-5" />
                </Link>
                 <Link href="/locations" className="flex items-center justify-between p-3 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                    <span className="font-semibold">Salvar um novo local</span>
                     <ArrowUpRight className="h-5 w-5" />
                </Link>
              </CardContent>
            </Card>

          </div>
        </div>

        <DialogContent>
            <AddPetForm onSuccess={() => setIsAddPetDialogOpen(false)} />
        </DialogContent>
      </div>
    </Dialog>
  );
}
