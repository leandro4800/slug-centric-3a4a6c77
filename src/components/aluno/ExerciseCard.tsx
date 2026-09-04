import { useEffect, useRef, useState } from "react";
import { Play, Lightbulb, Share2, Clock, CheckCircle2, Loader2, Video, Mic } from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { sharePostLink } from "@/lib/share";
import ExercisePlayer from "./ExercisePlayer";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeech } from "@capacitor-community/speech-recognition";
import { Button } from "@/components/ui/button";

export interface ExerciseCardData {
  id: string;
  exercicio: string;
  series: string | null;
  repeticoes: string | null;
  cadencia?: string | null;
  detalhes_execucao?: string | null;
  observacao: string | null;
  /** Vídeo do YouTube de demonstração (referência técnica) */
  video_url?: string | null;
  /** Vídeo gravado pelo coach (demo personalizada) */
  video_coach_url?: string | null;
  is_extra?: boolean;
}

interface CargaAnterior {
  carga_kg: number;
  repeticoes_feitas: number;
  data_treino: string;
}

interface PreviousSeries {
  peso: number;
  reps: number;
  tempo?: number | null;
}

interface HistorySnapshot {
  hasWorkHistory: boolean;
  maxWeight: number;
  maxEstimatedRm: number;
  maxVolumeBySeries: Map<number, number>;
  previousBySeries: Map<number, PreviousSeries>;
  legacyPrevious: PreviousSeries | null;
}

interface ExerciseCardProps {
  data: ExerciseCardData;
  isOpen: boolean;
  onToggle: () => void;
  cargaAnterior?: CargaAnterior;
  userId: string | null;
  tenantId: string | null;
  onCargaSaved?: (nome: string, carga: number, reps: number) => void;
  nivelExperiencia?: string | null;
  completed?: boolean;
  onCompleted?: () => void;
  /** Sessão de treino em andamento (sessoes_treino.id) */
  sessaoId?: string | null;
  /** Só é possível registrar séries com uma sessão iniciada */
  sessionActive?: boolean;
  /** Chamado após gravar séries (para atualizar a barra de estatísticas) */
  onSeriesSaved?: () => void;
  /** Recordes batidos nesta gravação (para o banner do topo) */
  onRecords?: (info: { exercicio: string; records: Array<{ type: string; value: number }> }) => void;
}



const fmtTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
};

const isAvancado = (n?: string | null) => {
  if (!n) return false;
  const s = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s.includes("avanc");
};

const normalize = (s: string) =>
  (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** Exercícios de tempo puro: sem carga e sem repetições (só cronômetro). */
const TIME_ONLY_PATTERNS = [
  "cardio", "esteira", "bike", "bicicleta", "eliptico", "corrida", "caminhada",
  "alongamento", "mobilidade", "isometria", "prancha", "plank", "ponte",
  "glute bridge", "aquecimento articular",
];

/** Exercícios sem carga externa: só repetições + tempo. */
const BODYWEIGHT_PATTERNS = [
  "abdominal", "abdominais", "supra", "infra", "obliquo",
  "elevacao de perna", "elevacao de pernas", "barra fixa", "barra livre",
  "burpee", "polichinelo", "flexao de braco", "apoio de solo",
  "escalador", "mountain climber", "pular corda", "corda naval",
];

export type ModoExercicio = "com_carga" | "sem_carga_reps" | "sem_carga_tempo";

export const getModoExercicio = (nome: string): ModoExercicio => {
  const s = normalize(nome);
  if (/(maquina|smith|halter|barra guiada|polia|cabo|caneleira|anilha|peso)/.test(s)) return "com_carga";
  if (TIME_ONLY_PATTERNS.some((p) => s.includes(p))) return "sem_carga_tempo";
  if (BODYWEIGHT_PATTERNS.some((p) => s.includes(p))) return "sem_carga_reps";
  return "com_carga";
};



// Estrutura padrão fixa: 1 Aquecimento + 1 Ajuste + 3 Trabalho
const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s || "");

const DEFAULT_STRUCTURE = ["Aquecimento", "Ajuste", "Trabalho", "Trabalho", "Trabalho"] as const;

const buildSlotTypes = (_seriesStr: string | null, _nivel?: string | null): string[] => {
  return [...DEFAULT_STRUCTURE];
};

export const ExerciseCard = ({
  data,
  isOpen,
  onToggle,
  cargaAnterior,
  userId,
  tenantId,
  onCargaSaved,
  nivelExperiencia,
  completed = false,
  onCompleted,
  sessaoId = null,
  sessionActive = false,
  onSeriesSaved,
  onRecords,
}: ExerciseCardProps) => {

  const { tenant } = useBranding();
  const slotTypes = buildSlotTypes(data.series, nivelExperiencia);
  const totalSlots = slotTypes.length;
  const getSlotType = (i: number) => slotTypes[i] || "Trabalho";
  /** Modo do exercício: com carga, sem carga (reps) ou só tempo. */
  const modoExercicio = getModoExercicio(data.exercicio);
  const semCarga = modoExercicio !== "com_carga";
  const soTempo = modoExercicio === "sem_carga_tempo";

  // ISO week key — garante que cada semana começa com os campos em branco
  const isoWeekKey = (() => {
    const d = new Date();
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${target.getUTCFullYear()}-W${week}`;
  })();
  const storageKey = `treino-state:${userId || "anon"}:${data.id}:${isoWeekKey}`;
  const emptySlots = () => Array.from({ length: totalSlots }, () => ({ carga: "", reps: "", done: false }));
  const [slots, setSlots] = useState(emptySlots);
  const [savingAll, setSavingAll] = useState(false);
  const [savingSlots, setSavingSlots] = useState<Set<number>>(new Set());
  const [recordSlots, setRecordSlots] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<HistorySnapshot>({
    hasWorkHistory: false,
    maxWeight: 0,
    maxEstimatedRm: 0,
    maxVolumeBySeries: new Map(),
    previousBySeries: new Map(),
    legacyPrevious: null,
  });

  const [showCoach, setShowCoach] = useState(false);
  const [showYT, setShowYT] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [listeningIdx, setListeningIdx] = useState<number | null>(null);
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string | null>(data.video_url || null);

  // O vídeo vem sempre do vínculo por ID resolvido na consulta do treino.
  // Nenhum matching por texto aqui — era a causa de vídeos errados.
  useEffect(() => {
    setReferenceVideoUrl(data.video_url || null);
  }, [data.video_url]);


  // index = -1 significa "preencher TODAS as séries de uma vez"
  const recognitionRef = useRef<any>(null);

  const processTranscript = (rawTranscript: string, index: number) => {
    const transcript = (rawTranscript || "").toLowerCase();

    const cargaRegexes = [
      /(\d+(?:[.,]\d+)?)\s*(?:kg|quilos?|kilos?)/i,
      /carga\s*(?:de\s+)?(\d+(?:[.,]\d+)?)/i,
      /(\d+(?:[.,]\d+)?)\s*(?:de\s+)?carga/i,
      /(\d+(?:[.,]\d+)?)\s*(?:de\s+)?peso/i,
    ];
    const repsRegexes = [
      /(\d+)\s*(?:repeti[cç][õo]es?|reps?|movimentos?|vezes?)/i,
      /(?:repeti[cç][õo]es?|reps?|movimentos?|vezes?)\s*(?:de\s+)?(\d+)/i,
    ];

    const detectTipo = (txt: string): string | null =>
      /trabalho/i.test(txt) ? "Trabalho" :
      /aquecimento|aquec/i.test(txt) ? "Aquecimento" :
      /ajuste/i.test(txt) ? "Ajuste" : null;

    const parseSegment = (txt: string) => {
      const qtdMatch = txt.match(/(\d+)\s*(?:s[eé]ries?|sets?)/i);
      const tipo = detectTipo(txt);
      let carga = "";
      let reps = "";
      for (const r of cargaRegexes) { const m = txt.match(r); if (m) { carga = m[1].replace(",", "."); break; } }
      for (const r of repsRegexes) { const m = txt.match(r); if (m) { reps = m[1]; break; } }

      if (!reps && !carga) {
        const numbers = (txt.match(/\d+(?:[.,]\d+)?/g) || [])
          .map((n) => n.replace(",", ""))
          .filter((n) => !(qtdMatch && n === qtdMatch[1]));
        if (numbers.length === 1) {
          const n = parseFloat(numbers[0]);
          if (n <= 30) reps = numbers[0]; else carga = numbers[0];
        } else if (numbers.length >= 2) {
          const n1 = parseFloat(numbers[0]);
          const n2 = parseFloat(numbers[1]);
          if (n1 > n2) { carga = numbers[0]; reps = numbers[1]; }
          else { reps = numbers[0]; carga = numbers[1]; }
        }
      }
      const qtd = qtdMatch ? parseInt(qtdMatch[1]) : (tipo ? 1 : null);
      return { tipo, qtd, carga, reps };
    };

    // Quebra em segmentos por conectores (" e ", vírgula, ponto, ponto-e-vírgula)
    const rawSegments = transcript
      .split(/\s+e\s+|[,.;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    // Mantém apenas segmentos que tenham tipo + (reps ou carga)
    const parsedAll = rawSegments
      .map(parseSegment)
      .filter((p) => p.tipo && (p.reps || p.carga));

    // Modo multi-segmento: pelo menos 2 blocos com tipo
    if (index === -1 && parsedAll.length >= 2) {
      const used: Record<string, number> = {};
      const totalPreenchido: string[] = [];
      setSlots((prev: any[]) => {
        const next = [...prev];
        parsedAll.forEach((p) => {
          if (!p.tipo) return;
          const indices = slotTypes.map((t, i) => t === p.tipo ? i : -1).filter((i) => i >= 0);
          const start = used[p.tipo] || 0;
          const restante = indices.length - start;
          const qtd = Math.min(p.qtd ?? restante, restante);
          for (let k = 0; k < qtd; k++) {
            const idx = indices[start + k];
            if (idx == null) break;
            next[idx] = { ...next[idx], reps: p.reps || next[idx].reps, carga: p.carga || next[idx].carga };
          }
          used[p.tipo] = start + qtd;
          if (qtd > 0) totalPreenchido.push(`${qtd} ${p.tipo.toLowerCase()}`);
        });
        return next;
      });
      toast.success(`Preenchido: ${totalPreenchido.join(", ")}`, { id: "voice-toast" });
      return;
    }

    // Fallback: comportamento original (segmento único)
    const single = parseSegment(transcript);
    const { tipo: tipoFilter, qtd: qtdNum, carga, reps } = single;
    const qtdMatch = transcript.match(/(\d+)\s*(?:s[eé]ries?|sets?)/i);
    const bulkKeyword = /\b(todas?|tudo|todas as series|todas as séries|todos os slots|todas iguais)\b/i.test(transcript);
    const isBulk = index === -1 || bulkKeyword || !!qtdMatch || !!tipoFilter;

    if (reps || carga) {
      if (isBulk) {
        if (tipoFilter) {
          const indicesDoTipo = slotTypes.map((t, idx) => t === tipoFilter ? idx : -1).filter((i) => i >= 0);
          const qtd = qtdNum ? Math.min(qtdNum, indicesDoTipo.length) : indicesDoTipo.length;
          const alvos = new Set(indicesDoTipo.slice(0, qtd));
          setSlots((prev) => prev.map((s, idx) => alvos.has(idx) ? {
            ...s, reps: reps || s.reps, carga: carga || s.carga,
          } : s));
          toast.success(`${qtd} série(s) de ${tipoFilter.toLowerCase()} preenchida(s)`, { id: "voice-toast" });
        } else {
          const qtd = qtdMatch ? Math.min(parseInt(qtdMatch[1]), totalSlots) : totalSlots;
          setSlots((prev) => prev.map((s, idx) => idx < qtd ? {
            ...s, reps: reps || s.reps, carga: carga || s.carga,
          } : s));
          toast.success(`${qtd} séries preenchidas`, { id: "voice-toast" });
        }
      } else {
        setSlots((prev) => prev.map((s, idx) => idx === index ? {
          ...s, reps: reps || s.reps, carga: carga || s.carga,
        } : s));
        toast.success(`Capturado: ${carga ? carga + "kg" : ""}${carga && reps ? " · " : ""}${reps ? reps + " reps" : ""}`, { id: "voice-toast" });
      }
    } else {
      toast.error("Não entendi. Tente: 'fiz 1 aquecimento com 20kg 12 reps, 1 ajuste com 40kg 10 reps e 3 de trabalho com 60kg 10 reps'", { id: "voice-toast" });
    }
  };

  const startListeningNative = async (index: number) => {
    try {
      const avail = await NativeSpeech.available();
      if (!avail.available) {
        toast.error("Reconhecimento de voz não disponível neste aparelho.", { id: "voice-toast" });
        return;
      }
      const perm = await NativeSpeech.checkPermissions();
      if (perm.speechRecognition !== "granted") {
        const req = await NativeSpeech.requestPermissions();
        if (req.speechRecognition !== "granted") {
          toast.error("Permissão de microfone negada. Habilite nas configurações do app.", { id: "voice-toast" });
          return;
        }
      }
      setListeningIdx(index);
      toast.info(index === -1 ? "Ouvindo (todas as séries)..." : "Ouvindo...", { id: "voice-toast" });

      const result: any = await NativeSpeech.start({
        language: "pt-BR",
        maxResults: 1,
        prompt: "Diga carga e repetições",
        partialResults: false,
        popup: false,
      });
      const matches: string[] = result?.matches || [];
      const transcript = matches[0] || "";
      if (!transcript) {
        toast.error("Não ouvi nada. Tente de novo mais perto do microfone.", { id: "voice-toast" });
      } else {
        processTranscript(transcript, index);
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      toast.error(`Erro ao ouvir: ${msg}`, { id: "voice-toast" });
    } finally {
      setListeningIdx(null);
    }
  };

  const startListeningWeb = (index: number) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Seu navegador não suporta reconhecimento de voz. Use Chrome no Android ou Safari no iOS.", { id: "voice-toast" });
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    const recognition = new SR();
    recognitionRef.current = recognition;
    recognition.lang = "pt-BR";
    // continuous + interim: a fala longa ("1 aquecimento..., 1 ajuste..., 3 de
    // trabalho...") tem pausas naturais que antes encerravam o reconhecimento
    // logo na primeira pausa, sem preencher nada.
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalText = "";
    let finished = false;
    let silenceTimer: number | null = null;
    let hardStopTimer: number | null = null;

    const clearTimers = () => {
      if (silenceTimer) window.clearTimeout(silenceTimer);
      if (hardStopTimer) window.clearTimeout(hardStopTimer);
      silenceTimer = null;
      hardStopTimer = null;
    };
    const stopSoon = () => {
      if (silenceTimer) window.clearTimeout(silenceTimer);
      // encerra só após ~2,5s sem nenhuma fala nova
      silenceTimer = window.setTimeout(() => {
        try { recognition.stop(); } catch {}
      }, 2500);
    };
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimers();
      setListeningIdx(null);
      recognitionRef.current = null;
      const text = finalText.trim();
      if (text) processTranscript(text, index);
      else toast.error("Não ouvi nada. Tente de novo mais perto do microfone.", { id: "voice-toast" });
    };

    recognition.onstart = () => {
      setListeningIdx(index);
      toast.info(index === -1 ? "Ouvindo (todas as séries)... fale e pause no final" : "Ouvindo...", { id: "voice-toast" });
      stopSoon();
      // limite máximo de segurança
      hardStopTimer = window.setTimeout(() => {
        try { recognition.stop(); } catch {}
      }, 30000);
    };
    recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += " " + res[0].transcript;
      }
      stopSoon();
    };
    recognition.onspeechstart = () => stopSoon();
    recognition.onerror = (e: any) => {
      const err = e?.error || "";
      // "no-speech" pode chegar no meio de uma fala longa — só encerra de fato
      // se ainda não capturamos nada.
      if (err === "no-speech" && finalText.trim()) return;
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast.error("Permissão de microfone negada. Habilite nas configurações do navegador/app.", { id: "voice-toast" });
      } else if (err === "no-speech") {
        toast.error("Não ouvi nada. Tente de novo mais perto do microfone.", { id: "voice-toast" });
      } else if (err === "audio-capture") {
        toast.error("Microfone indisponível.", { id: "voice-toast" });
      } else if (err !== "aborted") {
        toast.error(`Erro ao ouvir (${err || "desconhecido"}). Tente novamente.`, { id: "voice-toast" });
      }
      finished = true;
      clearTimers();
      setListeningIdx(null);
      recognitionRef.current = null;
    };
    recognition.onend = () => finish();
    try {
      recognition.start();
    } catch (err: any) {
      toast.error(`Não consegui iniciar o microfone: ${err?.message || err}`, { id: "voice-toast" });
      clearTimers();
      setListeningIdx(null);
      recognitionRef.current = null;
    }
  };

  const startListening = (index: number) => {
    if (Capacitor.isNativePlatform()) {
      void startListeningNative(index);
    } else {
      startListeningWeb(index);
    }
  };

  // Restaura cronômetro do localStorage (mantém contagem mesmo com tela fechada)
  const [running, setRunning] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return !!JSON.parse(raw).running;
    } catch {}
    return false;
  });
  const [seconds, setSeconds] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const p = JSON.parse(raw);
        const base = Number(p.seconds) || 0;
        if (p.running && p.startedAt) {
          const elapsed = Math.floor((Date.now() - p.startedAt) / 1000);
          return base + Math.max(0, elapsed);
        }
        return base;
      }
    } catch {}
    return 0;
  });
  const intRef = useRef<number | null>(null);
  useEffect(() => {
    if (running) {
      intRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intRef.current) {
      window.clearInterval(intRef.current);
    }
    return () => {
      if (intRef.current) window.clearInterval(intRef.current);
    };
  }, [running]);

  // Persiste somente o cronômetro. As entradas de KG/reps sempre começam vazias.
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          seconds,
          running,
          startedAt: running ? Date.now() : null,
        })
      );
    } catch {}
  }, [seconds, running, storageKey]);

  const loadLegacyPrevious = async (): Promise<PreviousSeries | null> => {
    if (!userId || !tenantId) return null;
    const { data: rows } = await supabase
      .from("historico_cargas")
      .select("carga_kg, repeticoes_feitas, data_treino")
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .eq("exercicio_nome", data.exercicio)
      .order("data_treino", { ascending: false })
      .limit(1);
    const row = (rows || [])[0];
    if (!row) return null;
    return { peso: Number(row.carga_kg) || 0, reps: Number(row.repeticoes_feitas) || 0 };
  };

  const loadHistory = async (): Promise<HistorySnapshot> => {
    const empty: HistorySnapshot = {
      hasWorkHistory: false,
      maxWeight: 0,
      maxEstimatedRm: 0,
      maxVolumeBySeries: new Map(),
      previousBySeries: new Map(),
      legacyPrevious: null,
    };
    if (!userId || !isUuid(data.id)) return empty;

    empty.legacyPrevious = await loadLegacyPrevious().catch(() => null);

    const { data: prescribedRows, error: prescribedError } = await supabase
      .from("treinos_prescritos")
      .select("id")
      .eq("aluno_id", userId)
      .eq("tenant_id", tenantId)
      .eq("exercicio", data.exercicio);
    if (prescribedError) throw prescribedError;
    const prescribedIds = (prescribedRows || []).map((row) => row.id);
    if (!prescribedIds.length) return empty;

    let query = supabase
      .from("series_executadas")
      .select("peso_kg, reps, volume_kg, rm_estimado, numero_serie, tipo_serie, tempo_seg, concluida_em")
      .eq("aluno_id", userId)
      .eq("tenant_id", tenantId)
      .in("treino_prescrito_id", prescribedIds)
      .order("concluida_em", { ascending: false })
      .limit(2000);
    if (sessaoId) query = query.neq("sessao_id", sessaoId);
    const { data: rows, error } = await query;
    if (error) throw error;

    for (const row of rows || []) {
      const seriesNumber = Number(row.numero_serie) || 0;
      if (!empty.previousBySeries.has(seriesNumber)) {
        empty.previousBySeries.set(seriesNumber, {
          peso: Number(row.peso_kg) || 0,
          reps: Number(row.reps) || 0,
          tempo: (row as any).tempo_seg == null ? null : Number((row as any).tempo_seg),
        });
      }
      if (String(row.tipo_serie || "").trim().toLowerCase() !== "trabalho") continue;
      empty.hasWorkHistory = true;
      empty.maxWeight = Math.max(empty.maxWeight, Number(row.peso_kg) || 0);
      empty.maxEstimatedRm = Math.max(empty.maxEstimatedRm, Number(row.rm_estimado) || 0);
      empty.maxVolumeBySeries.set(
        seriesNumber,
        Math.max(empty.maxVolumeBySeries.get(seriesNumber) || 0, Number(row.volume_kg) || 0),
      );
    }
    return empty;
  };

  // Chave do rascunho da sessão ativa: valores digitados sobrevivem ao fechar o app.
  const draftKey = `treino-draft:${userId || "anon"}:${data.id}:${sessaoId || "no-session"}`;
  const [draftLoaded, setDraftLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSlots(emptySlots());
    setRecordSlots(new Set());
    setDraftLoaded(false);

    // 1) Rascunho local (séries digitadas mas ainda não confirmadas)
    let base = emptySlots();
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          base = base.map((s, i) => ({
            carga: typeof parsed[i]?.carga === "string" ? parsed[i].carga : s.carga,
            reps: typeof parsed[i]?.reps === "string" ? parsed[i].reps : s.reps,
            done: false,
          }));
        }
      }
    } catch {}

    // 2) Séries já confirmadas nesta sessão (fonte de verdade: Supabase)
    (async () => {
      let next = base;
      if (userId && sessaoId && isUuid(data.id)) {
        const { data: rows } = await supabase
          .from("series_executadas")
          .select("numero_serie, peso_kg, reps, is_recorde")
          .eq("aluno_id", userId)
          .eq("sessao_id", sessaoId)
          .eq("treino_prescrito_id", data.id)
          .order("numero_serie", { ascending: true });
        if (cancelled) return;
        const records = new Set<number>();
        for (const row of rows || []) {
          const idx = (Number(row.numero_serie) || 0) - 1;
          if (idx < 0 || idx >= next.length) continue;
          next = next.map((s, i) =>
            i === idx
              ? {
                  carga: row.peso_kg != null ? String(row.peso_kg) : s.carga,
                  reps: row.reps != null ? String(row.reps) : s.reps,
                  done: true,
                }
              : s,
          );
          if (row.is_recorde) records.add(idx);
        }
        if (records.size) setRecordSlots(records);
      }
      if (!cancelled) {
        setSlots(next);
        setDraftLoaded(true);
      }
    })();

    loadHistory()
      .then((snapshot) => { if (!cancelled) setHistory(snapshot); })
      .catch(() => { if (!cancelled) setHistory({ hasWorkHistory: false, maxWeight: 0, maxEstimatedRm: 0, maxVolumeBySeries: new Map(), previousBySeries: new Map(), legacyPrevious: null }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id, userId, sessaoId]);

  // Persiste o rascunho (KG/reps digitados) a cada alteração.
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      if (slots.some((s) => s.carga || s.reps)) {
        localStorage.setItem(
          draftKey,
          JSON.stringify(slots.map((s) => ({ carga: s.carga, reps: s.reps }))),
        );
      } else {
        localStorage.removeItem(draftKey);
      }
    } catch {}
  }, [slots, draftKey, draftLoaded]);

  const coachUrl = data.video_coach_url || null;
  const hasCoach = !!coachUrl;
  const hasReference = !!referenceVideoUrl;

  const updateSlot = (i: number, field: "carga" | "reps", val: string) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));

  const confirmSeries = async (i: number) => {
    if (!userId || !tenantId || !sessaoId || !sessionActive) {
      toast.error("Inicie o treino primeiro.");
      return;
    }
    const slot = slots[i];
    if (!slot || slot.done || savingSlots.has(i)) return;
    const weight = semCarga ? 0 : Number(slot.carga.replace(",", "."));
    const reps = soTempo ? null : Number.parseInt(slot.reps, 10);
    if (!soTempo && (!Number.isInteger(reps as number) || (reps as number) <= 0)) {
      toast.error("Informe as repetições.");
      return;
    }
    if (!semCarga && (!Number.isFinite(weight) || weight < 0)) {
      toast.error("Informe KG e repetições válidos.");
      return;
    }


    setSavingSlots((current) => new Set(current).add(i));
    try {
      const prescribedId = isUuid(data.id) ? data.id : null;
      // upsert: a mesma série da mesma sessão nunca gera uma segunda linha
      // (evita volume duplicado quando o app reenvia/reconfirma a série).
      const { data: inserted, error } = await supabase
        .from("series_executadas")
        .upsert(
          {
            aluno_id: userId,
            tenant_id: tenantId,
            sessao_id: sessaoId,
            treino_prescrito_id: prescribedId,
            numero_serie: i + 1,
            tipo_serie: getSlotType(i),
            peso_kg: weight,
            reps,
            tempo_seg: semCarga ? seconds : null,
            concluida_em: new Date().toISOString(),
          } as any,
          { onConflict: "sessao_id,treino_prescrito_id,numero_serie" },
        )
        .select("id, numero_serie, peso_kg, reps, volume_kg, rm_estimado, tipo_serie")
        .single();

      if (error) throw error;


      const isWorkSet = String(inserted.tipo_serie || "").trim().toLowerCase() === "trabalho";
      const recordTypes: Array<{ type: string; label: string; value: number; previous: number }> = [];
      if (isWorkSet && history.hasWorkHistory) {
        const volume = Number(inserted.volume_kg) || 0;
        const estimatedRm = Number(inserted.rm_estimado) || 0;
        // baseline por posição de série; se não houver, usa o maior volume de trabalho já registrado
        const allVolumes = Array.from(history.maxVolumeBySeries.values());
        const previousVolume =
          history.maxVolumeBySeries.get(i + 1) || (allVolumes.length ? Math.max(...allVolumes) : 0);
        if (weight > history.maxWeight) {
          recordTypes.push({ type: "peso", label: "peso", value: weight, previous: history.maxWeight });
        }
        if (estimatedRm > history.maxEstimatedRm) {
          recordTypes.push({ type: "1rm", label: "1RM", value: estimatedRm, previous: history.maxEstimatedRm });
        }
        if (volume > previousVolume) {
          recordTypes.push({ type: "volume", label: "volume", value: volume, previous: previousVolume });
        }
      }


      if (recordTypes.length) {
        const { error: prsError } = await supabase.from("prs").insert(recordTypes.map((record) => ({
          aluno_id: userId,
          tenant_id: tenantId,
          exercicio: data.exercicio,
          tipo_recorde: record.type,
          valor_numerico: Number(record.value.toFixed(2)),
          valor_anterior: Number(record.previous.toFixed(2)),
          valor: `${record.value.toFixed(1)} kg`,
          unidade: "kg",
          data: new Date().toISOString().split("T")[0],
          treino_prescrito_id: prescribedId,
          series_executada_id: inserted.id,
        })));
        if (prsError) throw prsError;
        const { error: markError } = await supabase
          .from("series_executadas")
          .update({ is_recorde: true })
          .eq("id", inserted.id);
        if (markError) throw markError;
        setRecordSlots((current) => new Set(current).add(i));
        onRecords?.({
          exercicio: data.exercicio,
          records: recordTypes.map((record) => ({ type: record.type, value: record.value })),
        });
      }

      setSlots((current) => current.map((item, index) => index === i ? { ...item, done: true } : item));
      setHistory((current) => {
        const nextVolumes = new Map(current.maxVolumeBySeries);
        if (isWorkSet) nextVolumes.set(i + 1, Math.max(nextVolumes.get(i + 1) || 0, Number(inserted.volume_kg) || 0));
        return {
          ...current,
          maxWeight: isWorkSet ? Math.max(current.maxWeight, weight) : current.maxWeight,
          maxEstimatedRm: isWorkSet ? Math.max(current.maxEstimatedRm, Number(inserted.rm_estimado) || 0) : current.maxEstimatedRm,
          maxVolumeBySeries: nextVolumes,
        };
      });
      onCargaSaved?.(data.exercicio, weight, reps);
      onSeriesSaved?.();
      toast.success(`Série ${i + 1} registrada.`);
    } catch (error: any) {
      toast.error(error?.message || "Não foi possível registrar a série.");
    } finally {
      setSavingSlots((current) => {
        const next = new Set(current);
        next.delete(i);
        return next;
      });
    }
  };

  const handleFinalizar = async () => {
    if (!userId || !tenantId) {
      toast.error("Você precisa estar logado.");
      return;
    }
    if (!sessionActive) {
      toast.error("Inicie o treino primeiro.");
      return;
    }
    if (!slots.some((slot) => slot.done)) {
      toast.error("Confirme pelo menos uma série no botão ✓.");
      return;
    }
    setSavingAll(true);
    try {
      onCompleted?.();
      setRunning(false);
      setSeconds(0);
      try { localStorage.removeItem(storageKey); } catch {}
      try { localStorage.removeItem(draftKey); } catch {}
      toast.success("Exercício finalizado.");
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível registrar as séries.");
    } finally {
      setSavingAll(false);
    }
  };


  const currentVideoUrl = (hasCoach && (showCoach || !showYT)) ? coachUrl : referenceVideoUrl;

  const hasAnyVideo = hasCoach || hasReference;

  const shareExercise = async () => {
    await sharePostLink({
      url: currentVideoUrl || window.location.href,
      title: data.exercicio,
      text: `${data.exercicio} — ${tenant?.nome || "Alpha Coach Pro"}`,
      mediaUrl: isDirectVideo(currentVideoUrl) ? currentVideoUrl : null,
      onCopied: () => toast.success("Link do vídeo copiado!"),
      onError: (m) => toast.error(m),
    });
  };



  return (
    <div className={`bg-card/50 border rounded-xl overflow-hidden transition-all ${
      completed ? "border-emerald-500/60 bg-emerald-500/5 opacity-90" : "border-primary/30"
    }`}>
      {/* Header: grid trava a coluna do vídeo — fonte grande no Android não empurra ela pra fora */}
      <div
        className={`grid items-stretch min-h-[90px] overflow-hidden ${
          hasAnyVideo ? "grid-cols-[minmax(0,1fr)_72px]" : "grid-cols-1"
        }`}
      >
        <button
          onClick={completed ? undefined : onToggle}
          disabled={completed}
          className="min-w-0 max-w-full p-4 text-left disabled:cursor-not-allowed"
        >
          <div className="flex min-w-0 items-start gap-2">
            <p className={`min-w-0 flex-1 text-base font-semibold leading-tight break-words ${completed ? "line-through text-muted-foreground" : ""}`}>
              {data.exercicio}
            </p>
            {completed && (
              <span className="flex shrink-0 items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-emerald-500">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
              </span>
            )}
            {data.is_extra && !completed && (
              <span className="shrink-0 rounded bg-accent/20 px-1.5 py-0.5 text-[9px] uppercase text-accent">
                Extra
              </span>
            )}
          </div>
          {cargaAnterior && (
            <div className="mt-2 min-w-0">
              <span className="inline-block max-w-full truncate rounded-full bg-primary/15 px-3 py-1 text-xs text-primary">
                Última: {soTempo ? `${cargaAnterior.repeticoes_feitas ?? 0}s` : semCarga ? `${cargaAnterior.repeticoes_feitas} reps` : `${cargaAnterior.carga_kg}kg × ${cargaAnterior.repeticoes_feitas}`}
              </span>
            </div>
          )}
        </button>

        {hasAnyVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowVideo((v) => !v); }}
            className={`flex w-full min-w-0 flex-col items-center justify-center gap-1 overflow-hidden border-l border-primary/20 px-1 transition-colors ${
              showVideo ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-foreground hover:bg-secondary"
            }`}
            aria-label="Ver vídeo"
          >
            <Video className="h-5 w-5 shrink-0" />
            <span className="max-w-full text-center text-[9px] font-bold uppercase leading-tight tracking-wide [overflow-wrap:anywhere]">
              Ver vídeo
            </span>
          </button>
        )}
      </div>

      {/* Player de vídeo (recolhido por padrão) */}
      {showVideo && hasAnyVideo && (
        <div className="relative aspect-video bg-black border-t border-primary/20">
          <ExercisePlayer
            videoUrl={currentVideoUrl}
            exerciseName={data.exercicio}
          />

          <div className="absolute bottom-2 left-2 flex gap-2 z-10">
            <button
              onClick={shareExercise}
              aria-label="Compartilhar exercício"
              className="w-9 h-9 rounded-full bg-background/70 backdrop-blur flex items-center justify-center"
            >
              <Share2 className="h-4 w-4 text-white" />
            </button>
            <button className="w-9 h-9 rounded-full bg-background/70 backdrop-blur flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </button>
          </div>

          {(hasCoach || hasReference) && (
            <div className="absolute bottom-2 right-2 z-10 flex gap-1.5 bg-background/70 backdrop-blur rounded-full p-1">
              {hasCoach && (
                <button
                  onClick={() => { setShowCoach(true); setShowYT(false); }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition ${
                    showCoach || !showYT ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  Coach
                </button>
              )}
              {hasReference && (
                <button
                  onClick={() => { setShowYT(true); setShowCoach(false); }}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition relative overflow-hidden ${
                    showYT || (!hasCoach && !showYT) ? "bg-primary text-primary-foreground border border-white/20" : "text-muted-foreground border border-transparent"
                  }`}
                >
                  {showYT && <div className="absolute inset-0 bg-[var(--btn-mirror)] opacity-40" />}
                  <Video className="h-3 w-3 relative z-10" /> <span className="relative z-10">Técnico</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}


      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {/* Detalhes Coach */}
          <div className="space-y-2">
            {data.cadencia && (
              <div className="flex items-center gap-2 text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-full w-fit">
                <Clock className="h-3 w-3" /> CADÊNCIA: {data.cadencia}
              </div>
            )}
            {data.detalhes_execucao && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1">
                <p className="text-[10px] uppercase font-bold text-primary tracking-widest">
                  Metodologia {tenant?.nome || "AlphaCoach"}
                </p>
                <p className="text-xs text-foreground/90 leading-relaxed">{data.detalhes_execucao}</p>
              </div>
            )}
            {data.observacao && (
              <div className="bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span className="italic text-muted-foreground">{data.observacao}</span>
              </div>
            )}
          </div>

          {/* Iniciar exercício + timer */}
          <div className="grid grid-cols-[auto_1fr] gap-2">
            <button
              onClick={() => { if (sessionActive) setRunning((r) => !r); }}
              disabled={!sessionActive}
              title={sessionActive ? undefined : "Inicie o treino primeiro"}
              className="px-6 py-4 rounded-xl bg-primary text-primary-foreground font-display text-sm leading-tight flex items-center gap-3 relative overflow-hidden border border-white/20 shadow-lg transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-[var(--btn-mirror)] opacity-60" />
              <Play className="h-5 w-5 fill-current relative z-10" />
              <span className="relative z-10">{running ? "PAUSAR" : "INICIAR"}<br/>EXERCÍCIO</span>
            </button>
            <div className="rounded-lg border border-accent/30 bg-secondary/30 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tempo atual</p>
                <p className="font-mono text-2xl text-accent">{fmtTime(seconds)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Player</p>
                <p className="text-xs font-bold">EXECUÇÃO DINÂMICA</p>
              </div>
            </div>
          </div>

          {!sessionActive && (
            <p className="text-[11px] text-amber-400 -mt-2">
              Inicie o treino primeiro para registrar suas séries.
            </p>
          )}


          {/* Botão destacado: preencher TODAS as séries por voz */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); startListening(-1); }}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider border transition-all ${
              listeningIdx === -1
                ? "bg-primary text-primary-foreground border-primary animate-pulse shadow-[0_0_30px_-5px_hsl(var(--primary)/0.8)]"
                : "bg-primary/10 text-primary border-primary/40 hover:bg-primary/20"
            }`}
            title='Ex: "fiz 4 séries com 20kg e 12 repetições"'
          >
            <Mic className="h-4 w-4" />
            {listeningIdx === -1 ? "Ouvindo... fale agora" : "🎤 Preencher TODAS as séries por voz"}
          </button>

          {semCarga && (
            <p className="text-[11px] text-muted-foreground -mt-2">
              {soTempo
                ? "Exercício de tempo — o cronômetro é salvo, sem repetições."
                : "Exercício sem carga — registre apenas as repetições. O tempo do cronômetro é salvo junto."}
            </p>
          )}

          <div className="w-full border border-border bg-background/40">
            <div className="w-full">
              <div className={`grid ${soTempo ? "grid-cols-[34px_44px_34px]" : semCarga ? "grid-cols-[34px_44px_1fr_34px]" : "grid-cols-[34px_44px_1fr_1fr_34px]"} items-center gap-1 border-b border-border bg-secondary/60 px-1.5 py-1.5 text-[8px] font-bold uppercase text-muted-foreground`}>
                <span>Série</span><span>Ant.</span>{!semCarga && <span className="text-center">KG</span>}{!soTempo && <span className="text-center">Reps</span>}<span className="text-center">✓</span>
              </div>

              {slots.map((slot, i) => {
                const type = getSlotType(i);
                const previous = history.previousBySeries.get(i + 1);
                const legacy = !previous ? history.legacyPrevious : null;
                const shown = previous || legacy;
                const saving = savingSlots.has(i);
                return (
                  <div
                    key={i}
                    className={`grid ${soTempo ? "grid-cols-[34px_44px_34px]" : semCarga ? "grid-cols-[34px_44px_1fr_34px]" : "grid-cols-[34px_44px_1fr_1fr_34px]"} items-center gap-1 border-b border-border/70 px-1.5 py-1.5 last:border-b-0 ${slot.done ? "bg-emerald-500/5" : type === "Trabalho" ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex min-w-0 flex-col items-start leading-tight">
                      <span className="flex items-center gap-0.5 font-mono text-xs font-bold">
                        {i + 1}
                        {recordSlots.has(i) && (
                        <svg aria-label="Novo recorde" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 drop-shadow-md">
                          <title>Novo recorde</title>
                          <defs>
                            <radialGradient id={`medalGold-${data.id}-${i}`} cx="35%" cy="30%" r="75%">
                              <stop offset="0%" stopColor="#FFF6C9" /><stop offset="45%" stopColor="#F4D03F" /><stop offset="80%" stopColor="#C99700" /><stop offset="100%" stopColor="#8E6A00" />
                            </radialGradient>
                            <linearGradient id={`ribbonRed-${data.id}-${i}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#FF5252" /><stop offset="100%" stopColor="#B71C1C" />
                            </linearGradient>
                          </defs>
                          <path d="M7 2l5 4 5-4-1.5 6h-7z" fill={`url(#ribbonRed-${data.id}-${i})`} />
                          <circle cx="12" cy="14" r="6.5" fill={`url(#medalGold-${data.id}-${i})`} stroke="#8E6A00" strokeWidth="0.6" />
                          <ellipse cx="10" cy="11.5" rx="2.6" ry="1.4" fill="#FFFFFF" opacity="0.55" />
                        </svg>
                        )}
                      </span>
                      <span className={`w-full truncate text-[7px] font-bold uppercase ${type === "Trabalho" ? "text-primary" : type === "Ajuste" ? "text-amber-400" : "text-muted-foreground"}`}>
                        {type.slice(0, 4)}
                      </span>
                    </div>
                    <span
                      className={`flex flex-col text-[9px] leading-tight ${legacy ? "text-muted-foreground/70 italic" : "text-muted-foreground"}`}
                      title={legacy ? "Histórico antigo do exercício" : undefined}
                    >
                      {shown ? (soTempo ? <span>{shown.tempo ? `${shown.tempo}s` : "—"}</span> : semCarga ? <span>×{shown.reps}</span> : (<><span>{shown.peso}kg</span><span>×{shown.reps}</span></>)) : "—"}
                    </span>

                    {!semCarga && (
                      <input
                        aria-label={`Carga da série ${i + 1}`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        value={slot.carga}
                        onChange={(e) => updateSlot(i, "carga", e.target.value)}
                        disabled={slot.done || saving}
                        placeholder="—"
                        className="h-9 w-full min-w-0 border border-input bg-secondary/70 px-1 text-center text-xs outline-none focus:border-primary disabled:opacity-60"
                      />
                    )}
                    {!soTempo && (
                    <input
                      aria-label={`Repetições da série ${i + 1}`}
                      type="number"
                      inputMode="numeric"
                      min="1"
                      value={slot.reps}
                      onChange={(e) => updateSlot(i, "reps", e.target.value)}
                      disabled={slot.done || saving}
                      placeholder="—"
                      className="h-9 w-full min-w-0 border border-input bg-secondary/70 px-1 text-center text-xs outline-none focus:border-primary disabled:opacity-60"
                    />
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant={slot.done ? "green" : "default"}
                      aria-label={`Confirmar série ${i + 1}`}
                      disabled={!sessionActive || slot.done || saving}
                      onClick={() => void confirmSeries(i)}
                      className="h-9 w-9 rounded-none p-0 tracking-normal [&_svg]:size-4"
                    >
                      {saving ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleFinalizar}
            disabled={savingAll || !sessionActive}
            title={sessionActive ? undefined : "Inicie o treino primeiro"}
            className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-display text-lg flex items-center justify-center gap-3 relative overflow-hidden border border-white/30 shadow-[0_10px_40px_-10px_rgba(224,0,0,0.4)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100"
          >
            <div className="absolute inset-0 bg-[var(--btn-mirror)] opacity-70" />
            {savingAll ? <Loader2 className="h-5 w-5 animate-spin relative z-10" /> : null}
            <span className="relative z-10 tracking-[0.1em]">FINALIZAR EXERCÍCIO</span>
          </button>

        </div>
      )}
    </div>
  );
};
