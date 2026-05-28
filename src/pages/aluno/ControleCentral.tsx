import { useEffect, useState } from "react";
import { ArrowLeft, Users, Palette, Plus, Headphones, Save, Pencil, Trash2, Star, Clapperboard, LayoutDashboard, Wallet, Video, CalendarClock, MapPin, Dumbbell, Apple, Settings, Stethoscope } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { toast } from "sonner";

interface Parceiro {
  id: string;
  nome: string;
  cupom: string | null;
  url: string | null;
  logo_url: string | null;
}

const ControleCentral = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const { user } = useAuth();
  const [playlist, setPlaylist] = useState("https://open.spotify.com/playlist/1kdeP");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [novoNome, setNovoNome] = useState("");
  const [novoCupom, setNovoCupom] = useState("");
  const [novoUrl, setNovoUrl] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!user) return setIsSuperAdmin(false);
      // Verifica se é super admin global (admin sem tenant_id)
      const { data } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .is("tenant_id", null)
        .maybeSingle();
      setIsSuperAdmin(Boolean(data));
    };
    void check();
  }, [user]);

  const loadParceiros = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from("parceiros" as any)
      .select("id, nome, cupom, url, logo_url")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .order("ordem")
      .order("created_at");
    setParceiros((data as unknown as Parceiro[]) || []);
  };

  useEffect(() => { void loadParceiros(); }, [tenant?.id]);

  const addParceiro = async () => {
    if (!tenant?.id || !novoNome.trim()) return;
    const { error } = await supabase.from("parceiros" as any).insert({
      tenant_id: tenant.id,
      nome: novoNome.trim(),
      cupom: novoCupom.trim() || null,
      url: novoUrl.trim() || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Parceiro adicionado");
    setNovoNome(""); setNovoCupom(""); setNovoUrl(""); setShowAdd(false);
    void loadParceiros();
  };

  const removeParceiro = async (id: string) => {
    if (!confirm("Remover parceiro?")) return;
    const { error } = await supabase.from("parceiros" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    void loadParceiros();
  };

  return (
    <div className="px-5 pt-6 pb-32 bg-black min-h-screen">
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/${slug}/app`)}
          className="flex items-center gap-2 text-primary text-sm font-semibold uppercase tracking-widest hover:brightness-125 transition-all"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        
        <Link 
          to={`/${slug}/admin/aparencia?tab=aparencia`}
          className="w-10 h-10 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-all group shadow-glow-sm"
          title="Configurações e Identidade Visual"
        >
          <Settings className="h-5 w-5 group-hover:rotate-90 transition-transform duration-500" />
        </Link>
      </div>

      {isSuperAdmin && (
        <Link
          to="/admin/coaches"
          className="mt-4 flex items-center gap-3 bg-gradient-primary text-primary-foreground rounded-none px-4 py-3 shadow-glow"
        >
          <LayoutDashboard className="h-5 w-5" />
          <div className="flex-1">
            <p className="font-display text-base leading-tight">VOLTAR AO PAINEL ADMIN</p>
            <p className="text-[10px] uppercase tracking-widest opacity-80">Super admin Alpha Coach</p>
          </div>
          <span>→</span>
        </Link>
      )}

      <div className="flex items-center gap-2 mt-8 text-primary/80">
        <Clapperboard className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Produção Original</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">
        CONTROLE CENTRAL: <span className="text-primary">{(tenant?.nome || "TIME").toUpperCase()}</span>
      </h1>
      <div className="h-px bg-primary/20 mt-3" />

      <div className="grid grid-cols-3 gap-3 mt-8 mb-6">
        <Link
          to={`/${slug}/admin/atleta/${user?.id}?action=generate-training`}
          className="flex flex-col items-center justify-center p-4 rounded-none bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all group"
        >
          <Dumbbell className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary text-center leading-tight">Montar Meu Treino</span>
        </Link>
        <Link
          to={`/${slug}/admin/atleta/${user?.id}?action=generate-diet`}
          className="flex flex-col items-center justify-center p-4 rounded-none bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all group"
        >
          <Apple className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary text-center leading-tight">Montar Minha Dieta</span>
        </Link>
        <Link
          to={`/${slug}/admin/atleta/${user?.id}`}
          className="flex flex-col items-center justify-center p-4 rounded-none bg-primary/10 border border-primary/30 hover:bg-primary/20 transition-all group"
        >
          <Stethoscope className="h-6 w-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-primary text-center leading-tight">Minha Avaliação</span>
        </Link>
      </div>

      <div className="space-y-4">
        <Link
          to={`/${slug}/admin/atletas`}
          className="block bg-card/40 border border-white/10 rounded-none p-4 flex items-center gap-4 hover:border-primary/50 transition-all group"
        >
          <div className="w-12 h-12 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
            {isSuperAdmin ? <LayoutDashboard className="h-5 w-5 text-primary" /> : <Users className="h-5 w-5 text-primary" />}
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-white group-hover:text-primary transition-all">{isSuperAdmin ? "PAINEL ADMIN" : "GERENCIAR ELENCO"}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {isSuperAdmin ? "Controle de coaches e tenants" : "Atletas da equipe"}
            </p>
          </div>
          <span className="text-primary">→</span>
        </Link>

        <Link
          to={`/${slug}/admin/agenda-presencial`}
          className="block bg-card/40 border border-white/10 rounded-none p-4 flex items-center gap-4 hover:border-primary/50 transition-all group"
        >
          <div className="w-12 h-12 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
            <MapPin className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-white group-hover:text-primary transition-all">AGENDA PRESENCIAL</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Cadastrar horários e locais para os alunos</p>
          </div>
          <span className="text-primary">→</span>
        </Link>


        <Link
          to={`/${slug}/admin/faturamento`}
          className="block bg-card/40 border border-white/10 rounded-none p-4 flex items-center gap-4 hover:border-primary/50 transition-all group"
        >
          <div className="w-12 h-12 rounded-none bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-all">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-white group-hover:text-primary transition-all">FATURAMENTO</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Gestão financeira e saques</p>
          </div>
          <span className="text-primary">→</span>
        </Link>

        <Link
          to={`/${slug}/admin/vlogs`}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-display text-xl rounded-none shadow-glow flex items-center justify-center gap-3 h-14"
        >
          <Plus className="h-5 w-5" /> LANÇAR NOVO EPISÓDIO (VLOG)
        </Link>

        <Link
          to={`/${slug}/admin/videos-tecnicos`}
          className="bg-zinc-900 border border-white/10 hover:border-primary/50 text-white font-display text-xl rounded-none flex items-center justify-center gap-3 h-14 transition-all"
        >
          <Video className="h-5 w-5 text-primary" /> VÍDEOS TÉCNICOS
        </Link>

        <div className="bg-card/40 border border-white/10 rounded-none p-4">
          <div className="flex items-center gap-2 mb-3">
            <Headphones className="h-5 w-5 text-primary" />
            <p className="font-display text-base text-white">PLAYLIST DO TREINO</p>
          </div>
          <div className="flex gap-2">
            <input
              value={playlist}
              onChange={(e) => setPlaylist(e.target.value)}
              className="flex-1 bg-black border border-white/10 rounded-none px-3 py-2.5 text-sm focus:border-primary/50 outline-none transition-all"
            />
            <Button className="w-12 h-12 p-0" variant="default">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-card/40 border border-white/10 rounded-none p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-primary fill-primary" />
              <p className="font-display text-base text-white">PARCEIROS ELITE</p>
            </div>
            <button
              onClick={() => setShowAdd((v) => !v)}
              className="w-9 h-9 rounded-none bg-primary/20 border border-primary/40 flex items-center justify-center hover:bg-primary/30 transition-all"
            >
              <Plus className="h-4 w-4 text-primary" />
            </button>
          </div>

          {showAdd && (
            <div className="space-y-2 mb-4 p-3 border border-primary/30 bg-black/40">
              <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do parceiro"
                className="w-full bg-black border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary/50" />
              <input value={novoCupom} onChange={(e) => setNovoCupom(e.target.value)} placeholder="Cupom (opcional)"
                className="w-full bg-black border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary/50" />
              <input value={novoUrl} onChange={(e) => setNovoUrl(e.target.value)} placeholder="URL (opcional)"
                className="w-full bg-black border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary/50" />
              <Button onClick={addParceiro} className="w-full">Salvar parceiro</Button>
            </div>
          )}

          <div className="space-y-3">
            {parceiros.length === 0 && !showAdd && (
              <p className="text-xs text-muted-foreground text-center py-2">Nenhum parceiro cadastrado.</p>
            )}
            {parceiros.map((p) => (
              <div key={p.id} className="flex items-center gap-3 bg-black/50 border border-white/5 rounded-none p-3">
                <div className="w-12 h-12 rounded-none bg-secondary flex items-center justify-center text-[10px] font-bold border border-white/10 uppercase overflow-hidden">
                  {p.logo_url ? <img src={p.logo_url} alt={p.nome} className="w-full h-full object-cover" /> : p.nome.split(" ")[0]?.slice(0, 4)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-white truncate">{p.nome}</p>
                  {p.cupom && <p className="text-[10px] text-primary uppercase font-bold tracking-widest">CUPOM: {p.cupom}</p>}
                </div>
                <button onClick={() => removeParceiro(p.id)} className="w-9 h-9 flex items-center justify-center text-red-500/60 hover:text-red-500 transition-all">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ControleCentral;