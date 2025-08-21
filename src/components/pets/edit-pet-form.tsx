
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Switch } from '../ui/switch';
import { auth, db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useToast } from '../../hooks/use-toast';
import { useState } from 'react';
import { Checkbox } from '../ui/checkbox';
import type { Pet } from '../../lib/placeholder-data';
import { uploadFile, deleteFile } from '../../lib/storage';

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

interface EditPetFormProps {
  pet: Pet;
  onSuccess?: () => void;
}

export function EditPetForm({ pet, onSuccess }: EditPetFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const user = auth.currentUser;

  const form = useForm<PetFormValues>({
    resolver: zodResolver(petFormSchema),
    defaultValues: {
      name: pet.name || '',
      photo: undefined,
      species: pet.species,
      breed: pet.breed || '',
      birthDate: pet.birthDate || '',
      isBirthDateApproximate: pet.isBirthDateApproximate || false,
      weight: pet.weight ?? undefined,
      microchip: pet.microchip || '',
      healthPlan: pet.healthPlan || '',
      isSpayed: pet.isSpayed || false,
    },
  });

  async function onSubmit(values: PetFormValues) {
    if (!pet?.id || !user) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "ID do pet não encontrado ou usuário não autenticado. Não foi possível salvar.",
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      let photoUrl = pet.photoUrl;
      let photoPath = pet.photoPath;

      // 1. Se uma nova foto for enviada, faça o upload
      if (values.photo) {
        const newPhotoPath = `pets/${pet.id}/profile/${Date.now()}_${values.photo.name}`;
        const result = await uploadFile(values.photo, newPhotoPath);
        
        // Excluir a foto antiga somente após o sucesso do novo upload
        if (pet.photoPath) {
          await deleteFile(pet.photoPath);
        }

        photoUrl = result.downloadURL;
        photoPath = result.filePath;
      }
      
      const petRef = doc(db, "pets", pet.id);
      
      const petDataToUpdate: { [key: string]: any } = {
        name: values.name,
        photoUrl: photoUrl,
        photoPath: photoPath,
        species: values.species,
        breed: values.breed || null,
        birthDate: values.birthDate || null,
        isBirthDateApproximate: values.isBirthDateApproximate,
        weight: values.weight ?? null,
        microchip: values.microchip || null,
        healthPlan: values.healthPlan || null,
        isSpayed: values.isSpayed,
      };

      if (values.birthDate) {
        const birthDate = new Date(values.birthDate);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        petDataToUpdate.age = age;
      } else {
        petDataToUpdate.age = null;
      }
      
      // 2. Atualizar os dados no Firestore
      await updateDoc(petRef, petDataToUpdate);
      
      toast({
        title: "Sucesso!",
        description: `O perfil de ${values.name} foi atualizado com sucesso.`,
      });
      onSuccess?.();

    } catch (e: any) {
      console.error("Error updating document: ", e);
      toast({
        variant: "destructive",
        title: "Erro",
        description: e.message || "Ocorreu um erro ao atualizar o pet. Tente novamente.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Editar Perfil de {pet.name}</DialogTitle>
        <DialogDescription>
          Atualize as informações do seu pet abaixo.
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
                    <FormLabel>Nova Foto do Pet (Opcional)</FormLabel>
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
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow">
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
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </>
  );
}
