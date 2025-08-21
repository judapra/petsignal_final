
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
       <Card>
        <CardHeader>
            <CardTitle className="text-3xl font-bold font-headline">Termos de Uso — PetSignal</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Última atualização: 14 de agosto de 2025</p>

            <p>
                Estes Termos de Uso regulam o acesso e o uso do aplicativo PetSignal, desenvolvido para ajudar tutores de pets a organizarem os cuidados com seus animais. Ao utilizar o aplicativo, você concorda com estes termos e se compromete a segui-los.
            </p>

            <h2>1. Sobre o PetSignal</h2>
            <p>
                O PetSignal é um aplicativo que permite ao usuário:
            </p>
            <ul>
                <li>Registrar e controlar consultas veterinárias;</li>
                <li>Acompanhar exames, vacinas, medicações e serviços como banho e tosa;</li>
                <li>Monitorar gastos relacionados ao pet.</li>
            </ul>
            <p>
                O app está disponível em versão gratuita, que exibe anúncios do Google Ads/AdMob. Futuramente poderá ser oferecida uma versão paga com recursos adicionais.
            </p>

            <h2>2. Uso do Aplicativo</h2>
            <p>O usuário deve:</p>
             <ul>
                <li>Fornecer informações verdadeiras ao registrar dados no app;</li>
                <li>Utilizar o app apenas para fins lícitos;</li>
                <li>Proteger suas credenciais de acesso.</li>
            </ul>
            <p>
                O uso indevido do app ou tentativa de violar sua segurança poderá resultar na suspensão ou exclusão da conta.
            </p>

            <h2>3. Armazenamento e Processamento de Dados</h2>
            <p>
                Todos os dados fornecidos são armazenados, processados e protegidos pela infraestrutura do Google Firebase, incluindo:
            </p>
            <ul>
                <li>Cloud Firestore (banco de dados)</li>
                <li>Firebase Authentication (autenticação e login)</li>
                <li>Firebase Storage (armazenamento de arquivos, fotos e documentos)</li>
            </ul>
            <p>
                Os dados são utilizados apenas para o funcionamento do aplicativo e não são vendidos ou compartilhados com terceiros sem o consentimento do usuário, exceto quando exigido por lei.
            </p>

            <h2>4. Publicidade</h2>
            <p>
                A versão gratuita do PetSignal exibe anúncios por meio do Google Ads/AdMob, que podem utilizar cookies e identificadores para personalizar anúncios conforme as configurações da sua conta Google.
            </p>

            <h2>5. Isenção de Responsabilidade</h2>
             <ul>
                <li>O PetSignal não substitui orientação veterinária profissional;</li>
                <li>As informações fornecidas no app são baseadas nos dados inseridos pelo usuário;</li>
                <li>O uso do aplicativo é de responsabilidade exclusiva do usuário.</li>
            </ul>
            
            <h2>6. Propriedade Intelectual</h2>
            <p>
                Todo o conteúdo, design, código-fonte e marca PetSignal pertencem à sua criadora. É proibida a cópia, reprodução ou modificação sem autorização prévia.
            </p>
            
            <h2>7. Alterações nos Termos</h2>
            <p>
                Estes Termos podem ser modificados a qualquer momento. O uso contínuo do app após as alterações indica concordância com a nova versão.
            </p>

            <h2>8. Contato</h2>
            <p>
                Em caso de dúvidas, sugestões ou solicitações relacionadas a estes Termos, envie e-mail para: contato@studiocompass.com.br
            </p>

            <h2>✅ Aceite</h2>
            <p>
                Ao clicar em “Li e Aceito” ou continuar utilizando o PetSignal, você declara que leu, compreendeu e aceita todos os termos acima.
            </p>
            
            <div className="mt-8 not-prose">
              <Link href="/login" className="text-primary hover:underline">
                Voltar para o Login
              </Link>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}
