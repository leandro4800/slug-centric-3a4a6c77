import { useEffect, useRef, useState } from "react";
import { Play, Lightbulb, Share2, Clock, CheckCircle2, Loader2, Video, Mic } from "lucide-react";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import ExercisePlayer from "./ExercisePlayer";
import { Capacitor } from "@capacitor/core";
import { SpeechRecognition as NativeSpeech } from "@capacitor-community/speech-recognition";

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
  onRecords?: (tipos: string[]) => void;
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
  const [slots, setSlots] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.slots) && parsed.slots.length === totalSlots) {
          return parsed.slots;
        }
      }
    } catch {}
    return Array.from({ length: totalSlots }, () => ({
      carga: cargaAnterior?.carga_kg ? String(cargaAnterior.carga_kg) : "",
      reps: cargaAnterior?.repeticoes_feitas ? String(cargaAnterior.repeticoes_feitas) : "",
      done: false,
    }));
  });
  const [savingAll, setSavingAll] = useState(false);
  const [recordSlots, setRecordSlots] = useState<Set<number>>(new Set());

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
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListeningIdx(index);
      toast.info(index === -1 ? "Ouvindo (todas as séries)..." : "Ouvindo...", { id: "voice-toast" });
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      processTranscript(transcript, index);
    };
    recognition.onerror = (e: any) => {
      const err = e?.error || "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast.error("Permissão de microfone negada. Habilite nas configurações do navegador/app.", { id: "voice-toast" });
      } else if (err === "no-speech") {
        toast.error("Não ouvi nada. Tente de novo mais perto do microfone.", { id: "voice-toast" });
      } else if (err === "audio-capture") {
        toast.error("Microfone indisponível.", { id: "voice-toast" });
      } else {
        toast.error(`Erro ao ouvir (${err || "desconhecido"}). Tente novamente.`, { id: "voice-toast" });
      }
      setListeningIdx(null);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setListeningIdx(null);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
    } catch (err: any) {
      toast.error(`Não consegui iniciar o microfone: ${err?.message || err}`, { id: "voice-toast" });
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

  // Persiste estado (slots + cronômetro) sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          slots,
          seconds,
          running,
          startedAt: running ? Date.now() : null,
        })
      );
    } catch {}
  }, [slots, seconds, running, storageKey]);

  const coachUrl = data.video_coach_url || null;
  const hasCoach = !!coachUrl;
  const hasReference = !!referenceVideoUrl;

  const updateSlot = (i: number, field: "carga" | "reps", val: string) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, [field]: val } : s)));

  const toggleDone = (i: number) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, done: !s.done } : s)));

  const handleFinalizar = async () => {
    if (!userId || !tenantId) {
      toast.error("Você precisa estar logado.");
      return;
    }
    if (!sessionActive) {
      toast.error("Inicie o treino primeiro.");
      return;
    }
    const valid = slots
      .map((s, i) => ({
        k: parseFloat(s.carga.replace(",", ".")),
        r: parseInt(s.reps),
        tipo: getSlotType(i),
        idx: i + 1,
      }))
      .filter((s) => !isNaN(s.k) && !isNaN(s.r));
    if (valid.length === 0) {
      toast.error("Preencha pelo menos uma série.");
      return;
    }
    setSavingAll(true);
    try {
      const prescritoId = isUuid(data.id) ? data.id : null;

      // ---- histórico do aluno neste exercício (para comparar recordes) ----
      // Só considera séries de TRABALHO no histórico e só marca PR se já existir histórico.
      let maxPeso = 0;
      let maxRm = 0;
      let temHistorico = false;
      const maxVolPorSerie = new Map<number, number>();
      if (prescritoId) {
        const { data: prescritos } = await supabase
          .from("treinos_prescritos")
          .select("id")
          .eq("aluno_id", userId)
          .eq("exercicio", data.exercicio);
        const ids = (prescritos || []).map((p: any) => p.id);
        if (ids.length) {
          const { data: hist } = await supabase
            .from("series_executadas")
            .select("peso_kg, volume_kg, rm_estimado, numero_serie, tipo_serie")
            .eq("aluno_id", userId)
            .in("treino_prescrito_id", ids)
            .limit(2000);
          (hist || [])
            .filter((h: any) => String(h.tipo_serie || "trabalho").toLowerCase() === "trabalho")
            .forEach((h: any) => {
              temHistorico = true;
              maxPeso = Math.max(maxPeso, Number(h.peso_kg) || 0);
              maxRm = Math.max(maxRm, Number(h.rm_estimado) || 0);
              const n = Number(h.numero_serie) || 0;
              maxVolPorSerie.set(n, Math.max(maxVolPorSerie.get(n) || 0, Number(h.volume_kg) || 0));
            });
        }
      }


      const rows = valid.map((s) => ({
        aluno_id: userId,
        tenant_id: tenantId,
        sessao_id: sessaoId,
        treino_prescrito_id: prescritoId,
        numero_serie: s.idx,
        tipo_serie: s.tipo,
        peso_kg: s.k,
        reps: s.r,
        concluida_em: new Date().toISOString(),
      }));

      const { data: inserted, error } = await supabase
        .from("series_executadas")
        .insert(rows as any)
        .select("id, numero_serie, peso_kg, reps, volume_kg, rm_estimado, tipo_serie");
      if (error) throw error;

      // ---- detecta recordes ----
      const prsRows: any[] = [];
      const recordIdx = new Set<number>();
      const tipos = new Set<string>();
      const hoje = new Date().toISOString().split("T")[0];

      const ordenadas = [...(inserted || [])].sort(
        (a: any, b: any) => (a.numero_serie || 0) - (b.numero_serie || 0),
      );

      ordenadas.forEach((row: any) => {
        // PR só existe para série de trabalho e só a partir do 2º registro do exercício
        if (String(row.tipo_serie || "trabalho").toLowerCase() !== "trabalho") return;
        if (!temHistorico) return;
        const peso = Number(row.peso_kg) || 0;
        const reps = Number(row.reps) || 0;
        const vol = Number(row.volume_kg) || peso * reps;
        const rm = Number(row.rm_estimado) || peso * (1 + reps / 30);
        const n = Number(row.numero_serie) || 0;
        let bateu = false;


        const push = (tipo: string, valor: number, anterior: number, unidade: string, label: string) => {
          bateu = true;
          tipos.add(label);
          prsRows.push({
            aluno_id: userId,
            tenant_id: tenantId,
            exercicio: data.exercicio,
            tipo_recorde: tipo,
            valor_numerico: Number(valor.toFixed(2)),
            valor_anterior: anterior > 0 ? Number(anterior.toFixed(2)) : null,
            valor: `${valor.toFixed(1)} ${unidade}`,
            unidade,
            data: hoje,
            treino_prescrito_id: prescritoId,
            series_executada_id: row.id,
          });
        };

        const volAnterior = maxVolPorSerie.get(n) || 0;
        if (vol > 0 && vol > volAnterior) {
          push("volume", vol, volAnterior, "kg", "volume");
          maxVolPorSerie.set(n, vol);
        }
        if (peso > 0 && peso > maxPeso) {
          push("peso", peso, maxPeso, "kg", "peso");
          maxPeso = peso;
        }
        if (rm > 0 && rm > maxRm) {
          push("1rm", rm, maxRm, "kg", "1RM");
          maxRm = rm;
        }
        if (bateu) recordIdx.add(n);
      });

      if (prsRows.length) {
        await supabase.from("prs").insert(prsRows as any);
        const ids = ordenadas.filter((r: any) => recordIdx.has(Number(r.numero_serie))).map((r: any) => r.id);
        if (ids.length) await supabase.from("series_executadas").update({ is_recorde: true } as any).in("id", ids);
        setRecordSlots(new Set([...recordIdx].map((n) => n - 1)));
        onRecords?.([...tipos]);
      }

      const last = valid[valid.length - 1];
      toast.success(`${valid.length} série(s) registrada(s)!`);
      onCargaSaved?.(data.exercicio, last.k, last.r);
      onSeriesSaved?.();
      onCompleted?.();
      setRunning(false);
      setSeconds(0);
      try { localStorage.removeItem(storageKey); } catch {}
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível registrar as séries.");
    } finally {
      setSavingAll(false);
    }
  };


  const currentVideoUrl = (hasCoach && (showCoach || !showYT)) ? coachUrl : referenceVideoUrl;

  const hasAnyVideo = hasCoach || hasReference;

  return (
    <div className={`bg-card/50 border rounded-xl overflow-hidden transition-all ${
      completed ? "border-emerald-500/60 bg-emerald-500/5 opacity-90" : "border-primary/30"
    }`}>
      {/* Header com nome + ícone de vídeo lateral + toggle de séries */}
      <div className="flex items-stretch min-h-[90px]">
        <button onClick={onToggle} className="flex-1 p-4 text-left min-w-0">
          <div className="flex items-start justify-between gap-3">
            <p className={`text-base font-semibold leading-tight truncate ${completed ? "line-through text-muted-foreground" : ""}`}>
              {data.exercicio}
            </p>
            {completed && (
              <span className="flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 shrink-0">
                <CheckCircle2 className="h-3 w-3" /> Concluído
              </span>
            )}
            {data.is_extra && !completed && (
              <span className="text-[9px] uppercase px-2 py-0.5 rounded bg-accent/20 text-accent shrink-0">
                Extra IA
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {cargaAnterior && (
              <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs">
                Última: {cargaAnterior.carga_kg}kg × {cargaAnterior.repeticoes_feitas}
              </span>
            )}
          </div>
        </button>

        {hasAnyVideo && (
          <button
            onClick={(e) => { e.stopPropagation(); setShowVideo((v) => !v); }}
            className={`shrink-0 w-24 flex flex-col items-center justify-center gap-1 border-l border-primary/20 transition-colors ${
              showVideo ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-foreground hover:bg-secondary"
            }`}
            aria-label="Abrir vídeo"
          >
            <Video className="h-6 w-6" />
            <span className="text-[10px] uppercase tracking-wider font-bold">Ver vídeo</span>
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
            <button className="w-9 h-9 rounded-full bg-background/70 backdrop-blur flex items-center justify-center">
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

          {/* Séries de trabalho */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Séries</p>
            <p className="text-[11px] text-accent font-bold">{totalSlots} slots</p>
          </div>

          <div className="space-y-2">
            {slots.map((slot, i) => (
              <div key={i} className={`border rounded-lg p-3 space-y-2 transition-all ${
                getSlotType(i) === "Trabalho" 
                  ? "border-primary/50 bg-primary/5 shadow-[0_0_15px_-5px_hsl(var(--primary)/0.3)]" 
                  : getSlotType(i) === "Ajuste"
                  ? "border-amber-500/50 bg-amber-500/5"
                  : "border-border bg-background/40"
              }`}>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => toggleDone(i)}
                    className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                  >
                    <CheckCircle2 className={`h-4 w-4 ${slot.done ? "text-emerald-500" : "text-muted-foreground"}`} />
                    <span className={getSlotType(i) !== "Aquecimento" ? "font-black" : ""}>
                      S{i + 1} - {getSlotType(i)}
                    </span>
                    {recordSlots.has(i) && (
                      <svg
                        aria-label="Novo recorde"
                        viewBox="0 0 24 24"
                        className="h-4 w-4 shrink-0 drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]"
                      >
                        <title>Novo recorde</title>
                        <defs>
                          <radialGradient id="medalGold" cx="35%" cy="30%" r="75%">
                            <stop offset="0%" stopColor="#FFF6C9" />
                            <stop offset="45%" stopColor="#F4D03F" />
                            <stop offset="80%" stopColor="#C99700" />
                            <stop offset="100%" stopColor="#8E6A00" />
                          </radialGradient>
                          <linearGradient id="ribbonRed" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FF5252" />
                            <stop offset="100%" stopColor="#B71C1C" />
                          </linearGradient>
                        </defs>
                        <path d="M7 2l5 4 5-4-1.5 6h-7z" fill="url(#ribbonRed)" />
                        <circle cx="12" cy="14" r="6.5" fill="url(#medalGold)" stroke="#8E6A00" strokeWidth="0.6" />
                        <ellipse cx="10" cy="11.5" rx="2.6" ry="1.4" fill="#FFFFFF" opacity="0.55" />
                        <circle cx="12" cy="14" r="6.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.7" />
                      </svg>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); startListening(i); }}
                    className={`p-2 rounded-full transition-all ${
                      listeningIdx === i 
                        ? "bg-primary text-primary-foreground animate-pulse" 
                        : "bg-secondary text-muted-foreground hover:text-primary"
                    }`}
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Carga (kg)</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={slot.carga}
                      onChange={(e) => updateSlot(i, "carga", e.target.value)}
                      placeholder="0"
                      className="w-full mt-1 bg-secondary/70 border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Reps</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={slot.reps}
                      onChange={(e) => updateSlot(i, "reps", e.target.value)}
                      placeholder="0"
                      className="w-full mt-1 bg-secondary/70 border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
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
