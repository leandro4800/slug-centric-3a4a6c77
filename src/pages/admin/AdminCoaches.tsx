import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X, Loader2 } from "lucide-react";

interface PendingTenant {
  id: string;
  slug: string;
  nome: string;
  tagline: string | null;
  bio: string | null;
  especialidades: string[] | null;
  status: string;
  stripe_onboarding_completed: boolean;
  created_at: string;
  owner_user_id: string | null;
}

export default function AdminCoaches() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<PendingTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }
    void check();
  }, [user, isLoading]);

  const check = async () => {
    if (!user) return;
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");
    if (!roles || roles.length === 0) {
      toast({ title: "Acesso negado", variant: "destructive" });
      navigate("/");
      return;
    }
    setIsAdmin(true);
    void load();
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });
    setTenants((data as PendingTenant[]) ?? []);
    setLoading(false);
  };

  const setStatus = async (id: string, status: "approved" | "rejected" | "suspended") => {
    const { error } = await supabase.from("tenants").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Coach ${status === "approved" ? "aprovado" : status === "rejected" ? "rejeitado" : "suspenso"}` });
    void load();
  };

  if (isLoading || !isAdmin) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const pendentes = tenants.filter((t) => t.status === "pending");
  const aprovados = tenants.filter((t) => t.status === "approved");
  const outros = tenants.filter((t) => !["pending", "approved"].includes(t.status));

  const Card = ({ t }: { t: PendingTenant }) => (
    <div className="rounded-xl border border-border/50 bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xl uppercase">{t.nome}</h3>
            <Badge variant="outline" className="text-xs">/{t.slug}</Badge>
            {t.stripe_onboarding_completed ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Stripe ✓</Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500/40 text-amber-400">Stripe pendente</Badge>
            )}
          </div>
          {t.tagline && <p className="mt-1 text-sm text-muted-foreground">{t.tagline}</p>}
          {t.bio && <p className="mt-2 text-sm text-foreground/80">{t.bio}</p>}
          {t.especialidades && t.especialidades.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {t.especialidades.map((e) => (
                <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          {t.status !== "approved" && (
            <Button
              size="sm"
              onClick={() => setStatus(t.id, "approved")}
              // Admins can approve even without stripe if they want to
              disabled={false}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Check className="mr-1 h-4 w-4" /> Aprovar
            </Button>
          )}
          {t.status === "approved" ? (
            <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "suspended")}>
              Suspender
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={() => setStatus(t.id, "rejected")}>
              <X className="mr-1 h-4 w-4" /> Rejeitar
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="font-display text-xl uppercase">Admin AlphaCoach</h1>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        ) : (
          <div className="space-y-10">
            <section>
              <h2 className="mb-4 font-display text-2xl uppercase">
                Pendentes <Badge className="ml-2 bg-primary">{pendentes.length}</Badge>
              </h2>
              {pendentes.length === 0 ? (
                <p className="text-muted-foreground">Nada pendente.</p>
              ) : (
                <div className="space-y-3">{pendentes.map((t) => <Card key={t.id} t={t} />)}</div>
              )}
            </section>

            <section>
              <h2 className="mb-4 font-display text-2xl uppercase">Aprovados ({aprovados.length})</h2>
              <div className="space-y-3">{aprovados.map((t) => <Card key={t.id} t={t} />)}</div>
            </section>

            {outros.length > 0 && (
              <section>
                <h2 className="mb-4 font-display text-2xl uppercase">Outros ({outros.length})</h2>
                <div className="space-y-3">{outros.map((t) => <Card key={t.id} t={t} />)}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
