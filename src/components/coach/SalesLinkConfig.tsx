import { useState, useEffect } from "react";
import { 
  Link as LinkIcon, 
  Save, 
  Loader2,
  Lock,
  Globe,
  Monitor,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { blocksExternalPayments } from "@/lib/native-platform";

export const SalesLinkConfig = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    checkout_url: "",
    landing_page_url: "",
  });
  const iosBlocksPayments = blocksExternalPayments();

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
    if (iosBlocksPayments) return;
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

  if (iosBlocksPayments) {
    return (
      <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mx-auto">
          <Monitor className="h-7 w-7" />
        </div>
        <h4 className="font-display text-lg uppercase italic">Links de venda no computador</h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Links de checkout (Kiwify, Hotmart ou Stripe) não podem ser configurados dentro do app iOS.
          Acesse <strong>alpha-coach.app/site/admin/ferramentas</strong> pelo navegador do seu computador.
        </p>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex gap-3 text-left">
          <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            No app iOS, alunos sem assinatura veem apenas a opção de contatar o coach ou usar código de acesso — sem redirecionamento para pagamento externo.
          </p>
        </div>
      </div>
    );
  }

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
            Link da Kiwify, Hotmart ou Stripe para pagamento imediato (somente fora do app iOS).
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
          <h4 className="font-bold">Como funciona o bloqueio de vendas?</h4>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Em Android e web, usuários sem assinatura podem ser direcionados ao link de checkout configurado acima.
          No app iOS, o bloqueio mostra apenas contato com o coach ou código de acesso — sem checkout externo.
        </p>
      </div>
    </div>
  );
};
