
'use client';

import { useState, useEffect } from 'react';
import { Pet, Exam, Vaccination, Medication, Consultation, SavedLocation } from "@/lib/placeholder-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Syringe, FileText, Pill, Stethoscope, HeartPulse, PlusCircle, Edit, Trash2, MoreVertical, ExternalLink, CalendarPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AddVaccineForm } from '@/components/pets/add-vaccine-form';
import { AddExamForm } from '@/components/pets/add-exam-form';
import { EditExamForm } from '@/components/pets/edit-exam-form';
import { AddMedicationForm } from '@/components/pets/add-medication-form';
import { AddConsultationForm } from '@/components/pets/add-consultation-form';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, where, doc, updateDoc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { EditVaccineForm } from '@/components/pets/edit-vaccine-form';
import { EditMedicationForm } from '@/components/pets/edit-medication-form';
import { EditConsultationForm } from '@/components/pets/edit-consultation-form';
import { deleteFile } from '@/lib/storage';
import { generateIcsContent, downloadIcsFile } from '@/lib/utils';
import { addHours } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

type EnrichedExam = Exam & { petName: string; petId: string };
type EnrichedVaccination = Vaccination & { petName: string; petId: string };
type EnrichedMedication = Medication & { petName: string; petId: string };
type EnrichedConsultation = Consultation & { petName: string; petId: string; address?: string };

type DeletionTarget = 
    | { type: 'exam'; item: EnrichedExam }
    | { type: 'vaccine'; item: EnrichedVaccination }
    | { type: 'medication'; item: EnrichedMedication }
    | { type: 'consultation'; item: EnrichedConsultation };

export default function HealthPage() {
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
    const petsQuery = query(collection(db, "pets"), where("ownerUids", "array-contains", user.uid));
    const locationsQuery = query(collection(db, "locations"), where("ownerUid", "==", user.uid));

    let petsLoaded = false;
    let locationsLoaded = false;

    const checkLoading = () => {
        if (petsLoaded && locationsLoaded) {
            setLoading(false);
        }
    }

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

  const allVaccinations: EnrichedVaccination[] = pets.flatMap(pet => 
    (pet.vaccinations || []).map(v => ({ ...v, petName: pet.name, petId: pet.id }))
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const allExams: EnrichedExam[] = pets.flatMap(pet => 
    (pet.exams || []).map(e => ({ ...e, petName: pet.name, petId: pet.id }))
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const allMedications: EnrichedMedication[] = pets.flatMap(pet => 
    (pet.medications || []).map(m => ({ ...m, petName: pet.name, petId: pet.id }))
  ).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const allConsultations: EnrichedConsultation[] = pets.flatMap(pet => 
    (pet.consultations || []).map(c => {
        const locationDetails = locations.find(l => l.name === c.location);
        return { ...c, petName: pet.name, petId: pet.id, address: locationDetails?.address }
    })
  ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const handleSuccess = () => {
    setIsDialogOpen(false);
    setActiveDialog(null);
    setSelectedItem(null);
  }
  
  const handleDelete = async () => {
    if (!deletionTarget) return;

    const { type, item } = deletionTarget;
    const petRef = doc(db, "pets", item.petId);

    try {
        const petSnap = await getDoc(petRef);
        if (!petSnap.exists()) throw new Error("Pet não encontrado");

        const petData = petSnap.data() as Pet;
        let updatedArray: any[] = [];
        let arrayField: keyof Pet | null = null;
        let filePathToDelete: string | undefined;

        switch(type) {
            case 'vaccine':
                arrayField = 'vaccinations';
                updatedArray = (petData.vaccinations || []).filter(v => v.id !== item.id);
                break;
            case 'exam':
                arrayField = 'exams';
                updatedArray = (petData.exams || []).filter(e => e.id !== item.id);
                filePathToDelete = (item as Exam).resultPath;
                break;
            case 'medication':
                arrayField = 'medications';
                updatedArray = (petData.medications || []).filter(m => m.id !== item.id);
                break;
            case 'consultation':
                arrayField = 'consultations';
                updatedArray = (petData.consultations || []).filter(c => c.id !== item.id);
                filePathToDelete = (item as Consultation).attachmentPath;
                break;
        }

        if (arrayField) {
            await updateDoc(petRef, { [arrayField]: updatedArray });
        }

        if (filePathToDelete) {
            await deleteFile(filePathToDelete);
        }

        toast({ title: "Sucesso!", description: `Registro de ${type} excluído.` });
    } catch (error) {
        console.error(`Erro ao excluir ${type}:`, error);
        toast({ variant: "destructive", title: "Erro", description: `Não foi possível excluir o registro de ${type}.`});
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
  };

  const handleAddToCalendar = (item: EnrichedConsultation) => {
    const eventDate = new Date(item.date);
    const event = {
        uid: `${item.id}-${item.petId}`,
        title: `Consulta: ${item.reason} para ${item.petName}`,
        description: `Consulta com Dr(a) ${item.vetName}.\nMotivo: ${item.reason}\n${item.notes ? `Observações: ${item.notes}` : ''}`,
        startTime: eventDate,
        endTime: addHours(eventDate, 1),
        location: item.address || item.location,
    };
    const icsContent = generateIcsContent(event);
    downloadIcsFile(`Consulta-${item.petName}.ics`, icsContent);
  };

  const renderTableSkeleton = (columns: number) => (
     [...Array(3)].map((_, i) => (
        <TableRow key={i}>
            {[...Array(columns)].map((_, j) => (
                <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
            ))}
        </TableRow>
    ))
  );

  return (
    <AlertDialog onOpenChange={(isOpen) => !isOpen && setDeletionTarget(null)}>
    <Dialog open={isDialogOpen} onOpenChange={(isOpen) => !isOpen && handleSuccess()}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
              <HeartPulse className="h-8 w-8 text-primary"/>
              Visão Geral de Saúde
            </h1>
            <p className="text-muted-foreground">Acompanhe todos os eventos de saúde dos seus pets em um só lugar.</p>
          </div>
        </div>
        
        <Tabs defaultValue="consultations">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
              <TabsTrigger value="consultations">Consultas</TabsTrigger>
              <TabsTrigger value="vaccinations">Vacinas</TabsTrigger>
              <TabsTrigger value="exams">Exames</TabsTrigger>
              <TabsTrigger value="medications">Medicamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="consultations" className="mt-6">
            <Card>
               <CardHeader>
                   <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Consultas</CardTitle>
                            <CardDescription>Histórico de consultas veterinárias para todos os pets.</CardDescription>
                        </div>
                        <Button variant="outline" onClick={() => openDialog('consultation')}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Consulta</Button>
                    </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Anexo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? renderTableSkeleton(6) :
                    allConsultations.length > 0 ? allConsultations.map((c) => (
                      <TableRow key={`${c.id}-${c.petId}`}>
                        <TableCell><Button variant="link" onClick={() => navigateToPetProfile(c.petId)} className="p-0 h-auto">{c.petName}</Button></TableCell>
                        <TableCell>{new Date(c.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                        <TableCell>{c.reason}</TableCell>
                        <TableCell>
                          {c.address ? (
                            <Button variant="link" onClick={() => openMaps(c.address!)} className="p-0 h-auto flex items-center gap-1">
                                {c.location}
                                <ExternalLink className="h-3 w-3" />
                            </Button>
                            ) : (
                                c.location || 'N/A'
                            )}
                        </TableCell>
                        <TableCell>
                          {c.attachmentUrl ? (
                            <Button variant="link" asChild><a href={c.attachmentUrl} target="_blank" rel="noopener noreferrer">Ver Arquivo</a></Button>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="flex justify-end items-center">
                            <Button variant="ghost" size="icon" onClick={() => handleAddToCalendar(c)}>
                                <CalendarPlus className="h-4 w-4" />
                            </Button>
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog('edit-consultation', c)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletionTarget({ type: 'consultation', item: c })}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                           </div>
                        </TableCell>
                      </TableRow>
                    )) : <TableRow><TableCell colSpan={6} className="text-center py-10">Nenhuma consulta encontrada.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vaccinations" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2"><Syringe className="h-5 w-5 text-primary" /> Vacinas</CardTitle>
                    <CardDescription>Registro de todas as vacinas administradas para todos os pets.</CardDescription>
                  </div>
                   <Button variant="outline" onClick={() => openDialog('vaccine')}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Vacina</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet</TableHead>
                      <TableHead>Vacina</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? renderTableSkeleton(4) :
                    allVaccinations.length > 0 ? allVaccinations.map((v) => (
                      <TableRow key={`${v.id}-${v.petId}`}>
                        <TableCell><Button variant="link" onClick={() => navigateToPetProfile(v.petId)} className="p-0 h-auto">{v.petName}</Button></TableCell>
                        <TableCell>{v.vaccineName}</TableCell>
                        <TableCell>{new Date(v.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog('edit-vaccine', v)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletionTarget({ type: 'vaccine', item: v })}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )) : <TableRow><TableCell colSpan={4} className="text-center py-10">Nenhuma vacina encontrada.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams" className="mt-6">
            <Card>
              <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Exames</CardTitle>
                        <CardDescription>Resultados de exames e relatórios para todos os pets.</CardDescription>
                    </div>
                     <Button variant="outline" onClick={() => openDialog('exam')}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Exame</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet</TableHead>
                      <TableHead>Tipo de Exame</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Anexo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? renderTableSkeleton(5) :
                    allExams.length > 0 ? allExams.map((e) => (
                      <TableRow key={`${e.id}-${e.petId}`}>
                        <TableCell><Button variant="link" onClick={() => navigateToPetProfile(e.petId)} className="p-0 h-auto">{e.petName}</Button></TableCell>
                        <TableCell>{e.type}</TableCell>
                        <TableCell>{new Date(e.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                        <TableCell>
                          {e.resultUrl ? (
                            <Button variant="link" asChild><a href={e.resultUrl} target="_blank" rel="noopener noreferrer">Ver Arquivo</a></Button>
                          ) : (
                            <span className="text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog('edit-exam', e)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletionTarget({ type: 'exam', item: e })}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )) : <TableRow><TableCell colSpan={5} className="text-center py-10">Nenhum exame encontrado.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medications" className="mt-6">
            <Card>
              <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="flex items-center gap-2"><Pill className="h-5 w-5 text-primary" /> Medicamentos</CardTitle>
                        <CardDescription>Cronograma de medicamentos para todos os pets.</CardDescription>
                    </div>
                     <Button variant="outline" onClick={() => openDialog('medication')}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Medicamento</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pet</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Dosagem</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? renderTableSkeleton(5) :
                    allMedications.length > 0 ? allMedications.map((m) => (
                      <TableRow key={`${m.id}-${m.petId}`}>
                        <TableCell><Button variant="link" onClick={() => navigateToPetProfile(m.petId)} className="p-0 h-auto">{m.petName}</Button></TableCell>
                        <TableCell>{m.name}</TableCell>
                        <TableCell>{m.dosage}</TableCell>
                        <TableCell>{m.frequency}</TableCell>
                        <TableCell className="text-right">
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog('edit-medication', m)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletionTarget({ type: 'medication', item: m })}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )): <TableRow><TableCell colSpan={5} className="text-center py-10">Nenhum medicamento encontrado.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <DialogContent>
            {activeDialog === 'vaccine' && <AddVaccineForm allPets={pets} onSuccess={handleSuccess} />}
            {activeDialog === 'exam' && <AddExamForm allPets={pets} onSuccess={handleSuccess} />}
            {activeDialog === 'medication' && <AddMedicationForm allPets={pets} onSuccess={handleSuccess} />}
            {activeDialog === 'consultation' && <AddConsultationForm allPets={pets} locations={locations} onSuccess={handleSuccess} />}
            
            {activeDialog === 'edit-exam' && selectedItem && <EditExamForm pet={pets.find(p=>p.id === selectedItem.petId)!} exam={selectedItem} onSuccess={handleSuccess} />}
            {activeDialog === 'edit-vaccine' && selectedItem && <EditVaccineForm pet={pets.find(p=>p.id === selectedItem.petId)!} vaccine={selectedItem} onSuccess={handleSuccess} />}
            {activeDialog === 'edit-medication' && selectedItem && <EditMedicationForm pet={pets.find(p => p.id === selectedItem.petId)!} medication={selectedItem} onSuccess={handleSuccess} />}
            {activeDialog === 'edit-consultation' && selectedItem && <EditConsultationForm pet={pets.find(p => p.id === selectedItem.petId)!} consultation={selectedItem} locations={locations} onSuccess={handleSuccess} />}
        </DialogContent>
      </div>
    </Dialog>
    <AlertDialogContent>
        <AlertDialogHeader>
        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
        <AlertDialogDescription>
            Esta ação não pode ser desfeita. Isso irá excluir permanentemente o registro.
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
