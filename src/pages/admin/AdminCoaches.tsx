import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Loader2, ExternalLink, Users, Sparkles, Copy, Search } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  logo_url: string | null;
  foto_url: string | null;
  hero_url: string | null;
}

const TENANT_ADMIN_COLUMNS =
  "id, slug, nome, tagline, bio, especialidades, status, created_at, owner_user_id, logo_url, foto_url, hero_url";

const NEON_COLORS = [
  "#F5C518", "#22D3EE", "#A78BFA", "#F472B6",
  "#34D399", "#60A5FA", "#FB923C", "#E11D48",
];

const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NEON_COLORS[h % NEON_COLORS.length];
};

const getInitials = (nome: string) => {
  const parts = (nome || "?").trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (nome || "?").slice(0, 2).toUpperCase();
};

export default function AdminCoaches() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<PendingTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "other">("all");
  const [selected, setSelected] = useState<PendingTenant | null>(null);
  const [seeding, setSeeding] = useState<string | null>(null);

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

    if (status === "approved" && tenant?.owner_user_id) {
      try {
        const { data: ownerPerfil } = await supabase
          .from("perfis")
          .select("email, nome_completo")
          .eq("id", tenant.owner_user_id)
          .maybeSingle();
        if (ownerPerfil?.email) {
          const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
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
          if (mailErr) {
            console.warn("E-mail de aprovação não enviado:", mailErr.message);
          } else {
            toast({ title: "E-mail de aprovação enviado" });
          }
        }
      } catch (e) {
        console.error("Failed to send approval email", e);
      }
    }
    setSelected(null);
    void load();
  };

  const seedAlunos = async (slug: string) => {
    setSeeding(slug);
    const { error } = await supabase.functions.invoke("seed-alunos-demo", { body: { slug } });
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
    toast({ title: "Credenciais copiadas" });
  };

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return tenants.filter((x) => {
      if (filter === "pending" && x.status !== "pending") return false;
      if (filter === "approved" && x.status !== "approved") return false;
      if (filter === "other" && ["pending", "approved"].includes(x.status)) return false;
      if (!t) return true;
      return (
        x.nome.toLowerCase().includes(t) ||
        x.slug.toLowerCase().includes(t) ||
        (x.tagline || "").toLowerCase().includes(t)
      );
    });
  }, [tenants, q, filter]);

  const counts = useMemo(() => ({
    all: tenants.length,
    pending: tenants.filter((t) => t.status === "pending").length,
    approved: tenants.filter((t) => t.status === "approved").length,
    other: tenants.filter((t) => !["pending", "approved"].includes(t.status)).length,
  }), [tenants]);

  if (isLoading || !isAdmin)
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 sticky top-0 bg-black/95 backdrop-blur z-10 border-b border-white/10">
        <AdminBackButton to="/" className="w-10 h-10 rounded-full bg-secondary" />
        <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl leading-none truncate">COACHES</h1>
          <p className="text-[10px] uppercase tracking-widest text-primary mt-1">
            {filtrados.length} {filtrados.length === 1 ? "coach" : "coaches"}
          </p>
        </div>
      </header>

      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar coach..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 bg-secondary/60 border-border"
          />
        </div>
      </div>

      <div className="px-5 pb-4 flex flex-wrap gap-2">
        {([
          ["all", "Todos", counts.all],
          ["pending", "Pendentes", counts.pending],
          ["approved", "Aprovados", counts.approved],
          ["other", "Outros", counts.other],
        ] as const).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full border transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      <main className="px-5 pb-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">Nenhum coach encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtrados.map((t) => {
              const color = colorFor(t.id);
              const initials = getInitials(t.nome);
              const photo = t.foto_url || t.logo_url || t.hero_url;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-secondary/40 border border-border hover:border-primary/60 transition-colors text-left"
                >
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${
                      t.status === "approved" ? "text-emerald-400" :
                      t.status === "pending" ? "text-amber-400" : "text-muted-foreground"
                    }`}>
                      {t.status === "approved" ? "Aprovado" : t.status === "pending" ? "Pendente" : t.status}
                    </span>
                  </div>

                  {photo ? (
                    <img src={photo} alt={t.nome} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="font-display text-6xl md:text-7xl tracking-tight"
                        style={{ color, textShadow: `0 0 18px ${color}55` }}
                      >
                        {initials}
                      </span>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                    <p className="font-semibold text-sm text-foreground truncate">{t.nome}</p>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">/{t.slug}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl uppercase flex items-center gap-2 flex-wrap">
                  {selected.nome}
                  <Badge variant="outline" className="text-xs">/{selected.slug}</Badge>
                  {selected.stripe_onboarding_completed ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Stripe ✓</Badge>
                  ) : (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-400">Stripe pendente</Badge>
                  )}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {(selected.foto_url || selected.logo_url || selected.hero_url) && (
                  <img
                    src={selected.foto_url || selected.logo_url || selected.hero_url!}
                    alt={selected.nome}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                )}
                {selected.tagline && <p className="text-sm text-muted-foreground">{selected.tagline}</p>}
                {selected.bio && <p className="text-sm text-foreground/80 whitespace-pre-wrap">{selected.bio}</p>}
                {selected.especialidades && selected.especialidades.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selected.especialidades.map((e) => (
                      <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  {selected.status !== "approved" && (
                    <Button size="sm" onClick={() => setStatus(selected.id, "approved")} className="bg-emerald-600 hover:bg-emerald-700">
                      <Check className="mr-1 h-4 w-4" /> Aprovar
                    </Button>
                  )}
                  {selected.status === "approved" ? (
                    <Button size="sm" variant="outline" onClick={() => setStatus(selected.id, "suspended")}>
                      Suspender
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setStatus(selected.id, "rejected")}>
                      <X className="mr-1 h-4 w-4" /> Rejeitar
                    </Button>
                  )}
                </div>

                {selected.status === "approved" && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Link to={`/${selected.slug}/admin`}>
                      <Button size="sm" variant="outline" className="border-primary/40">
                        <Sparkles className="mr-1 h-3 w-3" /> Painel do Coach
                      </Button>
                    </Link>
                    <Link to={`/${selected.slug}`} target="_blank">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="mr-1 h-3 w-3" /> Landing
                      </Button>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => seedAlunos(selected.slug)} disabled={seeding === selected.slug}>
                      {seeding === selected.slug ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      ) : (
                        <Users className="mr-1 h-3 w-3" />
                      )}
                      Popular alunos demo
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyCreds(selected.slug)}>
                      <Copy className="mr-1 h-3 w-3" /> Credenciais aluno
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
