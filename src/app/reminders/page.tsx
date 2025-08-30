'use client';

import { useState, useEffect } from "react";
import { Pet, Consultation, Vaccination, Medication, Grooming } from "@/lib/placeholder-data";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Bell, Syringe, Pill, Stethoscope, Scissors, Dog, Cat, CalendarPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isAfter, isBefore, isToday, addDays, differenceInDays, addHours } from 'date-fns';
import { generateIcsContent, downloadIcsFile } from '@/lib/utils';
import { Button } from "@/components/ui/button";

type Reminder = {
    id: string;
    petName: string;
    petSpecies: 'Dog' | 'Cat';
    type: 'Vacina' | 'Medicamento' | 'Consulta' | 'Banho e Tosa';
    title: string;
    date: Date;
    details?: string;
    location?: string;
};

export default function RemindersPage() {
    const [pets, setPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!user) {
            setPets([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        const petsCollection = collection(db, "pets");
        const q = query(petsCollection, where("ownerUid", "==", user.uid));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const petsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Pet));
            setPets(petsList);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching pets:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const reminders: Reminder[] = [];
    const today = new Date();
    const reminderEndDate = addDays(today, 30); 

    pets.forEach(pet => {
        // Lembretes de Vacina
        (pet.vaccinations || []).forEach(v => {
            if (v.nextApplicationDate) {
                const nextDate = new Date(v.nextApplicationDate);
                if (isAfter(nextDate, today) && isBefore(nextDate, reminderEndDate)) {
                    reminders.push({
                        id: v.id,
                        petName: pet.name,
                        petSpecies: pet.species,
                        type: 'Vacina',
                        title: v.vaccineName,
                        date: nextDate,
                        details: `Reforço/Próxima dose com Dr(a). ${v.vetName}`
                    });
                }
            }
        });

        // Lembretes de Medicamento
        (pet.medications || []).forEach(m => {
            const startDate = new Date(m.startDate);
            const endDate = m.endDate ? new Date(m.endDate) : null;
            const isActive = isAfter(today, startDate) && (!endDate || isBefore(today, endDate));

            if (isActive) {
                 reminders.push({
                    id: m.id,
                    petName: pet.name,
                    petSpecies: pet.species,
                    type: 'Medicamento',
                    title: m.name,
                    date: today, 
                    details: `Administrar ${m.dosage}, ${m.frequency}`
                });
            }
        });

        // Lembretes de Consulta
        (pet.consultations || []).forEach(c => {
            const consultDate = new Date(c.date);
            if (isAfter(consultDate, today) && isBefore(consultDate, reminderEndDate)) {
                reminders.push({
                    id: c.id,
                    petName: pet.name,
                    petSpecies: pet.species,
                    type: 'Consulta',
                    title: c.reason,
                    date: consultDate,
                    details: `Com Dr(a). ${c.vetName}`,
                    location: c.location
                });
            }
        });
        
        // Lembretes de Banho e Tosa
        (pet.groomings || []).forEach(g => {
            const groomingDate = new Date(g.date);
            if (g.status === 'Agendado' && isAfter(groomingDate, today) && isBefore(groomingDate, reminderEndDate)) {
                reminders.push({
                    id: g.id,
                    petName: pet.name,
                    petSpecies: pet.species,
                    type: 'Banho e Tosa',
                    title: g.services,
                    date: groomingDate,
                    details: `Local: ${g.location}`,
                    location: g.location
                });
            }
        });
    });

    const sortedReminders = reminders.sort((a, b) => a.date.getTime() - b.date.getTime());

    const getDaysUntil = (date: Date) => {
        const days = differenceInDays(date, today);
        if (isToday(date)) return 'Hoje';
        if (days === 0) return 'Amanhã';
        if (days === 1) return 'Amanhã';
        return `Em ${days} dias`;
    }

    const handleAddToCalendar = (reminder: Reminder) => {
        const event = {
            uid: `${reminder.id}-${reminder.petName}`,
            title: `${reminder.type}: ${reminder.title} para ${reminder.petName}`,
            description: reminder.details || `Lembrete para ${reminder.petName}`,
            startTime: reminder.date,
            endTime: addHours(reminder.date, 1),
            location: reminder.location,
        };
        const icsContent = generateIcsContent(event);
        downloadIcsFile(`${reminder.type}-${reminder.petName}.ics`, icsContent);
    };


    const typeInfo: { [key: string]: { icon: React.ReactNode, color: string } } = {
        'Vacina': { icon: <Syringe className="h-5 w-5"/>, color: 'bg-blue-100 text-blue-800' },
        'Medicamento': { icon: <Pill className="h-5 w-5"/>, color: 'bg-green-100 text-green-800' },
        'Consulta': { icon: <Stethoscope className="h-5 w-5"/>, color: 'bg-purple-100 text-purple-800' },
        'Banho e Tosa': { icon: <Scissors className="h-5 w-5"/>, color: 'bg-pink-100 text-pink-800' }
    };
    
    if (loading) {
        return (
             <div className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-5 w-2/3" />
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                    <Skeleton className="h-24 w-full rounded-lg" />
                </div>
             </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
                    <Bell className="h-8 w-8 text-primary"/>
                    Central de Lembretes
                </h1>
                <p className="text-muted-foreground">Fique por dentro dos próximos cuidados e compromissos dos seus pets para os próximos 30 dias.</p>
            </div>
            
            <div className="space-y-4">
                {sortedReminders.length > 0 ? (
                    sortedReminders.map((reminder, index) => (
                        <Card key={index} className="flex items-center p-4 gap-4 hover:bg-muted/50 transition-colors">
                            <div className={`flex items-center justify-center p-3 rounded-full ${typeInfo[reminder.type].color}`}>
                                {typeInfo[reminder.type].icon}
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold">{reminder.title}</h3>
                                    <Badge variant="secondary">{reminder.type}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                   {reminder.petSpecies === 'Dog' ? <Dog className="h-4 w-4" /> : <Cat className="h-4 w-4" />}
                                   {reminder.petName} 
                                   {reminder.details && <span className="text-xs">• {reminder.details}</span>}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {reminder.type !== 'Medicamento' && (
                                    <Button variant="ghost" size="icon" onClick={() => handleAddToCalendar(reminder)}>
                                        <CalendarPlus className="h-5 w-5"/>
                                        <span className="sr-only">Adicionar ao Calendário</span>
                                    </Button>
                                )}
                                <div className="text-right">
                                    <p className="font-bold">{format(reminder.date, 'dd/MM/yyyy')}</p>
                                    <p className="text-sm text-primary font-semibold">{getDaysUntil(reminder.date)}</p>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card>
                        <CardContent className="p-10 text-center">
                            <Bell className="mx-auto h-12 w-12 text-muted-foreground mb-4"/>
                            <p className="text-lg font-semibold">Tudo em dia!</p>
                            <p className="text-muted-foreground">Nenhum lembrete para os próximos 30 dias.</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
