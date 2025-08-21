
'use client';

import { useState } from "react";
import type { Pet, WeightEntry } from "../../lib/placeholder-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { PlusCircle, Weight, Loader2 } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";

const chartConfig = {
  weight: {
    label: "Peso (kg)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function WeightTracker({ pet }: { pet: Pet }) {
  const { toast } = useToast();
  const [newWeight, setNewWeight] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formattedData = [...(pet.weightHistory || [])]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(entry => ({
      ...entry,
      date: new Date(entry.date).toLocaleDateString('pt-BR', { timeZone: 'UTC', month: 'short', day: 'numeric' })
    }));

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightValue = parseFloat(newWeight);
    if (!newWeight || isNaN(weightValue) || weightValue <= 0) {
       toast({
        variant: "destructive",
        title: "Peso Inválido",
        description: "Por favor, insira um valor de peso válido.",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
        const petRef = doc(db, "pets", pet.id);
        const newEntry: WeightEntry = {
            date: new Date().toISOString(),
            weight: weightValue
        };
        const updatedWeightHistory = [...(pet.weightHistory || []), newEntry];

        await updateDoc(petRef, { 
            weightHistory: updatedWeightHistory,
            weight: weightValue
        });
        
        toast({
            title: "Peso Adicionado",
            description: `O novo peso de ${weightValue} kg foi registrado.`,
        });
        setNewWeight('');
    } catch(error) {
        console.error("Error adding weight:", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar o peso." });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <CardTitle className="flex items-center gap-2"><Weight className="h-5 w-5 text-primary"/> Acompanhamento de Peso</CardTitle>
                <CardDescription>Monitore o peso de {pet.name} ao longo do tempo.</CardDescription>
            </div>
            <form className="flex gap-2 w-full md:w-auto" onSubmit={handleAddWeight}>
                <Input 
                  type="number" 
                  step="0.1" 
                  placeholder="Novo peso (kg)" 
                  className="w-full md:w-40"
                  value={newWeight}
                  onChange={(e) => setNewWeight(e.target.value)}
                  disabled={isSubmitting}
                />
                <Button type="submit" variant="outline" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin"/> : <PlusCircle className="h-4 w-4 md:mr-2" />}
                    <span className="hidden md:inline">Adicionar</span>
                </Button>
            </form>
        </div>
      </CardHeader>
      <CardContent>
        {formattedData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{
                top: 5,
                right: 20,
                left: -10,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false}/>
              <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickLine={false} axisLine={false} tickMargin={8} unit="kg" />
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Line dataKey="weight" type="monotone" stroke="var(--color-weight)" strokeWidth={2} dot={true} />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
        ) : (
            <div className="flex h-[300px] w-full items-center justify-center text-center text-muted-foreground p-4">
                <div>
                    <Weight className="h-10 w-10 mx-auto mb-2"/>
                    <p>Nenhum registro de peso encontrado. Adicione o primeiro para começar a monitorar!</p>
                </div>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
