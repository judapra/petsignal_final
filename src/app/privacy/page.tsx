
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
       <Card>
        <CardHeader>
            <CardTitle className="text-3xl font-bold font-headline">🔐 Política de Privacidade — PetSignal</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-lg dark:prose-invert max-w-none">
            <p className="text-muted-foreground">Última atualização: 14 de agosto de 2025</p>

            <p>
                A sua privacidade é importante para nós. Esta Política explica como o PetSignal coleta, armazena e utiliza as informações fornecidas pelos usuários.
            </p>
            
            <h2>1. Informações Coletadas</h2>
            <p>
                O PetSignal coleta os seguintes dados:
            </p>
            <ul>
                <li>Informações do pet (nome, espécie, raça, peso, histórico de vacinas, exames, etc.);</li>
                <li>Informações de gastos e registros de cuidados;</li>
                <li>Fotos e documentos relacionados ao pet (opcional).</li>
            </ul>

            <h2>2. Armazenamento e Processamento</h2>
            <p>
                Todos os dados são processados e armazenados no Google Firebase, incluindo:
            </p>
            <ul>
                <li>Cloud Firestore (banco de dados)</li>
                <li>Firebase Authentication (login e autenticação)</li>
                <li>Firebase Storage (armazenamento de arquivos)</li>
            </ul>
            <p>
                O acesso aos dados é restrito e protegido por autenticação.
            </p>

            <h2>3. Uso das Informações</h2>
            <p>
                Os dados são utilizados para:
            </p>
            <ul>
                <li>Oferecer e melhorar as funcionalidades do aplicativo;</li>
                <li>Sincronizar e manter o histórico de informações;</li>
                <li>Garantir a personalização e segurança da experiência do usuário.</li>
            </ul>
            <p>
                Não vendemos ou compartilhamos dados com terceiros sem consentimento, exceto se exigido por lei.
            </p>

            <h2>4. Publicidade e Cookies</h2>
            <p>
                O app exibe anúncios do Google Ads/AdMob, que podem coletar informações não pessoais (como identificadores de dispositivo e cookies) para personalização de anúncios.
                O usuário pode gerenciar preferências de anúncios nas configurações da sua conta Google.
            </p>
            
            <h2>5. Segurança</h2>
            <p>
                O PetSignal adota medidas técnicas e organizacionais para proteger seus dados. Apesar disso, nenhuma transmissão pela internet é 100% segura. O usuário também é responsável por manter suas credenciais protegidas.
            </p>

            <h2>6. Direitos do Usuário (LGPD)</h2>
            <p>
                O usuário pode a qualquer momento:
            </p>
            <ul>
                <li>Solicitar acesso aos seus dados;</li>
                <li>Solicitar correção ou exclusão;</li>
                <li>Revogar consentimento para uso dos dados.</li>
            </ul>
            <p>
                Para exercer seus direitos, envie e-mail para: contato@studiocompass.com.br
            </p>

            <h2>7. Alterações nesta Política</h2>
            <p>
                Podemos atualizar esta Política a qualquer momento. O uso contínuo do app após alterações indica concordância com a nova versão.
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
