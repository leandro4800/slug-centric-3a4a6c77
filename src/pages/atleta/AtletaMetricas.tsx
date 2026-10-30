import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AtletaTreino from "./AtletaTreino";
import AtletaEvolucao from "./AtletaEvolucao";

export default function AtletaMetricas() {
  const [tab, setTab] = useState("treino");
  return <div className="space-y-6">
    <header><h1 className="font-display text-3xl tracking-normal">Métricas e evolução</h1></header>
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="mb-6 grid h-auto w-full max-w-md grid-cols-2"><TabsTrigger value="treino" className="whitespace-normal">Volume e cargas</TabsTrigger><TabsTrigger value="evolucao" className="whitespace-normal">Medidas e fotos</TabsTrigger></TabsList>
      <TabsContent value="treino"><AtletaTreino embedded /></TabsContent>
      <TabsContent value="evolucao"><AtletaEvolucao embedded /></TabsContent>
    </Tabs>
  </div>;
}