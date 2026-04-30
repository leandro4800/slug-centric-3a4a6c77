import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/lib/body-metrics";

interface Plano {
  id: string;
  nome: string;
  descricao: string | null;
  preco_centavos: number;
  intervalo: "mensal" | "trimestral" | "anual";
  stripe_price_id: string | null;
  ativo: boolean;
  ordem: number;
}

export default function AdminPlanos() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // form
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoReais, setPrecoReais] = useState("");
  const [intervalo, setIntervalo] = useState<"mensal" | "trimestral" | "anual">("mensal");

  useEffect(() => {
    if (isLoading) return;
    if (!user) return navigate("/login");
    void load();
  }, [user, isLoading, slug]);

  const load = async () => {
    if (!user || !slug) return;
    setLoading(true);
    const { data: t } = await supabase
      .from("tenants")
      .select("id")
      .eq("slug", slug)
      .eq("owner_user_id", user.id)
      .maybeSingle();
    if (!t) {
      toast({ title: "Acesso negado", variant: "destructive" });
      navigate("/");
      return;
    }
    setTenantId(t.id);
    const { data: p } = await supabase
      .from("planos")
      .select("*")
      .eq("tenant_id", t.id)
      .order("ordem");
    setPlanos((p as Plano[]) ?? []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;
    setBusy(true);
    try {
      const centavos = Math.round(parseFloat(precoReais) * 100);
      const { data, error } = await supabase
        .from("planos")
        .insert({
          tenant_id: tenantId,
          nome,
          descricao,
          preco_centavos: centavos,
          intervalo,
          ordem: planos.length,
        })
        .select()
        .single();
      if (error) throw error;

      // Cria no Stripe
      const { error: fnErr } = await supabase.functions.invoke("stripe-create-plan", {
        body: { plano_id: data.id },
      });
      if (fnErr) throw fnErr;

      toast({ title: "Plano criado!" });
      setNome("");
      setDescricao("");
      setPrecoReais("");
      void load();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from("planos").update({ ativo }).eq("id", id);
    void load();
  };

  const remover = async (id: string) => {
    if (!confirm("Remover este plano?")) return;
    await supabase.from("planos").delete().eq("id", id);
    void load();
  };

  if (isLoading || loading) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 md:px-8">
          <Link to={`/${slug}/admin`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <h1 className="font-display text-xl uppercase">Meus planos</h1>
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 md:px-8">
        {/* Criar plano */}
        <section className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="mb-4 font-display text-xl uppercase">Novo plano</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Plano Premium" required />
            </div>
            <div>
              <Label>Intervalo</Label>
              <Select value={intervalo} onValueChange={(v: any) => setIntervalo(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={precoReais}
                onChange={(e) => setPrecoReais(e.target.value)}
                placeholder="199.90"
                required
              />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição</Label>
              <Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busy} className="bg-primary hover:bg-primary/90">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-2 h-4 w-4" /> Criar plano</>}
              </Button>
            </div>
          </form>
        </section>

        {/* Lista */}
        <section>
          <h2 className="mb-4 font-display text-xl uppercase">Planos ativos</h2>
          {planos.length === 0 ? (
            <p className="text-muted-foreground">Nenhum plano ainda.</p>
          ) : (
            <div className="space-y-3">
              {planos.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-lg uppercase">{p.nome}</h3>
                      <Badge variant="outline" className="text-xs">{p.intervalo}</Badge>
                      {p.stripe_price_id ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Stripe ✓</Badge>
                      ) : (
                        <Badge variant="outline" className="border-amber-500/40 text-amber-400 text-xs">Sem Stripe</Badge>
                      )}
                    </div>
                    <p className="text-2xl font-display">{formatBRL(p.preco_centavos)}</p>
                    {p.descricao && <p className="text-sm text-muted-foreground">{p.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={p.ativo} onCheckedChange={(v) => toggleAtivo(p.id, v)} />
                      <span className="text-xs text-muted-foreground">{p.ativo ? "Ativo" : "Inativo"}</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remover(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
