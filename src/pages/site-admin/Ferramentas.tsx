import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Wrench, Link as LinkIcon, FileSpreadsheet, Megaphone } from "lucide-react";
import { SalesLinkConfig } from "@/components/coach/SalesLinkConfig";
import { WorkoutSpreadsheetGenerator } from "@/components/coach/WorkoutSpreadsheetGenerator";
import { StoriesGenerator } from "@/components/coach/StoriesGenerator";

const Ferramentas = () => {
  const [tab, setTab] = useState("links");
  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Negócio</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <Wrench className="h-7 w-7 text-primary" /> Ferramentas
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Links externos de vendas, geração de planilhas de treino com IA e materiais de marketing.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-5">
        <TabsList className="grid grid-cols-3 w-full max-w-2xl h-12 bg-card border border-border/40 p-1 rounded-xl">
          <TabsTrigger value="links" className="rounded-lg gap-2 text-xs font-bold uppercase tracking-wider">
            <LinkIcon className="h-4 w-4" /> Links externos
          </TabsTrigger>
          <TabsTrigger value="planilhas" className="rounded-lg gap-2 text-xs font-bold uppercase tracking-wider">
            <FileSpreadsheet className="h-4 w-4" /> Planilhas IA
          </TabsTrigger>
          <TabsTrigger value="stories" className="rounded-lg gap-2 text-xs font-bold uppercase tracking-wider">
            <Megaphone className="h-4 w-4" /> Stories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="links" className="mt-0 focus-visible:outline-none">
          <SalesLinkConfig />
        </TabsContent>

        <TabsContent value="planilhas" className="mt-0 focus-visible:outline-none">
          <WorkoutSpreadsheetGenerator />
        </TabsContent>

        <TabsContent value="stories" className="mt-0 focus-visible:outline-none">
          <StoriesGenerator />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Ferramentas;
