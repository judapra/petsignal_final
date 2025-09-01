
'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUser, deleteUserAccount, saveFcmToken, removeFcmToken } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { messaging } from "@/lib/firebase";
import { getToken, onMessage } from "firebase/messaging";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User } from "firebase/auth";

export default function SettingsPage() {
    const [user, setUser] = useState<User | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmationText, setConfirmationText] = useState("");
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
    const [isNotificationLoading, setIsNotificationLoading] = useState(true);

    const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_KEY;

    useEffect(() => {
        const currentUser = getCurrentUser();
        setUser(currentUser);

        if ("Notification" in window) {
            setNotificationPermission(Notification.permission);
        }
        setIsNotificationLoading(false);
    }, []);

    const handleEnableNotifications = async () => {
        setIsNotificationLoading(true);
        if (!VAPID_KEY) {
            console.error("VAPID key is not configured.");
            toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'As notificações não podem ser ativadas.' });
            setIsNotificationLoading(false);
            return;
        }

        try {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);

            if (permission === 'granted') {
                const messagingInstance = await messaging();
                if (!messagingInstance) throw new Error("Firebase Messaging não é suportado neste navegador.");
                
                const currentToken = await getToken(messagingInstance, { vapidKey: VAPID_KEY });
                if (currentToken) {
                    await saveFcmToken(currentToken);
                    toast({ title: 'Sucesso!', description: 'As notificações foram ativadas.' });
                } else {
                    toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível obter o token de notificação.' });
                }
            } else {
                toast({ variant: 'destructive', title: 'Permissão Negada', description: 'Você não receberá notificações.' });
            }
        } catch(error) {
             console.error('Erro ao habilitar notificações:', error);
             toast({ variant: 'destructive', title: 'Erro de Notificação', description: 'Ocorreu um erro ao configurar as notificações.' });
        } finally {
            setIsNotificationLoading(false);
        }
    };
    
    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await deleteUserAccount();
            toast({ title: "Conta Excluída", description: "Sua conta e todos os seus dados foram excluídos com sucesso." });
            router.push('/login');
        } catch (error: any) {
            console.error("Error deleting account:", error);
            let description = "Não foi possível excluir sua conta. Tente novamente mais tarde.";
            if (error.code === 'auth/requires-recent-login') {
                description = "Esta operação requer um login recente. Por favor, faça logout e login novamente.";
            }
            toast({ variant: "destructive", title: "Erro ao Excluir Conta", description: description });
        } finally {
            setIsDeleting(false);
        }
    }
    
    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold font-headline">Configurações</h1>
                <p className="text-muted-foreground">Gerencie suas informações e preferências da conta.</p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Informações do Perfil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" value={user?.email || ''} readOnly disabled />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="uid">ID do Usuário</Label>
                        <Input id="uid" value={user?.uid || ''} readOnly disabled />
                        <p className="text-xs text-muted-foreground">Este é o seu identificador único no sistema.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Notificações</CardTitle>
                    <CardDescription>Receba lembretes sobre os cuidados com seus pets diretamente no seu navegador.</CardDescription>
                </CardHeader>
                <CardContent>
                     <Button onClick={handleEnableNotifications} disabled={isNotificationLoading || notificationPermission === 'granted'}>
                        {isNotificationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isNotificationLoading ? 'Verificando...' : notificationPermission === 'granted' ? (
                            <>
                                <Bell className="mr-2" />
                                Notificações Ativadas
                            </>
                        ) : (
                            <>
                                <BellOff className="mr-2" />
                                Ativar Notificações
                            </>
                        )}
                    </Button>
                    {notificationPermission === 'denied' && (
                        <p className="text-xs text-destructive mt-2">
                           As notificações estão bloqueadas. Você precisa alterar as permissões nas configurações do seu navegador.
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
                    <CardDescription>
                        Ações nesta seção são permanentes e não podem ser desfeitas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                   <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive">Excluir Minha Conta</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta
                                e removerá todos os seus dados de nossos servidores, incluindo pets, registros de saúde, despesas e locais.
                                <br/><br/>
                                Por favor, digite <strong>excluir minha conta</strong> para confirmar.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                         <Input
                            id="confirmation"
                            value={confirmationText}
                            onChange={(e) => setConfirmationText(e.target.value)}
                            placeholder="excluir minha conta"
                            className="mt-2"
                        />
                        <AlertDialogFooter>
                            <AlertDialogCancel onClick={() => setConfirmationText('')}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteAccount}
                                disabled={isDeleting || confirmationText !== 'excluir minha conta'}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                {isDeleting ? 'Excluindo...' : 'Sim, Excluir Conta'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                   </AlertDialog>
                </CardContent>
            </Card>
        </div>
    );
}

    