
'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from "next/image";
import { notFound, useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, deleteDoc, writeBatch, collection, onSnapshot, query, where } from "firebase/firestore";
import { db, storage, auth } from "@/lib/firebase";
import { ref, deleteObject } from "firebase/storage";
import type { Pet, Exam, Vaccination, Medication, Consultation, WeightEntry, SavedLocation } from "@/lib/placeholder-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dog, Cat, Syringe, FileText, Stethoscope, Pill, Edit, PlusCircle, MoreVertical, HeartCrack, Trash2, ExternalLink, Download, Share2, ClipboardCopy, Check } from "lucide-react";
import WeightTracker from "@/components/pets/weight-tracker";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AddVaccineForm } from '@/components/pets/add-vaccine-form';
import { AddExamForm } from '@/components/pets/add-exam-form';
import { AddMedicationForm } from '@/components/pets/add-medication-form';
import { AddConsultationForm } from '@/components/pets/add-consultation-form';
import { EditPetForm } from '@/components/pets/edit-pet-form';
import { EditExamForm } from '@/components/pets/edit-exam-form';
import { EditVaccineForm } from '@/components/pets/edit-vaccine-form';
import { EditMedicationForm } from '@/components/pets/edit-medication-form';
import { EditConsultationForm } from '@/components/pets/edit-consultation-form';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged, User } from 'firebase/auth';
import { deleteFile } from '@/lib/storage';
import { exportPetProfileAsPdf } from '@/lib/pdf-export';
import { v4 as uuidv4 } from 'uuid';
import { Input } from '@/components/ui/input';
import { DialogHeader } from '@/components/ui/dialog';

type DeletionTarget =
    | { type: 'exam'; item: Exam }
    | { type: 'vaccine'; item: Vaccination }
    | { type: 'medication'; item: Medication }
    | { type: 'consultation'; item: Consultation }
    | { type: 'pet' }
    | { type: 'deceased' };


export default function PetProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const petId = params.petId as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [locations, setLocations] = useState<SavedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculatedAge, setCalculatedAge] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [deletionTarget, setDeletionTarget] = useState<DeletionTarget | null>(null);
  const [shareLink, setShareLink] = useState('');
  const [isCopied, setIsCopied] = useState(false);

   useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

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

  const fetchPet = useCallback(() => {
    if (!petId || !user) return;

    setLoading(true);

    const docRef = doc(db, "pets", petId);
    const petUnsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const petData = { id: docSnap.id, ...docSnap.data() } as Pet

        if (!petData.ownerUids.includes(user.uid)) {
            toast({ variant: "destructive", title: "Acesso Negado", description: "Você não tem permissão para ver este pet." });
            router.push('/dashboard');
            return;
        }

        setPet(petData);
        if (petData.birthDate) {
          setCalculatedAge(calculateAge(petData.birthDate));
        } else {
          setCalculatedAge(null);
        }
      } else {
        notFound();
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching pet:", error);
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os dados do pet." });
      setLoading(false);
      notFound();
    });

    const locationsQuery = query(collection(db, "locations"), where("ownerUid", "==", user.uid));
    const locUnsubscribe = onSnapshot(locationsQuery, (snapshot) => {
        const locationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SavedLocation));
        setLocations(locationsData);
    });

    return () => {
        petUnsubscribe();
        locUnsubscribe();
    };
  }, [petId, user, router, toast]);

  useEffect(() => {
    const unsubscribe = fetchPet();
    return () => unsubscribe?.();
  }, [fetchPet]);

  const handleUpdateSuccess = () => {
    setIsDialogOpen(false);
    setActiveDialog(null);
    setSelectedItem(null);
  };

  const handleMarkAsDeceased = async () => {
    if (!pet) return;
    try {
      const petRef = doc(db, "pets", pet.id);
      await updateDoc(petRef, { isDeceased: true });
      toast({ title: "Pet atualizado", description: `${pet.name} foi marcado(a) como falecido(a).` });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o pet." });
    } finally {
      setDeletionTarget(null);
    }
  };

  const handleShare = async () => {
    if (!pet) return;
    try {
        let shareId = pet.shareId;
        if (!shareId) {
            shareId = uuidv4();
            const petRef = doc(db, "pets", pet.id);
            await updateDoc(petRef, { shareId });
        }
        const link = `${window.location.origin}/share/pet/${shareId}`;
        setShareLink(link);
        setActiveDialog('share');
        setIsDialogOpen(true);
    } catch (error) {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível gerar o link de compartilhamento." });
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }

  const handleDeletePet = async () => {
    if (!pet) return;
    try {
      if (pet.photoUrl) {
         try {
           const photoRef = ref(storage, pet.photoUrl);
           await deleteObject(photoRef);
         } catch (storageError: any) {
            if(storageError.code !== 'storage/object-not-found') {
              throw storageError;
            }
         }
      }
      // TODO: Excluir despesas e arquivos de exames associados
      await deleteDoc(doc(db, "pets", pet.id));
      toast({ title: "Pet excluído", description: `O perfil de ${pet.name} foi removido.` });
      router.push('/dashboard');
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o pet." });
    } finally {
      setDeletionTarget(null);
    }
  };

  const handleDeleteHealthRecord = async (target: DeletionTarget | null) => {
    if (!pet || !target || target.type === 'pet' || target.type === 'deceased') return;

    const { type, item } = target;
    const petRef = doc(db, "pets", pet.id);

    try {
        const petSnap = await getDoc(petRef);
        if (!petSnap.exists()) throw new Error("Pet não encontrado");

        const petData = petSnap.data() as Pet;
        let updatedArray: any[] = [];
        let arrayField: keyof Pet | null = null;
        let filePathToDelete: string | undefined;

        switch(type) {
            case 'exam':
                arrayField = 'exams';
                filePathToDelete = (item as Exam).resultPath;
                break;
            case 'vaccine':
                arrayField = 'vaccinations';
                break;
            case 'medication':
                arrayField = 'medications';
                break;
            case 'consultation':
                arrayField = 'consultations';
                filePathToDelete = (item as Consultation).attachmentPath;
                break;
        }

        if (arrayField) {
            const currentArray = (petData[arrayField] as any[]) || [];
            updatedArray = currentArray.filter(i => i.id !== item.id);
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

  const openMaps = (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="space-y-6">
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
    return null;
  }

  const getDeletionDialogContent = () => {
    if (!deletionTarget) return { title: '', description: '' };
    switch (deletionTarget.type) {
        case 'pet': return { title: `Excluir o perfil de ${pet.name}?`, description: 'Esta ação não pode ser desfeita. Todos os dados serão perdidos.' };
        case 'deceased': return { title: `Marcar ${pet.name} como falecido(a)?`, description: 'O perfil ficará arquivado e não poderá ser editado.' };
        case 'exam': return { title: 'Excluir este exame?', description: 'Esta ação é permanente.' };
        case 'vaccine': return { title: 'Excluir esta vacina?', description: 'Esta ação é permanente.' };
        case 'medication': return { title: 'Excluir este medicamento?', description: 'Esta ação é permanente.' };
        case 'consultation': return { title: 'Excluir esta consulta?', description: 'Esta ação é permanente.' };
        default: return { title: '', description: '' };
    }
  };

  const { title: deletionTitle, description: deletionDescription } = getDeletionDialogContent();

  return (
    <AlertDialog onOpenChange={(isOpen) => {if (!isOpen) setDeletionTarget(null)}}>
    <Dialog open={isDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) handleUpdateSuccess()}}>
      <div className="space-y-6">
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
            <div className="flex items-start justify-between">
              <div className='flex-grow'>
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
              <div className="flex items-center gap-2">
                 <Button variant="outline" onClick={() => openDialog('edit-pet', pet)}>
                    <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                </Button>

                 <Button variant="outline" onClick={() => exportPetProfileAsPdf(pet)}>
                  <Download className="mr-2 h-4 w-4" /> Exportar PDF
                </Button>

                <Button variant="outline" onClick={handleShare}>
                    <Share2 className="mr-2 h-4 w-4" /> Compartilhar
                </Button>

                   <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                         <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-orange-600 focus:text-orange-600" onClick={() => setDeletionTarget({ type: 'deceased'})}>
                                <HeartCrack className="mr-2 h-4 w-4" />
                                Marcar como Falecido
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogTrigger asChild>
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletionTarget({ type: 'pet'})}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                Excluir Pet
                            </DropdownMenuItem>
                        </AlertDialogTrigger>
                      </DropdownMenuContent>
                    </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="consultations">Consultas</TabsTrigger>
            <TabsTrigger value="vaccinations">Vacinas</TabsTrigger>
            <TabsTrigger value="exams">Exames</TabsTrigger>
            <TabsTrigger value="medications">Medicamentos</TabsTrigger>
            <TabsTrigger value="weight">Peso</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
              <Card>
                  <CardHeader>
                      <CardTitle>Detalhes do Pet</CardTitle>
                      <CardDescription>Informações gerais sobre {pet.name}.</CardDescription>
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
                          <span className="font-medium text-muted-foreground">Plano de Saúde</span>
                          <span>{pet.healthPlan || 'N/A'}</span>
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
                  <div className="flex justify-between items-center">
                      <div>
                          <CardTitle className="flex items-center gap-2"><Stethoscope className="h-5 w-5 text-primary" /> Consultas</CardTitle>
                          <CardDescription>Histórico de consultas veterinárias.</CardDescription>
                      </div>
                      <Button variant="outline" onClick={() => openDialog('consultation')}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Consulta</Button>
                  </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Anexo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pet.consultations?.length > 0 ? pet.consultations.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((c) => {
                      const location = locations.find(l => l.name === c.location)
                      return (
                      <TableRow key={c.id}>
                        <TableCell>{new Date(c.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
                        <TableCell>{c.reason}</TableCell>
                        <TableCell>
                          {location?.address ? (
                            <Button variant="link" onClick={() => openMaps(location.address)} className="p-0 h-auto flex items-center gap-1">
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
                           <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => openDialog('edit-consultation', c)}><Edit className="mr-2 h-4 w-4" /> Editar</DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeletionTarget({ type: 'consultation', item: c })}><Trash2 className="mr-2 h-4 w-4" /> Excluir</DropdownMenuItem>
                                    </AlertDialogTrigger>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                      </TableRow>
                      )
                    }): <TableRow><TableCell colSpan={5} className="text-center py-10">Nenhuma consulta registrada.</TableCell></TableRow>}
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
                    <CardDescription>Registro de todas as vacinas administradas.</CardDescription>
                  </div>
                    <Button variant="outline" onClick={() => openDialog('vaccine')}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Vacina</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vacina</TableHead>
                      <TableHead>Veterinário</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pet.vaccinations?.length > 0 ? pet.vaccinations.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>{v.vaccineName}</TableCell>
                        <TableCell>{v.vetName}</TableCell>
                        <TableCell>{new Date(v.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
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
                    )) : <TableRow><TableCell colSpan={4} className="text-center py-10">Nenhuma vacina registrada.</TableCell></TableRow>}
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
                      <CardDescription>Resultados de exames e relatórios.</CardDescription>
                    </div>
                       <Button variant="outline" onClick={() => openDialog('exam')}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Exame</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Exame</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Anexo</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pet.exams?.length > 0 ? pet.exams.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>{e.type}</TableCell>
                        <TableCell>{new Date(e.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</TableCell>
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
                    )) : <TableRow><TableCell colSpan={4} className="text-center py-10">Nenhum exame registrado.</TableCell></TableRow>}
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
                          <CardDescription>Cronograma de medicamentos atuais e passados.</CardDescription>
                      </div>
                      <Button variant="outline" onClick={() => openDialog('medication')}><PlusCircle className="mr-2 h-4 w-4" /> Adicionar Medicamento</Button>
                  </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Dosagem</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pet.medications?.length > 0 ? pet.medications.map((m) => (
                      <TableRow key={m.id}>
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
                    )) : <TableRow><TableCell colSpan={4} className="text-center py-10">Nenhum medicamento registrado.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weight" className="mt-6">
            {pet.weightHistory && <WeightTracker pet={pet} />}
          </TabsContent>

        </Tabs>

        <DialogContent>
            {activeDialog === 'vaccine' && pet && <AddVaccineForm petId={petId} allPets={[pet]} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'exam' && pet && <AddExamForm petId={petId} allPets={[pet]} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'medication' && pet && <AddMedicationForm petId={petId} allPets={[pet]} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'consultation' && pet && <AddConsultationForm petId={petId} allPets={[pet]} locations={locations} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'edit-pet' && selectedItem && <EditPetForm pet={selectedItem} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'edit-exam' && selectedItem && pet && <EditExamForm pet={pet} exam={selectedItem} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'edit-vaccine' && selectedItem && pet && <EditVaccineForm pet={pet} vaccine={selectedItem} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'edit-medication' && selectedItem && pet && <EditMedicationForm pet={pet} medication={selectedItem} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'edit-consultation' && selectedItem && pet && <EditConsultationForm pet={pet} consultation={selectedItem} locations={locations} onSuccess={handleUpdateSuccess} />}
            {activeDialog === 'share' && (
                 <>
                    <DialogHeader>
                        <DialogTitle>Compartilhar Perfil de {pet.name}</DialogTitle>
                        <DialogDescription>
                            Copie o link abaixo para compartilhar uma versão pública e somente leitura do perfil do seu pet.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center space-x-2">
                        <Input value={shareLink} readOnly />
                        <Button onClick={handleCopyLink}>
                            {isCopied ? <Check className="h-4 w-4" /> : <ClipboardCopy className="h-4 w-4" />}
                        </Button>
                    </div>
                </>
            )}
        </DialogContent>
      </div>
       <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>{deletionTitle}</AlertDialogTitle>
                <AlertDialogDescription>{deletionDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletionTarget(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                    onClick={() => {
                        if (!deletionTarget) return;
                        if (deletionTarget.type === 'pet') handleDeletePet();
                        else if (deletionTarget.type === 'deceased') handleMarkAsDeceased();
                        else handleDeleteHealthRecord(deletionTarget);
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                >
                    Sim, Continuar
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </Dialog>
    </AlertDialog>
  );
}
