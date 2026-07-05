import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { UserCog, Loader2, ExternalLink, Calendar, Mail, Users, Crown, Bot, Copy, RefreshCw, Eye, EyeOff } from "lucide-react";

const MinhaConta = () => {
  const { user } = useAuth();
  const { tenant, loading: tenantLoading } = useSiteTenant();
  const [loading, setLoading] = useState(true);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  const [plano, setPlano] = useState<{ tier: string; status: string; end?: string | null } | null>(null);
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (!user?.id || !tenant?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: t }, { count }, { data: sub }, { data: tk }] = await Promise.all([
        supabase.from("tenants").select("created_at").eq("id", tenant.id).maybeSingle(),
        supabase.from("assinaturas").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).in("status", ["active", "trialing"]),
        supabase.from("coach_platform_subscriptions").select("plan_tier, status, current_period_end").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("get_my_mcp_token"),
      ]);
      setCreatedAt((t as any)?.created_at || null);
      setAlunosAtivos(count || 0);
      if (sub) setPlano({ tier: (sub as any).plan_tier, status: (sub as any).status, end: (sub as any).current_period_end });
      setMcpToken((tk as string | null) || null);
      setLoading(false);
    })();
  }, [user?.id, tenant?.id]);

  const copyToken = async () => {
    if (!mcpToken) return;
    await navigator.clipboard.writeText(mcpToken);
    toast({ title: "Token copiado", description: "Cole em ChatGPT / Claude / Cursor." });
  };

  const rotateToken = async () => {
    if (!confirm("Gerar um novo token? O token atual deixará de funcionar imediatamente.")) return;
    setRotating(true);
    const { data, error } = await supabase.rpc("rotate_my_mcp_token");
    setRotating(false);
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    setMcpToken(data as string);
    setShowToken(true);
    toast({ title: "Novo token gerado", description: "Atualize seus assistentes de IA com o novo token." });
  };

  if (tenantLoading || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Conta</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <UserCog className="h-7 w-7 text-primary" /> Minha conta
        </h1>
        <p className="text-sm text-muted-foreground mt-2">Informações da sua conta e gerenciamento de assinatura.</p>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="font-display text-sm uppercase tracking-wider mb-4">Informações da conta</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field icon={Calendar} label="Data de registro" value={fmt(createdAt)} />
          <Field icon={Mail} label="E-mail" value={user?.email || "—"} />
          <Field icon={Users} label="Clientes ativos" value={`${alunosAtivos} de ilimitado`} />
          <Field
            icon={ExternalLink}
            label="Termos e políticas"
            value={
              <a href="/termos" target="_blank" rel="noreferrer" className="text-primary hover:underline">
                Termos de uso e política
              </a>
            }
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h2 className="font-display text-sm uppercase tracking-wider mb-4">Plano de assinatura</h2>
        {plano ? (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Crown className="h-6 w-6 text-primary" />
              <div>
                <p className="font-display text-lg uppercase tracking-wider">Plano {plano.tier}</p>
                <p className="text-xs text-muted-foreground">
                  Status: <span className="text-foreground font-bold">{plano.status}</span>
                  {plano.end && ` · Próxima cobrança: ${fmt(plano.end)}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-muted-foreground mb-3">Você ainda não tem um plano de assinatura ativo.</p>
            <a href="/seja-coach?view=planos" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">
              Ver planos disponíveis
            </a>
          </div>
        )}
      </div>

      <a
        href="/site/admin/integracao-ia"
        className="block rounded-2xl border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-sm uppercase tracking-wider flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> Integração com IA (MCP)
            </h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
              Conecte ChatGPT, Claude ou Cursor ao Alpha Coach para consultar treinos, dietas, evolução e
              cadastrar alunos via conversa. Passo a passo e seu token pessoal na página dedicada.
            </p>
          </div>
          <ExternalLink className="h-4 w-4 text-primary shrink-0" />
        </div>
      </a>



      <div className="rounded-2xl border border-dashed border-border p-6">
        <p className="text-xs text-muted-foreground">
          Dados do seu tenant: <strong className="text-foreground">{tenant?.nome}</strong> · slug{" "}
          <code className="text-primary">/{tenant?.slug}</code>
        </p>
      </div>
    </div>
  );
};

const Field = ({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) => (
  <div>
    <div className="flex items-center gap-2 text-muted-foreground mb-1">
      <Icon className="h-3 w-3" />
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </div>
    <p className="text-sm font-bold">{value}</p>
  </div>
);

export default MinhaConta;
