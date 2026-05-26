import { useState, useEffect } from "react";
import { 
  Zap, 
  Copy, 
  ExternalLink, 
  Plus, 
  Trash2, 
  Dumbbell, 
  Utensils, 
  Check, 
  Loader2,
  Share2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { nanoid } from "nanoid";

export const AutomatedDelivery = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [deliveryLinks, setDeliveryLinks] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linksRes, templatesRes] = await Promise.all([
        supabase.from("coach_automated_delivery").select("*").eq("user_id", user?.id).order("created_at", { ascending: false }),
        supabase.from("templates_treino").select("id, titulo").limit(100)
      ]);

      if (linksRes.data) setDeliveryLinks(linksRes.data);
      if (templatesRes.data) setTemplates(templatesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generateLink = async () => {
    if (!selectedTemplate) return toast.error("Selecione um treino template.");
    setSaving(true);
    try {
      // Usando nanoid via uma função simples se não estiver disponível ou apenas Math.random
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const { data, error } = await supabase.from("coach_automated_delivery").insert({
        user_id: user?.id,
        token,
        plan_id: selectedTemplate,
        is_active: true
      }).select().single();

      if (error) throw error;
      
      setDeliveryLinks([data, ...deliveryLinks]);
      setIsAdding(false);
      setSelectedTemplate("");
      toast.success("Link gerado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar link: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteLink = async (id: string) => {
    try {
      const { error } = await supabase.from("coach_automated_delivery").delete().eq("id", id);
      if (error) throw error;
      setDeliveryLinks(deliveryLinks.filter(l => l.id !== id));
      toast.success("Link removido.");
    } catch (err: any) {
      toast.error("Erro ao remover: " + err.message);
    }
  };

  const copyLink = (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Crie links únicos para vender seus treinos em plataformas externas.
        </p>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2 rounded-xl">
              <Plus className="h-4 w-4" /> Novo Link
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/40">
            <DialogHeader>
              <DialogTitle>Gerar Link de Entrega</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest opacity-70">Selecione o Treino Template</label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger className="bg-black/20">
                    <SelectValue placeholder="Escolha um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={generateLink} disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                Gerar Link Único
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {deliveryLinks.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border/20 rounded-2xl opacity-50">
            <Share2 className="h-12 w-12 mx-auto mb-2" />
            <p className="text-sm font-medium">Nenhum link de entrega gerado</p>
          </div>
        ) : (
          deliveryLinks.map((link) => {
            const template = templates.find(t => t.id === link.plan_id);
            return (
              <div key={link.id} className="bg-card border border-border/40 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Dumbbell className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm leading-none">{template?.titulo || "Treino Removido"}</h4>
                    <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">
                      Token: {link.token.substring(0, 8)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-primary/20 hover:text-primary"
                    onClick={() => copyLink(link.token)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => deleteLink(link.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="bg-card border border-border/40 rounded-2xl p-6">
        <h5 className="font-bold text-sm mb-3 flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary" /> Integração com Checkout
        </h5>
        <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
          <p>Para automatizar a entrega pós-venda na Kiwify ou Hotmart:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Copie o link gerado acima.</li>
            <li>No seu painel da Kiwify/Hotmart, configure o link como a <strong>URL de Acesso</strong> ou na mensagem automática de entrega.</li>
            <li>Quando o aluno clicar, o AlphaCoach abrirá, vinculará a conta dele e aplicará o treino automaticamente.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
