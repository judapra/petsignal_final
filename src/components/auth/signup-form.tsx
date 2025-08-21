
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Input } from '../ui/input';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/auth';
import { useToast } from '../../hooks/use-toast';
import { useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { Checkbox } from '../ui/checkbox';

const formSchema = z.object({
  name: z.string().min(2, { message: 'O nome deve ter pelo menos 2 caracteres.' }),
  email: z.string().email({ message: 'Endereço de email inválido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Você deve aceitar os termos para criar uma conta.',
  }),
});

export function SignupForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      acceptTerms: false,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      await signUp(values.email, values.password);
      toast({
        title: "Conta criada com sucesso!",
        description: "Você será redirecionado para o painel.",
      });
      router.push('/dashboard');
    } catch (error) {
      console.error("Erro no cadastro:", error);
      let description = "Ocorreu um erro ao criar sua conta. Tente novamente.";
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
          description = 'Este endereço de e-mail já está em uso.';
        } else if (error.code === 'auth/weak-password') {
          description = 'Sua senha é muito fraca. Tente uma mais forte.';
        } else {
          description = `Ocorreu um erro inesperado: ${error.message} (código: ${error.code})`;
        }
      }
      toast({
        variant: "destructive",
        title: "Erro no Cadastro",
        description: description,
      });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  return (
     <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu Nome" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="voce@exemplo.com" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Senha</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                       Li e aceito os <Link href="/terms" className="underline hover:text-primary">Termos de Uso</Link> e a <Link href="/privacy" className="underline hover:text-primary">Política de Privacidade</Link>.
                    </FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Criando conta...' : 'Criar Conta com Email'}
          </Button>
        </form>
      </Form>
      
       <p className="px-8 text-center text-xs text-muted-foreground">
        Ao continuar, você confirma que o app armazena seus dados no Google Firebase e exibe anúncios do Google Ads/AdMob. Você pode solicitar a exclusão ou alteração dos seus dados pelo e-mail contato@studiocompass.com.br.
      </p>

      <div className="text-center text-sm">
        Já tem uma conta?{' '}
        <Link href="/login" className="underline">
          Entrar
        </Link>
      </div>
    </div>
  );
}
