
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Pet, Exam } from '../../lib/placeholder-data';
import { useState } from 'react';
import { useToast } from '../../hooks/use-toast';
import { db, auth } from '../../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Textarea } from '../ui/textarea';
import { uploadFile, deleteFile } from '../../lib/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const editExamFormSchema = z.object({
  type: z.string().min(2, { message: 'O tipo de exame é obrigatório.' }),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida."}),
  cost: z.coerce.number().optional(),
  results: z.string().optional(),
  resultFile: z.instanceof(File).optional(),
  consultationId: z.string().optional(),
});

type EditExamFormValues = z.infer<typeof editExamFormSchema>;

interface EditExamFormProps {
  pet: Pet;
  exam: Exam & { id: string };
  onSuccess?: () => void;
}

export function EditExamForm({ pet, exam, onSuccess }: EditExamFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;
  
  const form = useForm<EditExamFormValues>({
    resolver: zodResolver(editExamFormSchema),
    defaultValues: {
      type: exam.type || '',
      date: exam.date ? new Date(exam.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      cost: exam.cost ?? undefined,
      results: exam.results || '',
      resultFile: undefined,
      consultationId: exam.consultationId || 'none',
    },
  });

  async function onSubmit(values: EditExamFormValues) {
    if (!user || !pet || !exam) {
        toast({ variant: "destructive", title: "Erro", description: "Dados insuficientes para atualizar o exame." });
        return;
    }
    setIsSubmitting(true);
    
    try {
        const petRef = doc(db, "pets", pet.id);
        
        let fileUrl = exam.resultUrl;
        let filePath = exam.resultPath;

        if (values.resultFile) {
            const path = `pets/${pet.id}/exams/${Date.now()}_${values.resultFile.name}`;
            const { downloadURL, filePath: newFilePath } = await uploadFile(values.resultFile, path);
            
            if (exam.resultPath) {
                await deleteFile(exam.resultPath);
            }

            fileUrl = downloadURL;
            filePath = newFilePath;
        }

        const petSnap = await getDoc(petRef);
        if (!petSnap.exists()) {
          throw new Error("Pet não encontrado.");
        }

        const petData = petSnap.data() as Pet;
        const exams = petData.exams || [];
        const examIndex = exams.findIndex(e => e.id === exam.id);

        if (examIndex === -1) {
            throw new Error("Exame não encontrado no perfil do pet.");
        }
        
        const updatedExams = [...exams];
        updatedExams[examIndex] = {
            ...updatedExams[examIndex],
            type: values.type,
            date: values.date,
            results: values.results || '',
            cost: values.cost || 0,
            resultUrl: fileUrl,
            resultPath: filePath,
            consultationId: values.consultationId === 'none' ? undefined : values.consultationId,
        };
        
        await updateDoc(petRef, {
            exams: updatedExams
        });
        
        toast({ title: "Sucesso!", description: "Exame atualizado." });
        onSuccess?.();
    } catch (error: any) {
        console.error("Error updating exam:", error);
        toast({ variant: "destructive", title: "Erro", description: error.message || "Não foi possível atualizar o exame." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Exame de {pet.name}</DialogTitle>
        <DialogDescription>
          Atualize os detalhes e os resultados do exame.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma consulta"/>
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {pet.consultations?.length > 0 ? (
                      pet.consultations
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
                    <FormLabel>Substituir Arquivo do Resultado (Opcional)</FormLabel>
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
           {exam.resultUrl && (
             <div className="text-sm">
                <span className="font-medium">Arquivo atual: </span>
                <a href={exam.resultUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline">
                    Ver anexo
                </a>
             </div>
           )}
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
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvando..." : "Salvar Alterações"}</Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
