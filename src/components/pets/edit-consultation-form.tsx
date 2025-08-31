
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Input } from '../ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Pet, Consultation, SavedLocation } from '../../lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db, auth } from '../../lib/firebase';
import { doc, updateDoc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { uploadFile, deleteFile } from '../../lib/storage';
import { ScrollArea } from '../ui/scroll-area';

const consultationFormSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  time: z.string({ required_error: 'O horário é obrigatório.' }),
  vetName: z.string().min(2, { message: 'O nome do veterinário é obrigatório.' }),
  location: z.string().optional(),
  reason: z.string().min(3, { message: 'O motivo é obrigatório.' }),
  cost: z.coerce.number().optional(),
  notes: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  attachment: z.instanceof(File).optional(),
});

type ConsultationFormValues = z.infer<typeof consultationFormSchema>;

interface EditConsultationFormProps {
  pet: Pet;
  consultation: Consultation;
  locations?: SavedLocation[];
  onSuccess?: () => void;
}

export function EditConsultationForm({ pet, consultation, locations = [], onSuccess }: EditConsultationFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const initialDate = new Date(consultation.date);
  
  const form = useForm<ConsultationFormValues>({
    resolver: zodResolver(consultationFormSchema),
    defaultValues: {
      date: initialDate.toISOString().split('T')[0],
      time: initialDate.toTimeString().slice(0,5),
      vetName: consultation.vetName || '',
      location: consultation.location || '',
      reason: consultation.reason || '',
      cost: consultation.cost ?? undefined,
      notes: consultation.notes || '',
      diagnosis: consultation.diagnosis || '',
      treatment: consultation.treatment || '',
      attachment: undefined,
    },
  });

  async function onSubmit(values: ConsultationFormValues) {
    if (!user || !pet || !consultation) {
        toast({ variant: "destructive", title: "Erro", description: "Dados insuficientes para atualizar." });
        return;
    }
    setIsSubmitting(true);
    try {
        const petRef = doc(db, "pets", pet.id);
        
        let attachmentUrl = consultation.attachmentUrl;
        let attachmentPath = consultation.attachmentPath;

        if (values.attachment) {
            const path = `pets/${pet.id}/consultations/${Date.now()}_${values.attachment.name}`;
            const { downloadURL, filePath: newFilePath } = await uploadFile(values.attachment, path);
            
            if (consultation.attachmentPath) {
                await deleteFile(consultation.attachmentPath);
            }

            attachmentUrl = downloadURL;
            attachmentPath = newFilePath;
        }

        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) throw new Error("Pet não encontrado.");

        const petData = petSnap.data() as Pet;
        const consultationIndex = petData.consultations.findIndex(c => c.id === consultation.id);
        
        if (consultationIndex === -1) throw new Error("Consulta não encontrada.");

        const updatedConsultations = [...petData.consultations];
        updatedConsultations[consultationIndex] = {
            ...updatedConsultations[consultationIndex],
            vetName: values.vetName,
            reason: values.reason,
            location: values.location,
            date: new Date(`${values.date}T${values.time}`).toISOString(),
            notes: values.notes || '',
            diagnosis: values.diagnosis || '',
            treatment: values.treatment || '',
            cost: values.cost || 0,
            attachmentUrl,
            attachmentPath,
        };
        
        await updateDoc(petRef, {
            consultations: updatedConsultations
        });
        
        // Expense logic can be added here if needed, for now focusing on attachment
        // For example, if cost changes, find and update or create expense record.
        // This is complex and better handled separately if not the primary goal.

        toast({ title: "Sucesso!", description: "Consulta atualizada." });
        onSuccess?.();
    } catch (error) {
        console.error("Error updating consultation:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar a consulta." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Consulta de {pet.name}</DialogTitle>
        <DialogDescription>
          Atualize as informações da consulta abaixo.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ScrollArea className="h-[500px] w-full p-4">
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Horário</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="vetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinário</FormLabel>
                      <FormControl>
                        <Input placeholder="Dr. João Silva" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                 <FormField
                  control={form.control}
                  name="reason"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Motivo</FormLabel>
                      <FormControl>
                        <Input placeholder="Consulta de rotina" {...field} />
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
                      <FormLabel>Custo (Opcional)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                    render={({ field: { onChange, value, ...rest }}) => (
                        <FormItem>
                            <FormLabel>Substituir Anexo (Opcional)</FormLabel>
                            <FormControl>
                                <Input 
                                    type="file" 
                                    accept="image/*,application/pdf"
                                    onChange={(e) => onChange(e.target.files?.[0])} 
                                    {...rest} 
                                    disabled={isSubmitting}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                {consultation.attachmentUrl && (
                    <div className="text-sm">
                        <span className="font-medium">Anexo atual: </span>
                        <a href={consultation.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                            Ver anexo
                        </a>
                    </div>
                )}
            </div>
          </ScrollArea>
          <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar Alterações"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
