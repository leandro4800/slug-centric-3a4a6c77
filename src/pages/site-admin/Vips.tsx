import { useEffect, useState } from "react";
import { Crown, Loader2, UserPlus, Copy, Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/invoke-edge-function";

type Vip = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
};

type Atleta = { id: string; nome_completo: string | null; email: string | null };

const Vips = () => {
  const { tenant } = useSiteTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vips, setVips] = useState<Vip[]>([]);
  const [elenco, setElenco] = useState<Atleta[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [observacao, setObservacao] = useState("");
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string } | null>(null);

  const isPlatformOwner = tenant?.slug === "alphateam";

  const load = async () => {
    setLoading(true);
    const { data: vipData } = await supabase
      .from("vips_plataforma" as any)
      .select("id, nome, email, telefone, observacao, ativo, created_at")
      .order("created_at", { ascending: false });
    setVips((vipData as unknown as Vip[]) || []);

    if (tenant?.id) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("tenant_id", tenant.id)
        .eq("role", "aluno");
      const ids = (roles || []).map((r: any) => r.user_id);
      if (ids.length) {
        const { data: perfis } = await supabase
          .from("perfis")
          .select("id, nome_completo, email")
          .in("id", ids)
          .order("nome_completo");
        setElenco((perfis as unknown as Atleta[]) || []);
      } else {
        setElenco([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [tenant?.id]);

  const handleCreate = async () => {
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e email");
      return;
    }
    setSaving(true);
    try {
      const res = await invokeEdgeFunction<any>("site-create-vip", {
        nome: nome.trim(), email: email.trim(), telefone: telefone.trim(), observacao: observacao.trim(),
      });
      setLastCreated({ email: email.trim(), password: res.password });
      toast.success(`VIP liberado — senha: ${res.password}`);
      setNome(""); setEmail(""); setTelefone(""); setObservacao("");
      void load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (vip: Vip) => {
    const { error } = await supabase
      .from("vips_plataforma" as any)
      .update({ ativo: !vip.ativo })
      .eq("id", vip.id);
    if (error) return toast.error(error.message);
    void load();
  };

  const remover = async (vip: Vip) => {
    if (!confirm(`Remover ${vip.nome} da lista de VIPs? O acesso dele no app não será apagado.`)) return;
    const { error } = await supabase.from("vips_plataforma" as any).delete().eq("id", vip.id);
    if (error) return toast.error(error.message);
    toast.success("VIP removido da lista");
    void load();
  };

  if (!isPlatformOwner) {
    return (
      <div className="min-h-screen bg-black px-5 md:px-8 pt-6 pb-32">
        <h1 className="font-display text-3xl text-white">ACESSO RESTRITO</h1>
        <p className="text-sm text-muted-foreground mt-2">Somente o administrador da plataforma pode gerenciar VIPs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-5 md:px-8 pt-6 pb-32">
      <div className="flex items-center gap-2 text-primary/80">
        <Crown className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Plataforma</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">VIPS</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Libere acesso livre no Alphateam para divulgadores do Alpha Coach Pro — a senha é gerada no padrão{" "}
        <strong>primeiro nome + 2026</strong>. O elenco atual de atletas permanece intacto.
      </p>
      <div className="h-px bg-primary/20 mb-6" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl text-primary uppercase tracking-wider">Liberar VIP</h2>
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: João Silva" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vip@email.com" />
          </div>
          <div className="space-y-2">
            <Label>Telefone (opcional)</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <div className="space-y-2">
            <Label>Observação (opcional)</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Ex: atleta divulgador / parceria de mídia" />
          </div>
          <Button onClick={handleCreate} disabled={saving} className="bg-gradient-primary w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Liberar acesso VIP
          </Button>

          {lastCreated && (
            <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-1 text-sm">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Credenciais geradas</p>
              <p className="font-mono">{lastCreated.email}</p>
              <p className="font-mono">{lastCreated.password}</p>
              <button
                className="text-xs text-primary flex items-center gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(`Login: ${lastCreated.email}\nSenha: ${lastCreated.password}\nLink: https://alpha-coach.app/alphateam`);
                  toast.success("Copiado");
                }}
              >
                <Copy className="h-3 w-3" /> Copiar credenciais e link
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-3">
            <h2 className="font-display text-xl text-primary uppercase tracking-wider">VIPs ativos</h2>
            {loading ? (
              <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : vips.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum VIP cadastrado ainda.</p>
            ) : (
              <div className="space-y-2">
                {vips.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 border border-white/10 rounded-xl p-3">
                    <Crown className={`h-4 w-4 ${v.ativo ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold truncate">{v.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{v.email}</p>
                      {v.observacao && <p className="text-[11px] text-muted-foreground/70 truncate">{v.observacao}</p>}
                    </div>
                    <button
                      onClick={() => toggleAtivo(v)}
                      className="text-[9px] uppercase tracking-widest text-muted-foreground hover:text-primary"
                    >
                      {v.ativo ? "Ativo" : "Inativo"}
                    </button>
                    <button onClick={() => remover(v)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-display text-xl text-primary uppercase tracking-wider">Elenco atual</h2>
            </div>
            {loading ? (
              <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
            ) : elenco.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atleta no elenco.</p>
            ) : (
              <div className="space-y-1 max-h-72 overflow-auto pr-1">
                {elenco.map((a) => (
                  <div key={a.id} className="flex items-center justify-between border border-white/5 rounded-lg px-3 py-2">
                    <p className="text-sm truncate">{a.nome_completo || a.email}</p>
                    <p className="text-[11px] text-muted-foreground truncate ml-3">{a.email}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vips;
