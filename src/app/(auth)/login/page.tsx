import { LoginForm } from "@/components/auth/login-form";
import { Logo } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>
        <CardTitle className="font-headline text-2xl">Bem-vindo de Volta</CardTitle>
        <CardDescription>Escolha seu método de login preferido</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}