
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { auth, db } from '@/lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { uploadFile } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

const petFormSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  photo: z.instanceof(File).optional(),
  species: z.enum(['Dog', 'Cat'], { required_error: 'Selecione a espécie.' }),
  breed: z.string().optional(),
  birthDate: z.string().optional(),
  isBirthDateApproximate: z.boolean().default(false),
  weight: z.coerce.number().min(0, { message: 'O peso não pode ser negativo.' }).optional(),
  microchip: z.string().optional(),
  healthPlan: z.string().optional(),
  isSpayed: z.boolean().default(false),
});

type PetFormValues = z.infer<typeof petFormSchema>;

export function AddPetForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const form = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: '',
      photo: undefined,
      species: undefined,
      breed: '',
      birthDate: '',
      isBirthDateApproximate: false,
      weight: undefined,
      microchip: '',
      healthPlan: '',
      isSpayed: false,
    },
  });

  async function onSubmit(values: PetFormValues) {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Acesso Negado",
        description: "Você precisa estar logado para adicionar um pet.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const petDocRef = doc(collection(db, "pets"));
      const petId = petDocRef.id;
      
      let photoUrl: string | null = null;
      let photoPath: string | null = null;

      if (values.photo) {
        const filePath = `pets/${petId}/profile/${Date.now()}_${values.photo.name}`;
        const result = await uploadFile(values.photo, filePath);
        photoUrl = result.downloadURL;
        photoPath = result.filePath;
      }
      
      const petData: { [key: string]: any } = {
        id: petId,
        ownerUids: [user.uid],
        createdAt: new Date().toISOString(),
        name: values.name,
        species: values.species,
        photoUrl: photoUrl,
        photoPath: photoPath,
        breed: values.breed || null,
        birthDate: values.birthDate || null,
        isBirthDateApproximate: values.isBirthDateApproximate,
        weight: values.weight ?? null,
        microchip: values.microchip || null,
        healthPlan: values.healthPlan || null,
        isSpayed: values.isSpayed,
        shareId: uuidv4(),
        medications: [],
        consultations: [],
        vaccinations: [],
        exams: [],
        groomings: [],
        weightHistory: [],
      };
      
      if (values.birthDate) {
        const birthDate = new Date(values.birthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        petData.age = age;
      } else {
        petData.age = null;
      }
      
      await setDoc(petDocRef, petData);

      toast({
        title: "Sucesso!",
        description: `${values.name} foi adicionado(a) com sucesso.`,
      });
      form.reset();
      onSuccess?.();
    } catch (e: any) {
      console.error("Error adding document: ", e);
      toast({
        variant: "destructive",
        title: "Erro",
        description: e.message || "Ocorreu um erro ao adicionar o pet. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Adicionar Novo Pet</DialogTitle>
        <DialogDescription>
          Preencha as informações abaixo para adicionar um novo membro à sua família.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Pet</FormLabel>
                <FormControl>
                  <Input placeholder="Buddy" {...field} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
              control={form.control}
              name="photo"
              render={({ field: { onChange, value, ...rest }}) => (
                <FormItem>
                    <FormLabel>Foto do Pet (Opcional)</FormLabel>
                    <FormControl>
                        <Input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => onChange(e.target.files?.[0])} 
                            {...rest} 
                            disabled={isSubmitting}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
            )}
           />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="species"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Espécie</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a espécie" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Dog">Cachorro</SelectItem>
                      <SelectItem value="Cat">Gato</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="breed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Raça (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Golden Retriever" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="birthDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Nascimento</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weight"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Peso (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" placeholder="15.2" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
           <FormField
            control={form.control}
            name="isBirthDateApproximate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Esta data de nascimento é aproximada?
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="microchip"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID do Microchip (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="987654321098765" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="healthPlan"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Plano de Saúde (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="PetLove Essencial" {...field} value={field.value ?? ''} disabled={isSubmitting}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="isSpayed"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                <div className="space-y-0.5">
                  <FormLabel>Castrado(a)?</FormLabel>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <DialogFooter>
             <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Pet'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
