
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Pet, Exam } from '../../lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { Textarea } from '../ui/textarea';
import { uploadFile } from '../../lib/storage';

const examFormSchema = z.object({
  petId: z.string({ required_error: 'Selecione um pet.'}),
  type: z.string().min(2, { message: 'O tipo de exame é obrigatório.' }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  cost: z.coerce.number().optional(),
  results: z.string().optional(),
  resultFile: z.instanceof(File).optional(),
  consultationId: z.string().optional(),
});

type ExamFormValues = z.infer<typeof examFormSchema>;

interface AddExamFormProps {
  petId?: string;
  allPets?: Pet[];
  onSuccess?: () => void;
}

export function AddExamForm({ petId, allPets = [], onSuccess }: AddExamFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;
  
  const defaultPetId = petId || (allPets.length > 0 ? allPets[0].id : '');
  const [selectedPetId, setSelectedPetId] = useState(defaultPetId);

  const form = useForm<ExamFormValues>({
    resolver: zodResolver(examFormSchema),
    defaultValues: {
      petId: defaultPetId,
      type: '',
      date: new Date().toISOString().split('T')[0],
      cost: undefined,
      results: '',
      resultFile: undefined,
      consultationId: '',
    },
  });

  const selectedPet = allPets.find(p => p.id === selectedPetId);

  async function onSubmit(values: ExamFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
        return;
    }
     if (!values.petId) {
        toast({ variant: "destructive", title: "Erro", description: "Por favor, selecione um pet." });
        return;
    }
    setIsSubmitting(true);
    try {
        let fileUrl: string | undefined = undefined;
        let filePath: string | undefined = undefined;

        if (values.resultFile) {
            const path = `pets/${values.petId}/exams/${Date.now()}_${values.resultFile.name}`;
            const { downloadURL, filePath: uploadedFilePath } = await uploadFile(values.resultFile, path);
            fileUrl = downloadURL;
            filePath = uploadedFilePath;
        }
        
        const petRef = doc(db, "pets", values.petId);
        const petSnap = await getDoc(petRef);

        if (!petSnap.exists()) {
          throw new Error("Pet não encontrado.");
        }
        
        const petData = petSnap.data() as Pet;

        const newExam: Exam = {
          id: uuidv4(),
          type: values.type,
          date: values.date,
          results: values.results || '',
          resultUrl: fileUrl,
          resultPath: filePath,
          consultationId: values.consultationId === 'none' ? undefined : values.consultationId,
        };
        
        const updatedExams = [...(petData.exams || []), newExam];

        await updateDoc(petRef, {
            exams: updatedExams
        });

        // Se houver custo, adiciona como uma despesa
        if (values.cost && values.cost > 0) {
            await addDoc(collection(db, "expenses"), {
                ownerUid: user.uid,
                petId: values.petId,
                date: values.date,
                category: 'Saúde',
                description: `Exame: ${values.type}`,
                amount: values.cost,
                createdAt: serverTimestamp(),
            });
        }

        toast({ title: "Sucesso!", description: "Exame adicionado." });
        onSuccess?.();
    } catch (error) {
        console.error("Error adding exam:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar o exame." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Exame</DialogTitle>
        <DialogDescription>
          Preencha os detalhes do exame abaixo. Se houver custo, ele será adicionado às despesas.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="petId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pet</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedPetId(value);
                    }} 
                    defaultValue={field.value} 
                    disabled={!!petId || isSubmitting}
                  >
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
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de Exame</FormLabel>
                <FormControl>
                  <Input placeholder="Exame de Sangue" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data do Exame</FormLabel>
                <FormControl>
                  <Input type="date" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="consultationId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vincular à Consulta (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting || !selectedPetId}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma consulta"/>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {selectedPet && selectedPet.consultations?.length > 0 ? (
                      selectedPet.consultations
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(c => (
                          <SelectItem key={c.id} value={c.id}>
                            {new Date(c.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} - {c.reason}
                          </SelectItem>
                        ))
                    ) : (
                      <SelectItem value="-" disabled>Nenhuma consulta encontrada para este pet</SelectItem>
                    )}
                  </SelectContent>
                </Select>
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
                  <Input type="number" step="0.01" placeholder="R$ 0,00" {...field} disabled={isSubmitting} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
            <FormField
              control={form.control}
              name="resultFile"
              render={({ field: { onChange, value, ...rest }}) => (
                <FormItem>
                    <FormLabel>Arquivo do Resultado (Opcional)</FormLabel>
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
           <FormField
            control={form.control}
            name="results"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Anotações sobre o Resultado (Opcional)</FormLabel>
                    <FormControl>
                       <Textarea placeholder="Digite observações ou o resumo dos resultados aqui..." {...field} value={field.value ?? ''} disabled={isSubmitting} />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
           />
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Adicionar Exame"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
