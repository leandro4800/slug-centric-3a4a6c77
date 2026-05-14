import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ChevronLeft,
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
import { ComprehensiveEvaluationForm } from "@/components/aluno/ComprehensiveEvaluationForm";
import { PhysicalEvaluationSelection } from "@/components/aluno/PhysicalEvaluationSelection";
import { calcBodyFatUSNavy, calcIMC } from "@/lib/body-metrics";


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
import { PrescricaoViewer } from "@/components/admin/PrescricaoViewer";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import heroDefault from "@/assets/hero-default.jpg";
import heic2any from "heic2any";

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
  const { tenant } = useBranding();
  const navigate = useNavigate();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [perfil, setPerfil] = useState<PerfilTreino | null>(null);
  // assinatura state removed
  const [loading, setLoading] = useState(true);
  const [nivel, setNivel] = useState<string>("intermediario");
  const [savingNivel, setSavingNivel] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importType, setImportType] = useState<"treino" | "dieta" | "avaliacao">("treino");
  const [protocolResult, setProtocolResult] = useState<string | null>(null);
  const [isGeneratingProtocol, setIsGeneratingProtocol] = useState(false);
  const [showProtocolDialog, setShowProtocolDialog] = useState(false);
  const [open7Dobras, setOpen7Dobras] = useState(false);
  const [show7DobrasIntro, setShow7DobrasIntro] = useState(false);
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [formEval, setFormEval] = useState({
    peso_kg: "",
    altura_cm: "",
    pescoco_cm: "",
    cintura_cm: "",
    quadril_cm: "",
  });
  const [savingEval, setSavingEval] = useState(false);
  const [triggerImport, setTriggerImport] = useState(false);

  const [anamnese, setAnamnese] = useState<any>(null);
  const [showAnamneseDialog, setShowAnamneseDialog] = useState(false);
  const [ultimaAvaliacao, setUltimaAvaliacao] = useState<any>(null);
  const [loadingAnamnese, setLoadingAnamnese] = useState(false);
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [promptType, setPromptType] = useState<"treino" | "dieta" | "ambos">("treino");
  const [iaPrompt, setIaPrompt] = useState("");
  const [showPrescricaoViewer, setShowPrescricaoViewer] = useState(false);

  const [searchParams] = useSearchParams();
  const openEval = searchParams.get("openEval");

  useEffect(() => {
    if (openEval === "true") {
      setSelectionOpen(true);
    }
  }, [openEval]);

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
      setLoading(false);
      return;
    }

    const [
      { data: a }, 
      { data: pt }, 
      { data: ana },
      { data: aval }
    ] = await Promise.all([
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
        .from("anamnese_aluno")
        .select("*")
        .eq("aluno_id", atletaId!)
        .maybeSingle(),
      supabase
        .from("avaliacoes_fisicas")
        .select("*")
        .eq("aluno_id", atletaId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    setAluno((a as Aluno) || (DEMO_ATHLETES.find((athlete) => athlete.id === atletaId) as Aluno | undefined) || null);
    setPerfil((pt as PerfilTreino) || null);
    setAnamnese(ana);
    setUltimaAvaliacao(aval);
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

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, message: string): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(message)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const compressImage = (blob: Blob, maxDim: number, quality: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        try {
          const ratio = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob((b) => { URL.revokeObjectURL(url); resolve(b); }, 'image/jpeg', quality);
        } catch { URL.revokeObjectURL(url); resolve(null); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      img.src = url;
    });
  };

  const handleUploadFoto = async (file: File) => {
    if (!aluno) return;
    const toastId = toast.loading("Preparando foto...");
    setUploading(true);
    try {
      const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
      
      if (!isHeic && !file.type.startsWith("image/")) {
        throw new Error("Por favor, selecione uma imagem.");
      }

      if (file.size > 15 * 1024 * 1024) {
        throw new Error("A imagem deve ter no máximo 15MB.");
      }

      let source: Blob = file;
      if (isHeic) {
        toast.loading("Convertendo formato Apple (HEIC)...", { id: toastId });
        const converted = await withTimeout(
          heic2any({ blob: file, toType: "image/jpeg", quality: 0.82 }) as Promise<Blob | Blob[]>,
          45000,
          "A conversão demorou demais. Tente uma imagem JPG."
        );
        source = Array.isArray(converted) ? converted[0] : converted;
      }

      toast.loading("Otimizando imagem...", { id: toastId });
      const normalized = await withTimeout(
        compressImage(source, 1600, 0.82),
        45000,
        "A preparação demorou demais."
      );

      if (!normalized) throw new Error("Erro ao processar imagem.");

      const path = `${aluno.id}/${Date.now()}.jpg`;
      toast.loading("Enviando para o servidor...", { id: toastId });
      
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, normalized, { 
          upsert: true, 
          contentType: "image/jpeg" 
        });
      
      if (upErr) throw upErr;
      
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;
      
      const { error: updErr } = await supabase
        .from("perfis")
        .update({ avatar_url: url })
        .eq("id", aluno.id);
        
      if (updErr) throw updErr;
      
      setAluno({ ...aluno, avatar_url: url });
      toast.success("Foto atualizada!", { id: toastId });
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha no upload", { id: toastId });
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
      } else if (importType === "dieta") {
        toast.success("Dieta importada com sucesso!", { id: toastId });
        void load();
      } else {
        const ext = data.data; // Dados extraídos pela IA
        if (ext) {
          toast.loading("Salvando dados da avaliação...", { id: toastId });
          
          // Se tiver dados de dobras, salva como jackson_pollock_7
          const hasDobras = ext.dobras && Object.values(ext.dobras).some(v => v && Number(v) > 0);
          
          const evalData = {
            aluno_id: aluno.id,
            tenant_id: aluno.tenant_id,
            peso_kg: ext.peso || null,
            altura_cm: ext.altura || null,
            idade: ext.idade || null,
            sexo: ext.sexo || (perfil?.sexo === "F" ? "F" : "M"),
            metodo: hasDobras ? "jackson_pollock_7" : "marinha_americana",
            // Dobras
            dobra_peitoral: ext.dobras?.peitoral || null,
            dobra_axilar_media: ext.dobras?.axilar_media || null,
            dobra_triceps: ext.dobras?.triceps || null,
            dobra_subescapular: ext.dobras?.subescapular || null,
            dobra_abdominal: ext.dobras?.abdominal || null,
            dobra_suprailiaca: ext.dobras?.suprailiaca || null,
            dobra_coxa: ext.dobras?.coxa || null,
            dobra_panturrilha: ext.dobras?.panturrilha || null,
            // Perímetros
            pescoco_cm: ext.perimetros?.pescoco || null,
            cintura_cm: ext.perimetros?.cintura || null,
            quadril_cm: ext.perimetros?.quadril || null,
            perimetro_ombro: ext.perimetros?.ombro || null,
            perimetro_torax: ext.perimetros?.torax || null,
            perimetro_abdomen: ext.perimetros?.abdomen || null,
            perimetro_braco_relaxado_dir: ext.perimetros?.braco_relaxado_dir || null,
            perimetro_braco_relaxado_esq: ext.perimetros?.braco_relaxado_esq || null,
            perimetro_braco_contraido_dir: ext.perimetros?.braco_contraido_dir || null,
            perimetro_braco_contraido_esq: ext.perimetros?.braco_contraido_esq || null,
            perimetro_antebraco_dir: ext.perimetros?.antebraco_dir || null,
            perimetro_antebraco_esq: ext.perimetros?.antebraco_esq || null,
            perimetro_coxa_proximal_dir: ext.perimetros?.coxa_proximal_dir || null,
            perimetro_coxa_proximal_esq: ext.perimetros?.coxa_proximal_esq || null,
            perimetro_coxa_media_dir: ext.perimetros?.coxa_media_dir || null,
            perimetro_coxa_media_esq: ext.perimetros?.coxa_media_esq || null,
            perimetro_coxa_distal_dir: ext.perimetros?.coxa_distal_dir || null,
            perimetro_coxa_distal_esq: ext.perimetros?.coxa_distal_esq || null,
            perimetro_panturrilha_dir: ext.perimetros?.panturrilha_dir || null,
            perimetro_panturrilha_esq: ext.perimetros?.panturrilha_esq || null,
            data: new Date().toISOString()
          };

          const { error: saveErr } = await supabase.from("avaliacoes_fisicas").insert(evalData);
          if (saveErr) throw saveErr;

          toast.success("Avaliação física importada e salva com sucesso!", { id: toastId });
          void load();
        } else {
          toast.error("Não foi possível extrair dados da avaliação.", { id: toastId });
        }
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
    
    // Verifica se já existe um protocolo e pergunta se quer substituir
    if (protocolResult) {
      const confirmReplace = window.confirm("Já existe um protocolo gerado. Deseja analisar o atual e gerar uma nova sugestão com ajustes?");
      if (!confirmReplace) return;
    } else {
      const confirmGen = window.confirm("Deseja que a IA analise os dados do aluno e gere uma sugestão de protocolo?");
      if (!confirmGen) return;
    }

    setIsGeneratingProtocol(true);
    try {
      const { data, error } = await (supabase.functions as any).invoke("generate-hormone-protocol", {
        body: { 
          alunoId: aluno.id, 
          tenantId: aluno.tenant_id,
          currentProtocol: protocolResult // Envia o protocolo atual para análise
        },
      });

      if (error) throw error;
      setProtocolResult(data.protocol);
      setShowProtocolDialog(true);
      toast.success("Análise de protocolo concluída pelo DR. IA!");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Falha ao gerar protocolo");
    } finally {
      setIsGeneratingProtocol(false);
    }
  };

  const handleUpdateEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!atletaId) return toast.error("Atleta não identificado.");
    setSavingEval(true);
    
    const peso = Number(formEval.peso_kg);
    const alt = Number(formEval.altura_cm);
    const bf = calcBodyFatUSNavy({
      sexo: (perfil?.sexo as "M" | "F") || "M",
      altura_cm: alt,
      pescoco_cm: Number(formEval.pescoco_cm),
      cintura_cm: Number(formEval.cintura_cm),
      quadril_cm: formEval.quadril_cm ? Number(formEval.quadril_cm) : undefined,
    });
    const imc = calcIMC(peso, alt);
    const massaGorda = bf && peso ? +(peso * (bf / 100)).toFixed(2) : null;
    const massaMagra = bf && peso ? +(peso - (massaGorda ?? 0)).toFixed(2) : null;

    const evalData = {
      aluno_id: atletaId,
      tenant_id: aluno?.tenant_id || tenant?.id,
      peso_kg: peso,
      altura_cm: alt,
      pescoco_cm: Number(formEval.pescoco_cm),
      cintura_cm: Number(formEval.cintura_cm),
      quadril_cm: formEval.quadril_cm ? Number(formEval.quadril_cm) : null,
      bf_pct_calculado: bf,
      imc,
      massa_magra_kg: massaMagra,
      massa_gorda_kg: massaGorda,
      data: new Date().toISOString()
    };

    const { error } = await supabase.from("avaliacoes_fisicas").insert(evalData);
    setSavingEval(false);
    if (error) {
      console.error("Erro ao salvar avaliação:", error);
      return toast.error("Erro ao salvar: " + error.message);
    }
    
    toast.success("Nova avaliação registrada!");
    setEvalOpen(false);
    load();
  };

  const subtitulo = useMemo(() => {

    if (!perfil) return "Sem dados de anamnese";
    const peso = perfil.peso_kg ? `${perfil.peso_kg}kg` : null;
    const bf = perfil.bf_pct ? `${perfil.bf_pct}%` : null;
    const partes = [peso, bf].filter(Boolean).join(" · ");
    return `Treinamento ${partes || "—"} — ${nivel.toUpperCase()}`;
  }, [perfil, nivel]);

  const canGenerate = useMemo(() => {
    return !!anamnese && !!perfil && !!ultimaAvaliacao;
  }, [anamnese, perfil, ultimaAvaliacao]);

  useEffect(() => {
    if (action === "generate-training" && canGenerate && !loading) {
      setPromptType("treino");
      setIaPrompt("");
      setShowPromptDialog(true);
    } else if (action === "generate-diet" && canGenerate && !loading) {
      setPromptType("dieta");
      setIaPrompt("");
      setShowPromptDialog(true);
    }
  }, [action, canGenerate, loading]);

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

        <div className="absolute top-0 inset-x-0 px-4 pt-4 z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <AdminBackButton
              className="w-10 h-10 rounded-full bg-background/70 backdrop-blur shrink-0"
            />
            <button
              onClick={() => navigate(`/${slug}/admin/atletas`)}
              className="flex items-center gap-1.5 px-3 h-9 rounded-full bg-background/70 backdrop-blur border border-white/10 text-foreground text-[10px] font-bold uppercase tracking-wider hover:bg-background"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Atletas
            </button>
          </div>
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
          <div className="flex flex-wrap gap-1.5 justify-end">
            <Button
              size="sm"
              disabled={importing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-[10px] h-8 px-2.5"
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
              Treino
            </Button>
            <Button
              size="sm"
              disabled={importing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-[10px] h-8 px-2.5"
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
              Dieta
            </Button>
            <Button
              size="sm"
              disabled={importing}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wider text-[10px] h-8 px-2.5"
              onClick={() => {
                setImportType("avaliacao");
                importInputRef.current?.click();
              }}
            >
              {importing && importType === "avaliacao" ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Upload className="h-3 w-3 mr-1" />
              )}
              Avaliação
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
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => toast.warning("Alerta clínico registrado")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/40 text-accent text-[10px] font-bold uppercase tracking-wider"
            >
              <AlertTriangle className="h-3 w-3" /> Alerta clínico
            </button>
            <button
              onClick={() => navigate(`/${slug}/admin/atleta/${atletaId}/carta`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[hsl(180_100%_45%)] to-[hsl(150_100%_45%)] text-black text-[10px] font-bold uppercase tracking-wider hover:brightness-110"
            >
              <Sparkles className="h-3 w-3" /> Carta do atleta
            </button>
          </div>
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
            onClick={() => setSelectionOpen(true)}
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
            onClick={() => setShowPrescricaoViewer(true)}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-primary/40 bg-primary/10 hover:bg-primary/15 transition-colors text-left"
          >
            <Eye className="h-4 w-4 text-primary" />
            <span className="flex-1">
              <span className="block text-xs font-bold uppercase tracking-wider text-primary">
                Ver treino e dieta prescritos
              </span>
              <span className="block text-[10px] text-muted-foreground tracking-wider uppercase mt-0.5">
                O que está chegando no app do aluno agora
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
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Status de Acesso
            </p>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-foreground">
              Acesso à Plataforma
            </p>
            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
              Liberado
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Este atleta possui acesso ilimitado aos recursos do seu painel.
          </p>
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

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <Button
              className="h-20 flex-1 flex flex-col items-center justify-center font-display text-xl uppercase tracking-wider transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow hover:scale-[1.02]"
              onClick={() => {
                setPromptType("treino");
                setIaPrompt("");
                setShowPromptDialog(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Dumbbell className="h-6 w-6" />
                Montar Treino
              </div>
              {!canGenerate && <span className="text-[10px] lowercase tracking-normal font-sans opacity-70 mt-1">Manual (IA requer anamnese e avaliação)</span>}
            </Button>
            <Button
              className="h-20 flex-1 flex flex-col items-center justify-center font-display text-xl uppercase tracking-wider transition-all duration-300 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow hover:scale-[1.02]"
              onClick={() => {
                setPromptType("dieta");
                setIaPrompt("");
                setShowPromptDialog(true);
              }}
            >
              <div className="flex items-center gap-2">
                <Apple className="h-6 w-6" />
                Montar Dieta
              </div>
              {!canGenerate && <span className="text-[10px] lowercase tracking-normal font-sans opacity-70 mt-1">Manual (IA requer anamnese e avaliação)</span>}
            </Button>
          </div>

          <div className="flex justify-center">
            <Button
              variant="outline"
              className={`w-3/4 h-14 font-display text-lg uppercase tracking-wider border-primary/30 text-primary hover:bg-primary/5 ${
                !canGenerate ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={!canGenerate}
              onClick={() => {
                if (canGenerate) {
                  setPromptType("ambos");
                  setIaPrompt("");
                  setShowPromptDialog(true);
                } else {
                  toast.error("Preencha anamnese, perfil e avaliação física primeiro.");
                }
              }}
            >
              <Sparkles className="h-6 w-6 mr-2 text-primary" />
              Gerar Protocolo Completo (IA)
            </Button>
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

      <ComprehensiveEvaluationForm
        open={open7Dobras}
        onOpenChange={setOpen7Dobras}
        triggerImportOnInit={triggerImport}
        alunoId={atletaId || ""}
        tenantId={aluno.tenant_id || tenant?.id}
        sexo={perfil?.sexo}
        onSaved={(goToDiet) => {
          load();
          if (goToDiet) navigate(`/${slug}/admin/montar-dieta?aluno=${atletaId}&auto=true`);
        }}
      />

      <PhysicalEvaluationSelection
        open={selectionOpen}
        onOpenChange={setSelectionOpen}
        onSelect={(type) => {
          setSelectionOpen(false);
          if (type === "navy") {
            setEvalOpen(true);
          } else if (type === "7dobras") {
            setTriggerImport(false);
            setShow7DobrasIntro(true);
          } else if (type === "import") {
            setTriggerImport(true);
            setShow7DobrasIntro(true);
          }
        }}
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

      <Dialog open={evalOpen} onOpenChange={setEvalOpen}>
        <DialogContent className="max-w-md bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl uppercase tracking-tight">Nova Avaliação Física</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wider">
              Protocolo Marinha Americana (Medidas)
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEval} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="peso">Peso (kg)</Label>
                <Input id="peso" type="number" step="0.1" value={formEval.peso_kg} onChange={(e) => setFormEval({...formEval, peso_kg: e.target.value})} required className="bg-background border-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="altura">Altura (cm)</Label>
                <Input id="altura" type="number" value={formEval.altura_cm} onChange={(e) => setFormEval({...formEval, altura_cm: e.target.value})} required className="bg-background border-primary/20" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pescoco">Pescoço (cm)</Label>
                <Input id="pescoco" type="number" step="0.1" value={formEval.pescoco_cm} onChange={(e) => setFormEval({...formEval, pescoco_cm: e.target.value})} required className="bg-background border-primary/20" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cintura">Cintura (cm)</Label>
                <Input id="cintura" type="number" step="0.1" value={formEval.cintura_cm} onChange={(e) => setFormEval({...formEval, cintura_cm: e.target.value})} required className="bg-background border-primary/20" />
              </div>
            </div>
            {perfil?.sexo === "F" && (
              <div className="space-y-2">
                <Label htmlFor="quadril">Quadril (cm)</Label>
                <Input id="quadril" type="number" step="0.1" value={formEval.quadril_cm} onChange={(e) => setFormEval({...formEval, quadril_cm: e.target.value})} required={perfil?.sexo === "F"} className="bg-background border-primary/20" />
              </div>
            )}
            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => setEvalOpen(false)} className="uppercase tracking-widest text-[10px] font-bold">Cancelar</Button>
              <Button type="submit" disabled={savingEval} className="bg-primary hover:bg-primary/90 uppercase tracking-widest text-[10px] font-bold px-8">
                {savingEval ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
          </div>

          <DialogFooter className="border-t border-border/50 pt-4">
            <Button variant="ghost" onClick={() => setShowAnamneseDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
        <DialogContent className="max-w-md bg-card border-border shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary mb-1">
              <Sparkles className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.3em]">IA GENERATIVA</span>
            </div>
            <DialogTitle className="font-display text-2xl uppercase tracking-tight">
              {promptType === 'treino' ? 'Montar Treino' : promptType === 'dieta' ? 'Montar Dieta' : 'Montar Protocolo Completo'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs uppercase tracking-wider">
              Deseja adicionar instruções específicas para a IA?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <Textarea
              placeholder={
                promptType === 'treino' 
                  ? "Ex: Focar em glúteos e posteriores, enfatizar ombros, treino com mais drop-sets..." 
                  : promptType === 'dieta'
                    ? "Ex: Dieta sem lactose, incluir jejum intermitente, mais opções de lanches práticos..."
                    : "Ex: Focar em definição máxima para competição, dieta zero carbo nos dias de OFF..."
              }
              className="min-h-[120px] bg-background border-primary/20 focus:border-primary/50 text-sm"
              value={iaPrompt}
              onChange={(e) => setIaPrompt(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground uppercase leading-relaxed">
              Dica: Você pode pedir para a IA focar em grupos musculares específicos, respeitar alergias alimentares ou seguir uma metodologia preferida.
            </p>
          </div>

          <DialogFooter className="flex flex-col gap-2">
            <Button
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest h-12"
              onClick={() => {
                const promptQuery = iaPrompt ? `&prompt=${encodeURIComponent(iaPrompt)}` : '';
                if (promptType === 'treino') {
                  navigate(`/${slug}/admin/montar-treino?aluno=${aluno.id}${promptQuery}`);
                } else if (promptType === 'dieta') {
                  navigate(`/${slug}/admin/montar-dieta?aluno=${aluno.id}&auto=true${promptQuery}`);
                } else {
                  navigate(`/${slug}/admin/montar-treino?aluno=${aluno.id}&andDiet=true${promptQuery}`);
                }
                setShowPromptDialog(false);
              }}
            >
              {promptType === 'dieta'
                ? (iaPrompt ? 'Gerar Dieta com Instruções' : 'Gerar Dieta Agora')
                : (iaPrompt ? 'Continuar com Instruções' : 'Continuar para revisar')}
            </Button>
            <Button
              variant="ghost"
              className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
              onClick={() => setShowPromptDialog(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {aluno && (
        <PrescricaoViewer
          open={showPrescricaoViewer}
          onOpenChange={setShowPrescricaoViewer}
          alunoId={aluno.id}
          alunoNome={aluno.nome_completo}
        />
      )}
    </div>
  );
};

export default AtletaDetalhe;
