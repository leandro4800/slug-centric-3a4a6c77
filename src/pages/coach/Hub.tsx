import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Rocket, 
  Megaphone, 
  ChevronLeft,
  Layout,
  FileSpreadsheet,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoriesGenerator } from "@/components/coach/StoriesGenerator";
import { WorkoutSpreadsheetGenerator } from "@/components/coach/WorkoutSpreadsheetGenerator";
import { PushTester } from "@/components/coach/PushTester";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import EnablePushBanner from "@/components/EnablePushBanner";

const Hub = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { user } = useAuth();
  const { tenant } = useBranding();
  const [activeTab, setActiveTab] = useState("marketing");
  const [isFullScreen, setIsFullScreen] = useState(false);

  if (isFullScreen) {
    return <StoriesGenerator isFullScreen={isFullScreen} onExitFullScreen={() => setIsFullScreen(false)} />;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="p-4 flex items-center gap-4 border-b border-border/40 bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate(`/${slug}/app/perfil`)}
          className="rounded-full"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Hub do Coach</h1>
          <p className="text-xs text-muted-foreground">Marketing e Gestão de Treinos</p>
        </div>
        <div className="ml-auto">
          <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20">
            ALPHA PRO
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <EnablePushBanner />
        {/* Welcome Section */}
        <div className="bg-gradient-to-br from-card to-card/50 border border-border/40 rounded-2xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Rocket className="h-24 w-24 -rotate-12" />
          </div>
          <div className="relative z-10 space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tighter italic">Escale seus resultados</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ferramentas exclusivas para profissionalizar seu marketing e automatizar a entrega dos seus treinos.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 w-full h-12 bg-card border border-border/40 p-1 rounded-xl">
            <TabsTrigger value="marketing" className="rounded-lg gap-2 text-xs font-bold uppercase tracking-wider">
              <Megaphone className="h-4 w-4" /> Marketing
            </TabsTrigger>
            <TabsTrigger value="planilhas" className="rounded-lg gap-2 text-xs font-bold uppercase tracking-wider">
              <FileSpreadsheet className="h-4 w-4" /> Planilhas
            </TabsTrigger>
            <TabsTrigger value="config" className="rounded-lg gap-2 text-xs font-bold uppercase tracking-wider">
              <Settings className="h-4 w-4" /> Config
            </TabsTrigger>
          </TabsList>

          <TabsContent value="marketing" className="mt-0 focus-visible:outline-none">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Layout className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Gerador de Stories</h3>
              </div>
              <StoriesGenerator onEnterFullScreen={() => setIsFullScreen(true)} />
            </div>
          </TabsContent>

          <TabsContent value="planilhas" className="mt-0 focus-visible:outline-none">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Gerador de Planilhas</h3>
              </div>
              <WorkoutSpreadsheetGenerator />
            </div>
          </TabsContent>


          <TabsContent value="config" className="mt-0 focus-visible:outline-none">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Configurações do App</h3>
              </div>
              <PushTester />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Hub;
