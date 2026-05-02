import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { DEMO_ATHLETES, DEMO_ATHLETE_EMAILS } from "@/lib/demoAthletes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Search, Users, Mail, AlertTriangle, MessageSquare, Send, ChevronRight } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
}

// Paleta inspirada na referência (cada inicial em uma cor neon)
const NEON_COLORS = [
  "#F5C518", // amarelo
  "#22D3EE", // ciano
  "#A78BFA", // roxo claro
  "#F472B6", // rosa
  "#34D399", // verde
  "#60A5FA", // azul
  "#FB923C", // laranja
  "#E11D48", // vermelho/rosa
];

const colorFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return NEON_COLORS[h % NEON_COLORS.length];
};

const getInitials = (a: Aluno) => {
  const src = (a.nome_completo || a.email || "?").trim();
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
};

const MeusAtletas = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { tenant } = useBranding();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [alertas, setAlertas] = useState<any[]>([]);
  const [qaOpen, setQaOpen] = useState(false);
  const [pregunta, setPregunta] = useState("");
  const [resposta, setResposta] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  useEffect(() => {
    if (tenant) {
      void loadAlertas(tenant.id);
    }
  }, [tenant]);

  const loadAlertas = async (tenantId: string) => {
    const { data } = await supabase
      .from('analises_clinicas')
      .select('id, motivo_alerta, created_at, perfis(nome_completo)')
      .eq('alerta_critico', true)
      .order('created_at', { ascending: false })
      .limit(5);
    setAlertas(data || []);
  };

  const handleAskIA = async () => {
    if (!pregunta.trim()) return;
    setIsAsking(true);
    try {
      const { data, error } = await supabase.functions.invoke('theme-ai', {
        body: { 
          prompt: `Como especialista na Metodologia Pacholok e no material Anabolismo Total, responda à pergunta do Coach Admin: "${pregunta}". Cite módulos específicos se possível.`,
          system: "Você é o assistente técnico Alpha Coach. Use a base de conhecimento do Pacholok e do Anabolismo Total para responder tecnicamente."
        }
      });
      if (error) throw error;
      setResposta(data.reply);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao consultar base de conhecimento");
    } finally {
      setIsAsking(false);
    }
  };

  useEffect(() => {
    if (!tenant && slug === "demo") {
      setAlunos(DEMO_ATHLETES as unknown as Aluno[]);
      setLoading(false);
      return;
    }
    if (!tenant) return;
    void load(tenant.id);
  }, [tenant, slug]);

  const load = async (tenantId: string) => {
    setLoading(true);
    if (slug === "demo") {
      setAlunos(DEMO_ATHLETES as unknown as Aluno[]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("perfis")
      .select("id, nome_completo, email, avatar_url")
      .eq("tenant_id", tenantId)
      .order("nome_completo", { ascending: true });

    const atletasBanco = ((data as Aluno[]) || []).filter((a) => !DEMO_ATHLETE_EMAILS.has(a.email || ""));
    const atletas = slug === "demo" ? [...DEMO_ATHLETES, ...atletasBanco] : atletasBanco;

    if (error && slug !== "demo") console.error("[MeusAtletas] Error loading profiles:", error);
    setAlunos(atletas as Aluno[]);
    setLoading(false);
  };

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return alunos;
    return alunos.filter(
      (a) =>
        (a.nome_completo || "").toLowerCase().includes(t) ||
        (a.email || "").toLowerCase().includes(t),
    );
  }, [alunos, q]);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3 sticky top-0 bg-black/95 backdrop-blur z-10 border-b border-white/10">
        <AdminBackButton 
          className="w-10 h-10 rounded-full bg-secondary"
        />
        <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center">
          <Users className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-2xl leading-none truncate">MEUS ATLETAS</h1>
          <p className="text-[10px] uppercase tracking-widest text-primary mt-1">
            {filtrados.length} {filtrados.length === 1 ? "atleta" : "atletas"}
          </p>
        </div>
      </header>

      {/* Search */}
      <div className="px-5 pb-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar atleta..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 bg-secondary/60 border-border"
          />
        </div>
      </div>

      {/* Alertas Críticos */}
      {alertas.length > 0 && (
        <div className="px-5 mb-4">
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 animate-pulse">
            <div className="flex items-center gap-2 text-red-500 mb-2">
              <AlertTriangle className="h-5 w-5" />
              <h2 className="font-display text-sm uppercase font-bold tracking-wider">RISCO CRÍTICO DETECTADO</h2>
            </div>
            <div className="space-y-2">
              {alertas.map((alerta) => (
                <div key={alerta.id} className="text-[11px] text-red-200/80 flex justify-between items-center border-b border-red-500/10 pb-1 last:border-0">
                  <span>{alerta.perfis?.nome_completo}: {alerta.motivo_alerta}</span>
                  <span className="text-[9px] opacity-60">{new Date(alerta.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IA Knowledge QA */}
      <div className="px-5 mb-6">
        <button 
          onClick={() => setQaOpen(!qaOpen)}
          className="w-full bg-primary/10 border border-primary/30 rounded-2xl p-4 flex items-center justify-between hover:bg-primary/20 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <h3 className="font-display text-sm uppercase">CONSULTAR METODOLOGIA</h3>
              <p className="text-[10px] text-muted-foreground uppercase">Pergunte à Dr. IA sobre o Pacholok ou Saúde</p>
            </div>
          </div>
          <ChevronRight className={`h-5 w-5 text-primary transition-transform ${qaOpen ? 'rotate-90' : ''}`} />
        </button>
        
        {qaOpen && (
          <div className="mt-3 bg-card border border-border rounded-2xl p-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex gap-2">
              <Input 
                placeholder="Ex: O que o Pacholok diz sobre Dorsal?" 
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAskIA()}
                className="bg-secondary/40"
              />
              <Button onClick={handleAskIA} disabled={isAsking} size="icon">
                {isAsking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            {resposta && (
              <ScrollArea className="mt-4 h-40 rounded-lg bg-secondary/20 p-3">
                <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{resposta}</p>
              </ScrollArea>
            )}
          </div>
        )}
      </div>

      <main className="px-5 pb-16">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">Nenhum atleta encontrado.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filtrados.map((a) => {
              const color = colorFor(a.id);
              const initials = getInitials(a);
              const hasPhoto = !!a.avatar_url;
              return (
                <Link
                  key={a.id}
                  to={`/${slug}/admin/atleta/${a.id}`}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-secondary/40 border border-border hover:border-primary/60 transition-colors"
                >
                  {/* Badge AGENDADO */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-primary">
                      Agendado
                    </span>
                    <span className="w-5 h-5 rounded-full bg-primary/90 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />
                    </span>
                  </div>

                  {/* Conteúdo central: foto ou iniciais */}
                  {hasPhoto ? (
                    <img
                      src={a.avatar_url!}
                      alt={a.nome_completo || ""}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="font-display text-6xl md:text-7xl tracking-tight"
                        style={{
                          color,
                          textShadow: `0 0 18px ${color}55`,
                        }}
                      >
                        {initials}
                      </span>
                    </div>
                  )}

                  {/* Overlay inferior com nome */}
                  <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                    <p className="font-semibold text-sm text-foreground truncate">
                      {a.nome_completo || "Sem nome"}
                    </p>
                    {a.email && (
                      <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <Mail className="h-2.5 w-2.5" /> {a.email}
                      </p>
                    )}
                  </div>

                  {/* Indicador inferior direito */}
                  <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-background/70 backdrop-blur flex items-center justify-center border border-border/60">
                    <span className="block w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!loading && (
          <div className="mt-6">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => tenant && load(tenant.id)}
            >
              Atualizar lista
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default MeusAtletas;
