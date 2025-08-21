
import { SignupForm } from '@/components/auth/signup-form';
import { Logo } from '@/components/icons';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function SignupPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mb-4 flex justify-center">
          <Logo />
        </div>
        <CardTitle className="font-headline text-2xl">Crie uma Conta</CardTitle>
        <CardDescription>Junte-se à nossa comunidade de amantes de pets</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm />
      </CardContent>
    </Card>
  );
}
