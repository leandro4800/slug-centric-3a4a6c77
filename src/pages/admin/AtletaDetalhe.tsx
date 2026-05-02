import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DEMO_ATHLETES } from "@/lib/demoAthletes";
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
  Upload,
  Apple,
  Dumbbell,
  FileText,
  Ruler,
  Stethoscope,
  AlertTriangle,
  TrendingUp,
  Camera,
  Sparkles,
  ShieldAlert,
} from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import JacksonPollockCalculator from "@/components/admin/JacksonPollockCalculator";
import { SevenDobrasIntro } from "@/components/admin/SevenDobrasIntro";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { AnamneseDetails } from "@/components/aluno/AnamneseDetails";
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

interface Assinatura {
  id: string;
  status: string;
  plano: {
    nome: string;
    preco_centavos: number;
    intervalo: string;
  };
}

const NIVEIS = [
  { value: "iniciante", label: "INICIANTE" },
  { value: "intermediario", label: "INTERMEDIÁRIO" },
  { value: "avancado", label: "AVANÇADO" },
  { value: "alto_nivel", label: "ATLETA DE ALTO NÍVEL" },
];

const NIVEL_TO_TEMPO: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
  alto_nivel: "Atleta de Alto Nível",
};

const TEMPO_TO_NIVEL = (t: string | null | undefined): string => {
  if (!t) return "intermediario";
  const s = t.toLowerCase();
  if (s.includes("alto")) return "alto_nivel";
  if (s.includes("avan")) return "avancado";
  if (s.includes("inter")) return "intermediario";
  if (s.includes("inici")) return "iniciante";
  return "intermediario";
};

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
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [loading, setLoading] = useState(true);
  const [nivel, setNivel] = useState<string>("intermediario");
  const [savingNivel, setSavingNivel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"treino" | "dieta">("treino");
  const [protocolResult, setProtocolResult] = useState<string | null>(null);
  const [isGeneratingProtocol, setIsGeneratingProtocol] = useState(false);
  const [showProtocolDialog, setShowProtocolDialog] = useState(false);
  const [open7Dobras, setOpen7Dobras] = useState(false);
  const [show7DobrasIntro, setShow7DobrasIntro] = useState(false);
  const [anamnese, setAnamnese] = useState<any>(null);
  const [showAnamneseDialog, setShowAnamneseDialog] = useState(false);
  const [loadingAnamnese, setLoadingAnamnese] = useState(false);

  useEffect(() => {
    if (!atletaId) return;
    void load();
  }, [atletaId]);

  const load = async () => {
    setLoading(true);
    const demoAthlete = DEMO_ATHLETES.find((athlete) => athlete.id === atletaId);
    if (slug === "demo" && demoAthlete) {
      setAluno(demoAthlete as Aluno);
      setPerfil(null);
      setAssinatura(null);
      setLoading(false);
      return;
    }

    const [{ data: a }, { data: pt }, { data: ass }, { data: ana }] = await Promise.all([
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
      supabase
        .from("assinaturas")
        .select(`
          id,
          status,
          plano:planos (
            nome,
            preco_centavos,
            intervalo
          )
        `)
        .eq("aluno_id", atletaId!)
        .maybeSingle(),
      supabase
        .from("anamnese_aluno")
        .select("*")
        .eq("aluno_id", atletaId!)
        .maybeSingle(),
    ]);
    setAluno((a as Aluno) || (DEMO_ATHLETES.find((athlete) => athlete.id === atletaId) as Aluno | undefined) || null);
    setPerfil((pt as PerfilTreino) || null);
    setAssinatura((ass as any) || null);
    setAnamnese(ana);
    setNivel(TEMPO_TO_NIVEL((pt as PerfilTreino | null)?.tempo_treino));
    setLoading(false);
  };

  const handleSaveNivel = async (value: string) => {
    setNivel(value);
    if (!aluno?.tenant_id) {
      toast.success("Nível atualizado (local)");
      return;
    }
    setSavingNivel(true);
    const tempo = NIVEL_TO_TEMPO[value] || "Intermediário";
    const { error } = await supabase
      .from("perfis_treino")
      .upsert(
        { aluno_id: aluno.id, tenant_id: aluno.tenant_id, tempo_treino: tempo },
        { onConflict: "aluno_id" }
      );
    if (error) {
      toast.error(error.message);
    } else {
      setPerfil((p) => (p ? { ...p, tempo_treino: tempo } : p));
      toast.success(`Nível salvo: ${value.replace("_", " ").toUpperCase()}`);
    }
    setSavingNivel(false);
  };

  const handleUploadFoto = async (file: File) => {
    if (!aluno) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${aluno.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase
        .from("perfis")
        .update({ avatar_url: url })
        .eq("id", aluno.id);
      if (updErr) throw updErr;
      setAluno({ ...aluno, avatar_url: url });
      toast.success("Foto atualizada!");
    } catch (e: any) {
      toast.error(e?.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const handleImportFile = async (file: File) => {
    if (!aluno) return;
    setImporting(true);
    const toastId = toast.loading(`Processando ${importType} com IA...`);
    
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });
      
      const base64 = await base64Promise;
      
      const { data, error } = await supabase.functions.invoke("import-with-ai", {
        body: { 
          file: base64, 
          fileType: file.type,
          importType,
          alunoId: aluno.id,
          tenantId: aluno.tenant_id
        },
      });

      if (error) throw error;
      
      if (importType === "treino") {
        toast.success("Treino importado com sucesso!", { id: toastId });
        navigate(`/${slug}/admin/montar-treino?aluno=${aluno.id}`);
      } else {
        toast.success("Dieta importada com sucesso!", { id: toastId });
        // Refresh page to show data if needed, or navigate to diet page if it existed
        void load();
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Falha ao importar: ${e.message}`, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateProtocol = async () => {
    if (!aluno) return;
    setIsGeneratingProtocol(true);
    try {
      const { data, error } = await (supabase.functions as any).invoke("generate-hormone-protocol", {
        body: { alunoId: aluno.id, tenantId: aluno.tenant_id },
      });

      if (error) throw error;
      setProtocolResult(data.protocol);
      setShowProtocolDialog(true);
      toast.success("Protocolo gerado pelo DR. IA!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Falha ao gerar protocolo");
    } finally {
      setIsGeneratingProtocol(false);
    }
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
      <div className="relative h-[70vh] min-h-[460px] md:h-[600px] md:min-h-0 w-full overflow-hidden group bg-secondary/30">
        <img
          src={heroImg}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-40"
        />
        <img
          src={heroImg}
          alt={aluno.nome_completo || ""}
          className="absolute inset-0 w-full h-full object-contain object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-background/10 pointer-events-none" />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUploadFoto(f);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-background/80 backdrop-blur border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-background"
        >
          {uploading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
          {uploading ? "Enviando..." : "Editar foto"}
        </button>

        <div className="absolute top-0 inset-x-0 px-4 pt-4 flex items-center justify-between z-10">
          <AdminBackButton 
            className="w-10 h-10 rounded-full bg-background/70 backdrop-blur"
          />
          <div className="flex gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImportFile(f);
                e.target.value = "";
              }}
            />
            <Button
              size="sm"
              disabled={importing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-[10px] h-8"
              onClick={() => {
                setImportType("treino");
                importInputRef.current?.click();
              }}
            >
              {importing && importType === "treino" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              Importar treino
            </Button>
            <Button
              size="sm"
              disabled={importing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-[10px] h-8"
              onClick={() => {
                setImportType("dieta");
                importInputRef.current?.click();
              }}
            >
              {importing && importType === "dieta" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              Importar dieta
            </Button>
          </div>
        </div>

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

        <div className="grid grid-cols-2 gap-3">
          <Button
            className="h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider shadow-glow"
            onClick={() => navigate(`/${slug}/admin/montar-treino?aluno=${aluno.id}`)}
          >
            <Upload className="h-4 w-4 mr-2" /> Importar Treino
          </Button>
          <Button
            className="h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider shadow-glow"
            onClick={() => toast.info("Em breve: importador de dieta")}
          >
            <Upload className="h-4 w-4 mr-2" /> Importar Dieta
          </Button>
        </div>

        <div className="space-y-2">
          <button
            onClick={handleGenerateProtocol}
            disabled={isGeneratingProtocol}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors text-left"
          >
            {isGeneratingProtocol ? (
              <Loader2 className="h-4 w-4 text-primary animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
            <span className="flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-primary">
                Gerar Sugestão de Ciclo (DR. IA)
              </span>
              <span className="block text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5">
                Baseado no livro de Dudu Haluch
              </span>
            </span>
          </button>

          <button
            onClick={() => {
              if (anamnese) setShowAnamneseDialog(true);
              else toast.error("Este atleta ainda não preencheu a anamnese.");
            }}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-border bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
          >
            <FileText className="h-4 w-4 text-primary" />
            <span className="flex-1 text-xs font-bold uppercase tracking-wider">
              Ver anamnese completa
            </span>
          </button>

          <button
            onClick={() => setShow7DobrasIntro(true)}
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

        <div className="rounded-2xl border border-border bg-secondary/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" />
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Plano & Assinatura
              </p>
            </div>
            {assinatura && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                assinatura.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
              }`}>
                {assinatura.status === 'active' ? 'Ativo' : assinatura.status}
              </span>
            )}
          </div>
          
          {assinatura ? (
            <div>
              <p className="font-display text-lg uppercase text-foreground leading-tight">
                {assinatura.plano.nome}
              </p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                R$ {(assinatura.plano.preco_centavos / 100).toFixed(2)} · {assinatura.plano.intervalo}
              </p>
            </div>
          ) : (
            <div className="text-center py-2">
              <p className="text-xs text-muted-foreground mb-3">Nenhum plano vinculado a este atleta.</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-[10px] font-bold uppercase tracking-wider h-8 border-primary/30 text-primary hover:bg-primary/5"
                onClick={() => navigate(`/${slug}/admin/planos`)}
              >
                Vincular Plano
              </Button>
            </div>
          )}
        </div>

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

      <Dialog open={showProtocolDialog} onOpenChange={setShowProtocolDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border shadow-2xl">
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-2 text-primary mb-1">
              <Sparkles className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">IA GENERATIVA</span>
            </div>
            <DialogTitle className="font-display text-2xl uppercase tracking-tight">
              Sugestão de Ciclo & TPC
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wider">
              Análise baseada no perfil de {aluno.nome_completo}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            {protocolResult && (
              <div className="prose prose-invert prose-sm max-w-none">
                <div className="whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6 flex gap-3">
                    <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
                    <p className="text-[10px] text-destructive font-bold uppercase leading-normal">
                      AVISO: ESTA É APENAS UMA SUGESTÃO EDUCACIONAL. O USO DE ESTEROIDES APRESENTA GRAVES RISCOS. 
                      DEVE SER AVALIADO POR UM MÉDICO ENDOCRINOLOGISTA.
                    </p>
                  </div>
                  {protocolResult}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border/50 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowProtocolDialog(false)}
              className="flex-1 uppercase text-[10px] font-bold tracking-widest"
            >
              Fechar
            </Button>
            <Button 
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 uppercase text-[10px] font-bold tracking-widest"
              onClick={() => {
                navigator.clipboard.writeText(protocolResult || "");
                toast.success("Copiado para a área de transferência!");
              }}
            >
              Copiar Sugestão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <JacksonPollockCalculator
        open={open7Dobras}
        onOpenChange={setOpen7Dobras}
        alunoId={aluno.id}
        tenantId={aluno.tenant_id}
        pesoInicial={perfil?.peso_kg ?? null}
        idadeInicial={perfil?.idade ?? null}
        sexoInicial={perfil?.sexo ?? null}
        alturaInicial={perfil?.altura_cm ?? null}
      />

      {show7DobrasIntro && (
        <SevenDobrasIntro
          name={aluno.nome_completo || ""}
          avatarUrl={aluno.avatar_url}
          onComplete={() => {
            setShow7DobrasIntro(false);
            setOpen7Dobras(true);
          }}
        />
      )}
      <Dialog open={showAnamneseDialog} onOpenChange={setShowAnamneseDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-card border-border shadow-2xl">
          <DialogHeader className="pb-4 border-b border-border/50">
            <div className="flex items-center gap-2 text-primary mb-1">
              <FileText className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">FICHA TÉCNICA</span>
            </div>
            <DialogTitle className="font-display text-2xl uppercase tracking-tight">
              Anamnese Completa
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wider">
              Dados de saúde e hábitos de {aluno.nome_completo}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-6">
            {anamnese ? (
              <AnamneseDetails data={anamnese} />
            ) : (
              <p className="text-center text-muted-foreground py-10">Dados não encontrados.</p>
            )}
          </div>

          <DialogFooter className="border-t border-border/50 pt-4">
            <Button variant="ghost" onClick={() => setShowAnamneseDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AtletaDetalhe;
