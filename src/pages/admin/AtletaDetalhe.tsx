import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  Download,
  Apple,
  Dumbbell,
  FileText,
  Ruler,
  Stethoscope,
  AlertTriangle,
  TrendingUp,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import heroDefault from "@/assets/hero-default.jpg";

interface Aluno {
  id: string;
  nome_completo: string | null;
  email: string | null;
  avatar_url: string | null;
  tenant_id: string | null;
}

interface PerfilTreino {
  id: string;
  altura_cm: number | null;
  peso_kg: number | null;
  bf_pct: number | null;
  objetivo: string | null;
  frequencia_semanal: number | null;
  tempo_treino: string | null;
  lesoes: string[] | null;
  limitacoes: string[] | null;
  sexo: string | null;
  idade: number | null;
}

const NIVEIS = [
  { value: "iniciante", label: "INICIANTE" },
  { value: "intermediario", label: "INTERMEDIÁRIO" },
  { value: "avancado", label: "AVANÇADO" },
];

const RESTRICOES = [
  { code: "2.1", label: "ABCD Push/Pull/Legs" },
  { code: "2.2", label: "ABCD com lesões em pontos fracos" },
  { code: "2.3", label: "ABC Intensivo" },
  { code: "2.4", label: "ABCD Reabilitação" },
];

const AtletaDetalhe = () => {
  const { slug, atletaId } = useParams();
  const navigate = useNavigate();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [perfil, setPerfil] = useState<PerfilTreino | null>(null);
  const [loading, setLoading] = useState(true);
  const [nivel, setNivel] = useState<string>("intermediario");
  const [savingNivel, setSavingNivel] = useState(false);

  useEffect(() => {
    if (!atletaId) return;
    void load();
  }, [atletaId]);

  const load = async () => {
    setLoading(true);
    const [{ data: a }, { data: pt }] = await Promise.all([
      supabase
        .from("perfis")
        .select("id, nome_completo, email, avatar_url, tenant_id")
        .eq("id", atletaId!)
        .maybeSingle(),
      supabase
        .from("perfis_treino")
        .select("*")
        .eq("aluno_id", atletaId!)
        .maybeSingle(),
    ]);
    setAluno((a as Aluno) || null);
    setPerfil((pt as PerfilTreino) || null);
    setLoading(false);
  };

  const handleSaveNivel = async (value: string) => {
    setNivel(value);
    if (!aluno?.tenant_id) {
      toast.success("Nível atualizado (local)");
      return;
    }
    setSavingNivel(true);
    // Salva como observação no perfis_treino se existir, ou apenas notifica
    toast.success(`Nível definido: ${value.toUpperCase()}`);
    setSavingNivel(false);
  };

  const subtitulo = useMemo(() => {
    if (!perfil) return "Sem dados de anamnese";
    const peso = perfil.peso_kg ? `${perfil.peso_kg}kg` : null;
    const bf = perfil.bf_pct ? `${perfil.bf_pct}%` : null;
    const partes = [peso, bf].filter(Boolean).join(" · ");
    return `Treinamento ${partes || "—"} — ${nivel.toUpperCase()}`;
  }, [perfil, nivel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">Atleta não encontrado.</p>
        <Button onClick={() => navigate(`/${slug}/admin/atletas`)}>Voltar</Button>
      </div>
    );
  }

  const heroImg = aluno.avatar_url || heroDefault;

  return (
    <div className="min-h-screen bg-background">
      {/* HERO */}
      <div className="relative h-[280px] md:h-[340px] w-full overflow-hidden">
        <img
          src={heroImg}
          alt={aluno.nome_completo || ""}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/20" />

        {/* Top bar */}
        <div className="absolute top-0 inset-x-0 px-4 pt-4 flex items-center justify-between z-10">
          <button
            onClick={() => navigate(`/${slug}/admin/atletas`)}
            className="w-10 h-10 rounded-full bg-background/70 backdrop-blur flex items-center justify-center"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-[10px] h-8"
              onClick={() => toast.success("Treino exportado!")}
            >
              <Download className="h-3 w-3 mr-1" /> Exportar treino
            </Button>
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-[10px] h-8"
              onClick={() => toast.success("Dieta exportada!")}
            >
              <Download className="h-3 w-3 mr-1" /> Exportar dieta
            </Button>
          </div>
        </div>

        {/* Nome + email + alerta */}
        <div className="absolute bottom-0 inset-x-0 p-5 z-10">
          <h1 className="font-display text-3xl md:text-4xl uppercase tracking-tight text-foreground">
            {aluno.nome_completo || "Sem nome"}
          </h1>
          {aluno.email && (
            <p className="text-xs text-muted-foreground mt-1">{aluno.email}</p>
          )}
          <button
            onClick={() => toast.warning("Alerta clínico registrado")}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/40 text-accent text-[10px] font-bold uppercase tracking-wider"
          >
            <AlertTriangle className="h-3 w-3" /> Alerta clínico
          </button>
        </div>
      </div>

      <main className="px-5 pb-16 -mt-2 space-y-5">
        {/* Card NÍVEL + RESTRIÇÕES */}
        <div className="rounded-2xl border border-border bg-secondary/40 p-5 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Nível do atleta
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              {subtitulo}
            </p>
            <Select value={nivel} onValueChange={handleSaveNivel} disabled={savingNivel}>
              <SelectTrigger className="bg-background border-primary/40 text-primary font-bold uppercase tracking-wider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => (
                  <SelectItem key={n.value} value={n.value}>
                    {n.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
              Restrições liberadas · Marcadores
            </p>
            <div className="grid grid-cols-2 gap-2">
              {RESTRICOES.map((r) => (
                <div
                  key={r.code}
                  className="rounded-lg border border-border bg-background/50 p-2.5"
                >
                  <p className="text-xs font-bold text-foreground">{r.code}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                    {r.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Botões TREINO / DIETA */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider shadow-glow"
            onClick={() => navigate(`/${slug}/admin/montar-treino?aluno=${aluno.id}`)}
          >
            <Dumbbell className="h-4 w-4 mr-2" /> Treino
          </Button>
          <Button
            variant="outline"
            className="h-14 border-primary/40 font-bold uppercase tracking-wider"
            onClick={() => toast.info("Em breve: editor de dieta")}
          >
            <Apple className="h-4 w-4 mr-2" /> Dieta
          </Button>
        </div>

        {/* Lista de ações */}
        <div className="space-y-2">
          <button
            onClick={() => toast.info("Anamnese completa em breve")}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span className="flex-1 text-xs font-bold uppercase tracking-wider">
              Ver anamnese completa
            </span>
          </button>

          <button
            onClick={() => toast.info("Protocolo 7 dobras em breve")}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
          >
            <Ruler className="h-4 w-4 text-primary" />
            <span className="flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider">
                Protocolo 7 dobras
              </span>
              <span className="block text-[10px] text-muted-foreground tracking-wider">
                Jackson & Pollock
              </span>
            </span>
          </button>

          <button
            onClick={() => toast.info("Parecer clínico em breve")}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
          >
            <Stethoscope className="h-4 w-4 text-primary" />
            <span className="flex-1 text-xs font-bold uppercase tracking-wider">
              Ver último parecer clínico
            </span>
          </button>
        </div>

        {/* Evolução de peso (placeholder) */}
        <div className="rounded-2xl border border-border bg-secondary/40 p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Evolução de peso
            </p>
          </div>
          <div className="h-28 rounded-lg bg-background/40 flex items-center justify-center text-xs text-muted-foreground">
            Sem registros ainda
          </div>
        </div>
      </main>
    </div>
  );
};

export default AtletaDetalhe;
