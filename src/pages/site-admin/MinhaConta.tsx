import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { UserCog, Loader2, ExternalLink, Calendar, Mail, Users, Crown } from "lucide-react";

const MinhaConta = () => {
  const { user } = useAuth();
  const { tenant, loading: tenantLoading } = useSiteTenant();
  const [loading, setLoading] = useState(true);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  const [plano, setPlano] = useState<{ tier: string; status: string; end?: string | null } | null>(null);

  useEffect(() => {
    if (!user?.id || !tenant?.id) return;
    (async () => {
      setLoading(true);
      const [{ data: t }, { count }, { data: sub }] = await Promise.all([
        supabase.from("tenants").select("created_at").eq("id", tenant.id).maybeSingle(),
        supabase.from("assinaturas").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).in("status", ["active", "trialing"]),
        supabase.from("coach_platform_subscriptions").select("plan_tier, status, current_period_end").eq("user_id", user.id).maybeSingle(),
      ]);
      setCreatedAt((t as any)?.created_at || null);
      setAlunosAtivos(count || 0);
      if (sub) setPlano({ tier: (sub as any).plan_tier, status: (sub as any).status, end: (sub as any).current_period_end });
      setLoading(false);
    })();
  }, [user?.id, tenant?.id]);

  if (tenantLoading || loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const fmt = (s: string | null) => s ? new Date(s).toLocaleDateString("pt-BR") : "—";

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl">
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
            <a href="/seja-coach" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground">
              Ver planos disponíveis
            </a>
          </div>
        )}
      </div>

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
