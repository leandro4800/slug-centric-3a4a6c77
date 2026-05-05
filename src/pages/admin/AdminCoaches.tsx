import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Check, X, Loader2, ExternalLink, Users, Sparkles, Copy } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const TENANT_ADMIN_COLUMNS =
  "id, slug, nome, tagline, bio, especialidades, status, created_at, owner_user_id";

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
      .select(TENANT_ADMIN_COLUMNS)
      .order("created_at", { ascending: false });
    const list = (data as any[]) ?? [];
    // Fetch onboarding flags from tenants_private (admin can read all)
    const { data: privs } = await supabase
      .from("tenants_private" as any)
      .select("tenant_id, stripe_onboarding_completed");
    const map = new Map((privs as any[] || []).map((p) => [p.tenant_id, !!p.stripe_onboarding_completed]));
    setTenants(list.map((t) => ({ ...t, stripe_onboarding_completed: map.get(t.id) ?? false })) as PendingTenant[]);
    setLoading(false);
  };

  const setStatus = async (id: string, status: "approved" | "rejected" | "suspended") => {
    const tenant = tenants.find((t) => t.id === id);
    const { error } = await supabase.from("tenants").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Coach ${status === "approved" ? "aprovado" : status === "rejected" ? "rejeitado" : "suspenso"}` });

    // Send approval email when coach is approved
    if (status === "approved" && tenant?.owner_user_id) {
      try {
        const { data: ownerPerfil } = await supabase
          .from("perfis")
          .select("email, nome_completo")
          .eq("id", tenant.owner_user_id)
          .maybeSingle();
        if (ownerPerfil?.email) {
          await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "coach-approved",
              recipientEmail: ownerPerfil.email,
              idempotencyKey: `coach-approved-${id}`,
              templateData: {
                name: ownerPerfil.nome_completo || tenant.nome,
                slug: tenant.slug,
              },
            },
          });
          toast({ title: "E-mail de aprovação enviado" });
        }
      } catch (e) {
        console.error("Failed to send approval email", e);
      }
    }
    void load();
  };

  const [seeding, setSeeding] = useState<string | null>(null);

  const seedAlunos = async (slug: string) => {
    setSeeding(slug);
    const { error } = await supabase.functions.invoke("seed-alunos-demo", {
      body: { slug },
    });
    setSeeding(null);
    if (error) {
      toast({ title: "Erro ao popular alunos", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: `Alunos demo criados em /${slug}`,
      description: `Login: samila.${slug}@coach.app · Senha: Demo@1234`,
    });
  };

  const copyCreds = (slug: string) => {
    const text = `Email: samila.${slug.replace(/[^a-z0-9]/gi, "").toLowerCase()}@coach.app\nSenha: Demo@1234`;
    navigator.clipboard.writeText(text);
    toast({ title: "Credenciais copiadas", description: "Cole numa janela anônima para entrar como aluno." });
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

      {t.status === "approved" && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/40 pt-4">
          <Link to={`/${t.slug}/admin`}>
            <Button size="sm" variant="outline" className="border-primary/40">
              <Sparkles className="mr-1 h-3 w-3" /> Painel do Coach
            </Button>
          </Link>
          <Link to={`/${t.slug}`} target="_blank">
            <Button size="sm" variant="outline">
              <ExternalLink className="mr-1 h-3 w-3" /> Landing
            </Button>
          </Link>
          <Button
            size="sm"
            variant="outline"
            onClick={() => seedAlunos(t.slug)}
            disabled={seeding === t.slug}
          >
            {seeding === t.slug ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <Users className="mr-1 h-3 w-3" />
            )}
            Popular alunos demo
          </Button>
          <Button size="sm" variant="outline" onClick={() => copyCreds(t.slug)}>
            <Copy className="mr-1 h-3 w-3" /> Credenciais aluno
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 md:px-8">
          <AdminBackButton 
            to="/" 
            showLabel 
            confirmExit 
            exitMessage="Você voltará para a página inicial. Deseja continuar?"
            className="text-sm text-muted-foreground hover:text-foreground p-0 h-auto"
            size="default"
          />
          <h1 className="font-display text-xl uppercase">Admin Alpha Coach</h1>
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
