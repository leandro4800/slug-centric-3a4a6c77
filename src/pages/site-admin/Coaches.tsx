import { useEffect, useState } from "react";
import { ShieldCheck, Loader2, UserPlus, ExternalLink, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { invokeEdgeFunction } from "@/lib/invoke-edge-function";

type Parceiro = {
  id: string;
  nome: string;
  slug: string;
  is_partner: boolean;
  free_access: boolean;
  logo_url: string | null;
};

const Coaches = () => {
  const { tenant } = useSiteTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [slug, setSlug] = useState("");
  const [lastCreated, setLastCreated] = useState<{ email: string; password: string; slug: string } | null>(null);

  const isPlatformOwner = tenant?.slug === "alphateam";

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tenants")
      .select("id, nome, slug, is_partner, free_access, logo_url")
      .or("is_partner.eq.true,free_access.eq.true")
      .order("nome");
    setParceiros((data as Parceiro[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const handleCreate = async () => {
    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e email");
      return;
    }
    setSaving(true);
    try {
      const res = await invokeEdgeFunction<any>("site-create-coach", {
        nome: nome.trim(), email: email.trim(), telefone: telefone.trim(), slug: slug.trim(),
      });
      setLastCreated({ email: email.trim(), password: res.password, slug: res.slug });
      toast.success(`Coach parceiro criado — senha: ${res.password}`);
      setNome(""); setEmail(""); setTelefone(""); setSlug("");
      void load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isPlatformOwner) {
    return (
      <div className="min-h-screen bg-black px-5 md:px-8 pt-6 pb-32">
        <h1 className="font-display text-3xl text-white">ACESSO RESTRITO</h1>
        <p className="text-sm text-muted-foreground mt-2">Somente o administrador da plataforma pode cadastrar coaches.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-5 md:px-8 pt-6 pb-32">
      <div className="flex items-center gap-2 text-primary/80">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Plataforma</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">COACHES PARCEIROS</h1>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        Cadastre coaches parceiros — a senha é gerada automaticamente no padrão <strong>primeiro nome + 2026</strong> e o time entra sem cobrança de planos.
      </p>
      <div className="h-px bg-primary/20 mb-6" />

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-4">
          <h2 className="font-display text-xl text-primary uppercase tracking-wider">Cadastrar coach</h2>
          <div className="space-y-2">
            <Label>Nome do coach / time</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Pedro Passos Team" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="coach@email.com" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Telefone (opcional)</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-2">
              <Label>Slug do link (opcional)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="pedropassosteam" />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={saving} className="bg-gradient-primary w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Cadastrar coach parceiro
          </Button>

          {lastCreated && (
            <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-1 text-sm">
              <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Credenciais geradas</p>
              <p className="font-mono">{lastCreated.email}</p>
              <p className="font-mono">{lastCreated.password}</p>
              <button
                className="text-xs text-primary flex items-center gap-1"
                onClick={() => {
                  navigator.clipboard.writeText(`Login: ${lastCreated.email}\nSenha: ${lastCreated.password}\nLink: https://alpha-coach.app/${lastCreated.slug}`);
                  toast.success("Copiado");
                }}
              >
                <Copy className="h-3 w-3" /> Copiar credenciais e link
              </button>
            </div>
          )}
        </div>

        <div className="bg-black/60 border border-white/10 rounded-2xl p-6 space-y-3">
          <h2 className="font-display text-xl text-primary uppercase tracking-wider">Parceiros ativos</h2>
          {loading ? (
            <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : parceiros.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {parceiros.map((p) => (
                <div key={p.id} className="flex items-center gap-3 border border-white/10 rounded-xl p-3">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.nome} className="h-9 w-9 object-contain" />
                  ) : (
                    <div className="h-9 w-9 rounded bg-white/5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">{p.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">/{p.slug}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {p.is_partner && <span className="text-[9px] uppercase tracking-widest text-primary">Parceiro</span>}
                    {p.free_access && <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Sem plano</span>}
                  </div>
                  <a href={`/${p.slug}?preview=1`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-primary">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Coaches;
