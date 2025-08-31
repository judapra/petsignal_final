
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Input } from '../ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pet, SavedLocation } from '../../lib/placeholder-data';
import { Clock, Paperclip, PlusCircle, Search, Send } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import Link from 'next/link';
import { uploadFile } from '../../lib/storage';

const consultationFormSchema = z.object({
  petId: z.string({ required_error: 'Selecione um pet.'}),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  time: z.string({ required_error: 'O horário é obrigatório.' }),
  vetName: z.string().min(2, { message: 'O nome do veterinário é obrigatório.' }),
  location: z.string().optional(),
  reason: z.string().min(3, { message: 'O motivo é obrigatório.' }),
  cost: z.coerce.number().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
  attachment: z.instanceof(File).optional(),
});

type ConsultationFormValues = z.infer<typeof consultationFormSchema>;

interface AddConsultationFormProps {
  petId?: string;
  allPets?: Pet[];
  locations?: SavedLocation[];
  onSuccess?: () => void;
}

export function AddConsultationForm({ petId, allPets = [], locations = [], onSuccess }: AddConsultationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const defaultPetId = petId || (allPets.length > 0 ? allPets[0].id : '');

  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      petId: defaultPetId,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0,5),
      vetName: '',
      reason: '',
      notes: '',
      diagnosis: '',
      treatment: '',
      location: '',
      cost: undefined,
      attachment: undefined,
    },
  });

  async function onSubmit(values: ConsultationFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const petRef = doc(db, "pets", values.petId);
        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) {
          throw new Error("Pet não encontrado.");
        }

        const petData = petSnap.data() as Pet;

        let attachmentUrl: string | undefined = undefined;
        let attachmentPath: string | undefined = undefined;

        if (values.attachment) {
            const path = `pets/${values.petId}/consultations/${Date.now()}_${values.attachment.name}`;
            const { downloadURL, filePath } = await uploadFile(values.attachment, path);
            attachmentUrl = downloadURL;
            attachmentPath = filePath;
        }

        const newConsultation: {[key: string]: any} = {
            id: uuidv4(),
            vetName: values.vetName,
            reason: values.reason,
            date: new Date(`${values.date}T${values.time}`).toISOString(),
            attachmentUrl,
            attachmentPath
        };

        if (values.location) newConsultation.location = values.location;
        if (values.diagnosis) newConsultation.diagnosis = values.diagnosis;
        if (values.treatment) newConsultation.treatment = values.treatment;
        if (values.notes) newConsultation.notes = values.notes;
        
        const updatedConsultations = [...(petData.consultations || []), newConsultation];
        
        await updateDoc(petRef, {
            consultations: updatedConsultations
        });
        
        if (values.cost && values.cost > 0) {
            await addDoc(collection(db, "expenses"), {
                ownerUid: user.uid,
                petId: values.petId,
                date: values.date,
                category: 'Saúde',
                description: `Consulta: ${values.reason}`,
                amount: values.cost,
                createdAt: serverTimestamp(),
            });
        }


        toast({ title: "Sucesso!", description: "Consulta adicionada." });
        onSuccess?.();
    } catch (error) {
        console.error("Error adding consultation:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar a consulta." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Informações da Consulta</DialogTitle>
        <DialogDescription>
          Preencha os dados da consulta abaixo. Se houver custo, ele será adicionado às despesas.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ScrollArea className="h-[500px] w-full p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="petId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pet *</FormLabel>
                       <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!petId}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um pet" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {allPets.map(pet => (
                            <SelectItem key={pet.id} value={pet.id}>{pet.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Consulta *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário da Consulta *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="time" className="pl-10" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinário *</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local da Consulta</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione um local salvo" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            {locations.length > 0 ? locations.map(loc => (
                                <SelectItem key={loc.id} value={loc.name}>{loc.name}</SelectItem>
                            )) : <SelectItem value="-" disabled>Nenhum local cadastrado</SelectItem>}
                        </SelectContent>
                    </Select>
                    <FormDescription className='flex items-center gap-1'>
                        Não encontrou o local? 
                        <Button variant="link" className="p-0 h-auto" asChild>
                           <Link href="/locations">
                                <PlusCircle className="mr-1 h-3 w-3" /> Adicionar novo local
                           </Link>
                        </Button>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo da Consulta *</FormLabel>
                      <FormControl>
                        <Input placeholder="Consulta de rotina, vacina, etc." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="R$ 0,00 (opcional)" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnóstico</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Diagnóstico feito pelo veterinário (opcional)" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="treatment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tratamento</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tratamento recomendado (opcional)" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
               <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais (opcional)" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attachment"
                render={({ field: { onChange, value, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Anexo (Opcional)</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => onChange(e.target.files?.[0])}
                        {...rest}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <FormDescription>
                      Anexe uma receita, pedido de exame ou outro documento.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar Consulta"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
