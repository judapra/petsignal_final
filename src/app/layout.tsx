
'use client';

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Home,
  Dog,
  DollarSign,
  MapPin,
  Settings,
  LogOut,
  HeartPulse,
  Scissors,
  PanelLeft,
  Bell,
} from "lucide-react";
import { Logo } from "@/components/icons";
import { onAuthStateChangedHelper, signOut, getCurrentUser } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [user, setUser] = useState(getCurrentUser());
  const [loading, setLoading] = useState(true);

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup') || pathname.startsWith('/terms') || pathname.startsWith('/privacy');

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (!firebaseUser && !isAuthPage) {
        router.push('/login');
      }
    });

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(registration => {
          console.log('Service Worker registered: ', registration);
        }).catch(registrationError => {
          console.log('Service Worker registration failed: ', registrationError);
        });
      });
    }

    return () => unsubscribe();
  }, [router, pathname, isAuthPage]);


  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: 'Logout realizado com sucesso!' });
      router.push('/login');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao sair', description: 'Não foi possível fazer logout. Tente novamente.' });
    }
  };

  const navLinks = [
    { href: "/dashboard", icon: Home, label: "Painel" },
    { href: "/pets", icon: Dog, label: "Meus Pets" },
    { href: "/health", icon: HeartPulse, label: "Saúde" },
    { href: "/grooming", icon: Scissors, label: "Banho e Tosa" },
    { href: "/reminders", icon: Bell, label: "Lembretes" },
    { href: "/expenses", icon: DollarSign, label: "Despesas" },
    { href: "/locations", icon: MapPin, label: "Locais" },
  ];

  const NavContent = () => (
     <nav className="grid items-start px-4 text-sm font-medium">
      {navLinks.map(link => (
        <Link
          key={link.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary-foreground hover:bg-primary",
            pathname.startsWith(link.href) && "bg-primary text-primary-foreground"
          )}
          href={link.href}
        >
          <link.icon className="h-4 w-4" />
          {link.label}
        </Link>
      ))}
    </nav>
  );
  
  if (loading) {
    return (
        <html lang="pt-BR" suppressHydrationWarning>
            <body className="flex h-screen items-center justify-center bg-background">
               <Logo />
            </body>
        </html>
    )
  }

  return (
      <html lang="pt-BR" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        </head>
        <body className={cn("min-h-screen bg-background font-body antialiased")}>
            {isAuthPage ? (
                 <div className="flex min-h-screen w-full items-center justify-center bg-secondary p-4">
                    {children}
                </div>
            ) : (
                 <div className="grid min-h-screen w-full lg:grid-cols-[280px_1fr]">
                  <div className="hidden border-r bg-card lg:block">
                    <div className="flex h-full max-h-screen flex-col gap-2">
                      <div className="flex h-[60px] items-center border-b px-6">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-2 font-semibold"
                        >
                          <Logo />
                        </Link>
                      </div>
                      <div className="flex-1 overflow-auto py-2">
                        <NavContent />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
                       <Sheet>
                        <SheetTrigger asChild>
                          <Button size="icon" variant="outline" className="lg:hidden">
                            <PanelLeft className="h-5 w-5" />
                            <span className="sr-only">Abrir menu</span>
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="sm:max-w-xs">
                           <div className="flex h-[60px] items-center border-b px-6 mb-4">
                              <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                                <Logo />
                              </Link>
                          </div>
                          <NavContent />
                        </SheetContent>
                      </Sheet>

                      <div className="w-full flex-1">
                        {/* Can add a search bar here if needed */}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button className="rounded-full" variant="ghost" size="icon">
                            <Avatar>
                              <AvatarImage src={user?.photoURL || "https://placehold.co/100x100.png"} />
                              <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="sr-only">Toggle user menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <Link href="/settings">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configurações</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Sair</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </header>
                    <main className="flex-1 overflow-auto bg-background p-4 sm:p-6">
                      {children}
                    </main>
                  </div>
                </div>
            )}
            <Toaster />
        </body>
    </html>
  );
}
