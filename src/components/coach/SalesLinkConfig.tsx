import { useState, useEffect } from "react";
import { 
  Link as LinkIcon, 
  ExternalLink, 
  Save, 
  Loader2,
  Lock,
  Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SalesLinkConfig = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    checkout_url: "",
    landing_page_url: "",
  });

  useEffect(() => {
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("coach_sales_links")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data) {
        setConfig({
          checkout_url: data.checkout_url || "",
          landing_page_url: data.landing_page_url || "",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("coach_sales_links").upsert({
        user_id: user.id,
        ...config,
        updated_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success("Links de vendas atualizados!");
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <Label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" /> Sua Landing Page
          </Label>
          <p className="text-xs text-muted-foreground">
            Onde os novos alunos conhecem seu trabalho (ex: Linktree, Site Próprio).
          </p>
          <Input 
            value={config.landing_page_url}
            onChange={e => setConfig(prev => ({ ...prev, landing_page_url: e.target.value }))}
            placeholder="https://suapagina.com.br"
            className="bg-black/20"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-primary" /> Link de Checkout Direto
          </Label>
          <p className="text-xs text-muted-foreground">
            Link da Kiwify, Hotmart ou Stripe para pagamento imediato.
          </p>
          <Input 
            value={config.checkout_url}
            onChange={e => setConfig(prev => ({ ...prev, checkout_url: e.target.value }))}
            placeholder="https://kiwify.com.br/checkout/..."
            className="bg-black/20"
          />
        </div>

        <Button onClick={handleSave} className="w-full gap-2" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Configurações de Venda
        </Button>
      </div>

      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" />
          <h4 className="font-bold">Como funciona a Barreira de Vendas?</h4>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Sempre que um usuário tentar acessar conteúdos restritos sem uma assinatura ativa, o app mostrará uma tela de bloqueio premium. O botão dessa tela redirecionará automaticamente para o <strong>Link de Checkout</strong> que você cadastrou acima.
        </p>
        <div className="bg-black/40 rounded-lg p-3 border border-white/5 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] uppercase font-bold tracking-widest text-white/70">Otimização de Conversão Ativa</span>
        </div>
      </div>
    </div>
  );
};
