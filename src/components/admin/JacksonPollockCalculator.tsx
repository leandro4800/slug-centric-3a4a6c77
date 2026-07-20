import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Ruler, Info, Upload, FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadImageDataUrl, renderPdfHeader } from "@/lib/pdf-branding";
import { PhysicalEvaluationScienceFooter } from "@/components/HealthScienceFootnotes";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  alunoId: string;
  tenantId?: string | null;
  pesoInicial?: number | null;
  idadeInicial?: number | null;
  sexoInicial?: string | null;
  alturaInicial?: number | null;
  alunoNomeInicial?: string | null;
  onSaved?: () => void;
}

type Sexo = "M" | "F";

const DOBRAS = [
  { key: "peitoral", label: "Peitoral" },
  { key: "axilarMedia", label: "Axilar Média" },
  { key: "triceps", label: "Tríceps" },
  { key: "subescapular", label: "Subescapular" },
  { key: "abdominal", label: "Abdominal" },
  { key: "suprailiaca", label: "Suprailíaca" },
  { key: "coxa", label: "Coxa" },
] as const;

type DobraKey = (typeof DOBRAS)[number]["key"];

type AiAnalysis = {
  dobras: Record<DobraKey, string>;
  foundCount: number;
  somaDobras?: number | null;
  bfEstimado?: number | null;
  aviso?: string;
  fonteUrl?: string;
  promptUtilizado?: string;
  textoLido?: string;
};

const JACKSON_POLLOCK_SOURCE_URL = "https://pubmed.ncbi.nlm.nih.gov/702330/";
const AI_ESTIMATE_WARNING =
  "Estimativa visual feita por IA. Não é medição real com adipômetro e não substitui avaliação presencial feita por profissional.";
const SEVEN_FOLD_VISUAL_PROMPT =
  "Analise a imagem como se fosse um avaliador físico experiente. Faça apenas uma estimativa visual, deixando claro que não se trata de uma medição real com adipômetro. Estime os valores das 7 dobras cutâneas em milímetros (protocolo Jackson & Pollock para mulheres): peitoral, axilar média, tríceps, subescapular, abdominal, supra-ilíaca e coxa. Em seguida, informe a soma das 7 dobras e, se possível, apresente uma estimativa do percentual de gordura corporal baseada nesses valores, destacando que se trata apenas de uma aproximação visual e que a avaliação precisa exige medição com adipômetro realizada por um profissional.";

const createEmptyDobras = (): Record<DobraKey, string> => ({
  peitoral: "",
  axilarMedia: "",
  triceps: "",
  subescapular: "",
  abdominal: "",
  suprailiaca: "",
  coxa: "",
});

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const normalizeKey = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const normalizeNumberText = (value: unknown) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "number") return Number.isFinite(value) && value > 0 ? String(value) : "";
  const text = String(value).trim();
  if (!text) return "";
  const match = text.match(/\d{1,3}(?:[,.]\d+)?/);
  return match ? match[0].replace(",", ".") : "";
};

const foldValueFromSavedJson = (value: unknown, key: DobraKey) => {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const snakeKey = key === "axilarMedia" ? "axilar_media" : key;
  return normalizeNumberText(record[key] ?? record[snakeKey]);
};

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractSevenFolds = (payload: unknown, current: Record<DobraKey, string>) => {
  const values: Partial<Record<DobraKey, string>> = {};
  let textoLido = "";
  let somaDobras: number | null = null;
  let bfEstimado: number | null = null;
  let aviso = "";
  let fonteUrl = "";
  let promptUtilizado = "";

  const expectedOrder: DobraKey[] = ["peitoral", "axilarMedia", "triceps", "subescapular", "abdominal", "suprailiaca", "coxa"];
  const foldAliases: Record<DobraKey, string[]> = {
    peitoral: ["peitoral", "dobra peitoral", "pectoral", "torax", "tórax", "chest", "pectoralis", "pt"],
    axilarMedia: ["axilar media", "axilar média", "axilar medial", "axilarmedia", "midaxillary", "axilar", "ax", "am"],
    triceps: ["triceps", "tríceps", "tricep", "tricipital", "tric"],
    subescapular: ["subescapular", "sub escapular", "sub scapular", "subscapular", "se"],
    abdominal: ["abdominal", "abdomen", "abdômen", "dobra abdominal", "abdominal vertical", "abd"],
    suprailiaca: ["suprailiaca", "suprailíaca", "supra iliaca", "supra-ilíaca", "suprailiac", "supra", "si"],
    coxa: ["coxa", "thigh", "coxa medial", "coxa media", "coxa média", "cx"],
  };

  const aliasToFold = new Map<string, DobraKey>();
  for (const [fold, aliases] of Object.entries(foldAliases) as [DobraKey, string[]][]) {
    aliases.forEach((alias) => aliasToFold.set(normalizeKey(alias), fold));
  }

  const findFoldByLabel = (label: unknown) => {
    const normalized = normalizeKey(String(label ?? ""));
    if (!normalized) return null;
    for (const [alias, fold] of aliasToFold.entries()) {
      if (normalized === alias || normalized.includes(alias) || alias.includes(normalized)) return fold;
    }
    return null;
  };

  const setFold = (key: DobraKey | null, value: unknown) => {
    if (!key || values[key]) return;
    const parsed = normalizeNumberText(value);
    const numeric = num(parsed);
    if (parsed && numeric >= 2 && numeric <= 80) values[key] = parsed;
  };

  const isOneOf = (key: string, options: string[]) => {
    const normalized = normalizeKey(key);
    return options.some((option) => normalized === normalizeKey(option));
  };

  const extractNumbersFromText = (text: string) =>
    [...text.matchAll(/\b\d{1,3}(?:[,.]\d+)?\b/g)]
      .map((m) => m[0].replace(",", "."))
      .filter((value) => {
        const n = num(value);
        return n >= 2 && n <= 80;
      });

  const fillByStandardOrder = (source: unknown[]) => {
    const orderedNumbers = source
      .map((value) => normalizeNumberText(value))
      .filter((value) => value && num(value) >= 2 && num(value) <= 80);
    if (orderedNumbers.length >= 7) {
      expectedOrder.forEach((fold, index) => setFold(fold, orderedNumbers[index]));
    }
  };

  const walk = (obj: unknown) => {
    if (!obj) return;
    if (typeof obj === "string") {
      textoLido ||= obj.slice(0, 1200);
      const normalizedText = normalizeKey(obj);
      for (const [fold, aliases] of Object.entries(foldAliases) as [DobraKey, string[]][]) {
        if (values[fold]) continue;
        for (const alias of aliases) {
          const rx = new RegExp(`${escapeRegex(alias).replace(/\s+/g, "\\s*")}[^0-9]{0,80}(\\d{1,3}(?:[,.]\\d+)?)`, "i");
          const match = obj.match(rx);
          if (match?.[1]) {
            setFold(fold, match[1]);
            break;
          }
        }
      }
      const compactText = normalizedText;
      for (const [fold, aliases] of Object.entries(foldAliases) as [DobraKey, string[]][]) {
        if (values[fold]) continue;
        for (const alias of aliases) {
          const compactAlias = normalizeKey(alias);
          const compactMatch = compactText.match(new RegExp(`${compactAlias}.{0,50}?(\\d{1,3}(?:[,.]\\d+)?)`));
          if (compactMatch?.[1]) {
            setFold(fold, compactMatch[1]);
            break;
          }
        }
      }
      const mentionedFolds = expectedOrder.filter((fold) => foldAliases[fold].some((alias) => normalizedText.includes(normalizeKey(alias)))).length;
      if (mentionedFolds >= 4) fillByStandardOrder(extractNumbersFromText(obj));
      return;
    }
    if (Array.isArray(obj)) {
      if (obj.length >= 7 && obj.every((item) => typeof item === "number" || typeof item === "string")) fillByStandardOrder(obj);
      obj.forEach(walk);
      return;
    }
    if (typeof obj !== "object") return;

    const entries = Object.entries(obj as Record<string, unknown>);
    const labelEntry = entries.find(([k]) =>
      isOneOf(k, ["nome", "name", "label", "dobra", "medida", "campo", "tipo", "local", "regiao", "região", "ponto", "site", "campo_lido"]),
    );
    const valueEntry = entries.find(([k]) =>
      isOneOf(k, ["valor", "value", "mm", "valor mm", "valor_mm", "medicao", "medição", "resultado", "medida_mm", "dobra_mm", "milimetros", "milímetros"]),
    );
    if (labelEntry && valueEntry) setFold(findFoldByLabel(labelEntry[1]), valueEntry[1]);

    const normalizedKeys = entries.map(([k]) => normalizeKey(k));
    const looksLikeDobrasObject = expectedOrder.filter((fold) =>
      foldAliases[fold].some((alias) => normalizedKeys.some((key) => key === normalizeKey(alias) || key.includes(normalizeKey(alias)))),
    ).length >= 4;
    if (looksLikeDobrasObject) {
      expectedOrder.forEach((fold) => {
        const match = entries.find(([k]) => foldAliases[fold].some((alias) => normalizeKey(k) === normalizeKey(alias) || normalizeKey(k).includes(normalizeKey(alias))));
        if (match) setFold(fold, match[1]);
      });
    }

    const orderedListEntry = entries.find(([k, value]) =>
      ["valores", "values", "medidas", "dobras", "lista", "ordemjacksonpollock", "ordem"].includes(normalizeKey(k)) && Array.isArray(value),
    );
    if (orderedListEntry && Array.isArray(orderedListEntry[1])) fillByStandardOrder(orderedListEntry[1]);

    for (const [rawKey, value] of entries) {
      const key = normalizeKey(rawKey);
      if (["soma7dobras", "soma_7_dobras", "somadobras", "soma", "totaldobras", "totalmm"].includes(key)) {
        const parsed = Number(normalizeNumberText(value));
        if (Number.isFinite(parsed) && parsed > 0) somaDobras ??= parsed;
      }
      if (["bfpctestimado", "bf_pct_estimado", "percentualgordura", "percentual_gordura", "gorduracorporal", "bodyfat"].includes(key)) {
        const parsed = Number(normalizeNumberText(value));
        if (Number.isFinite(parsed) && parsed > 0) bfEstimado ??= parsed;
      }
      if (["avisoestimativa", "aviso", "disclaimer", "observacao", "observacoes"].includes(key) && typeof value === "string") aviso ||= value;
      if (["fonteurl", "fonte_url", "source", "sourceurl", "referencia"].includes(key) && typeof value === "string") fonteUrl ||= value;
      if (["promptutilizado", "prompt_utilizado", "prompt"].includes(key) && typeof value === "string") promptUtilizado ||= value;
      if (["textolido", "texto", "ocr", "transcricao", "transcription", "rawtext", "conteudo", "content", "observacoes"].includes(key)) {
        textoLido ||= String(value || "").slice(0, 1200);
        walk(String(value || ""));
      }
      setFold(findFoldByLabel(rawKey), value);
      walk(value);
    }
  };

  walk(payload);

  const next: Record<DobraKey, string> = {
    peitoral: values.peitoral || current.peitoral,
    axilarMedia: values.axilarMedia || current.axilarMedia,
    triceps: values.triceps || current.triceps,
    subescapular: values.subescapular || current.subescapular,
    abdominal: values.abdominal || current.abdominal,
    suprailiaca: values.suprailiaca || current.suprailiaca,
    coxa: values.coxa || current.coxa,
  };

  return { next, foundCount: Object.keys(values).length, somaDobras, bfEstimado, aviso, fonteUrl, promptUtilizado, textoLido };
};

export default function JacksonPollockCalculator({
  open,
  onOpenChange,
  alunoId,
  tenantId,
  pesoInicial,
  idadeInicial,
  sexoInicial,
  alturaInicial,
  alunoNomeInicial,
  onSaved,
}: Props) {
  const [dobras, setDobras] = useState<Record<DobraKey, string>>(createEmptyDobras);
  const [idade, setIdade] = useState<string>(idadeInicial ? String(idadeInicial) : "");
  const [peso, setPeso] = useState<string>(pesoInicial ? String(pesoInicial) : "");
  const [sexo, setSexo] = useState<Sexo>(
    (sexoInicial?.toUpperCase().startsWith("F") ? "F" : "M") as Sexo,
  );
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIdade(idadeInicial ? String(idadeInicial) : "");
    setPeso(pesoInicial ? String(pesoInicial) : "");
    setSexo((sexoInicial?.toUpperCase().startsWith("F") ? "F" : "M") as Sexo);
    setDobras(createEmptyDobras());
    setAiAnalysis(null);
  }, [alunoId, idadeInicial, pesoInicial, sexoInicial]);

  useEffect(() => {
    if (!open || !alunoId) return;
    let cancelled = false;

    const loadSavedEvaluation = async () => {
      let query = supabase
        .from("avaliacoes_fisicas")
        .select(
          "idade, peso_kg, sexo, dobra_peitoral, dobra_axilar_media, dobra_triceps, dobra_subescapular, dobra_abdominal, dobra_suprailiaca, dobra_coxa, ia_estimativa_dobras, ia_estimativa_soma_mm, ia_estimativa_bf_pct, ia_estimativa_aviso, ia_estimativa_fonte_url, ia_estimativa_prompt",
        )
        .eq("aluno_id", alunoId)
        .order("data", { ascending: false })
        .limit(1);

      if (tenantId) query = query.eq("tenant_id", tenantId);

      const { data, error } = await query.maybeSingle();
      if (cancelled || error || !data) return;

      const saved = data as any;
      const savedDobras: Record<DobraKey, string> = {
        peitoral: normalizeNumberText(saved.dobra_peitoral),
        axilarMedia: normalizeNumberText(saved.dobra_axilar_media),
        triceps: normalizeNumberText(saved.dobra_triceps),
        subescapular: normalizeNumberText(saved.dobra_subescapular),
        abdominal: normalizeNumberText(saved.dobra_abdominal),
        suprailiaca: normalizeNumberText(saved.dobra_suprailiaca),
        coxa: normalizeNumberText(saved.dobra_coxa),
      };

      setDobras(savedDobras);
      if (saved.idade) setIdade(String(saved.idade));
      if (saved.peso_kg) setPeso(String(saved.peso_kg));
      if (saved.sexo) setSexo(String(saved.sexo).toUpperCase().startsWith("F") ? "F" : "M");

      if (saved.ia_estimativa_dobras) {
        const aiDobras: Record<DobraKey, string> = {
          peitoral: foldValueFromSavedJson(saved.ia_estimativa_dobras, "peitoral"),
          axilarMedia: foldValueFromSavedJson(saved.ia_estimativa_dobras, "axilarMedia"),
          triceps: foldValueFromSavedJson(saved.ia_estimativa_dobras, "triceps"),
          subescapular: foldValueFromSavedJson(saved.ia_estimativa_dobras, "subescapular"),
          abdominal: foldValueFromSavedJson(saved.ia_estimativa_dobras, "abdominal"),
          suprailiaca: foldValueFromSavedJson(saved.ia_estimativa_dobras, "suprailiaca"),
          coxa: foldValueFromSavedJson(saved.ia_estimativa_dobras, "coxa"),
        };
        const foundCount = DOBRAS.filter((d) => !!aiDobras[d.key]).length;
        if (foundCount > 0) {
          setAiAnalysis({
            dobras: aiDobras,
            foundCount,
            somaDobras: saved.ia_estimativa_soma_mm ?? null,
            bfEstimado: saved.ia_estimativa_bf_pct ?? null,
            aviso: saved.ia_estimativa_aviso || AI_ESTIMATE_WARNING,
            fonteUrl: saved.ia_estimativa_fonte_url || JACKSON_POLLOCK_SOURCE_URL,
            promptUtilizado: saved.ia_estimativa_prompt || SEVEN_FOLD_VISUAL_PROMPT,
          });
        }
      }
    };

    void loadSavedEvaluation();

    return () => {
      cancelled = true;
    };
  }, [open, alunoId, tenantId]);

  const calc = useMemo(() => {
    const soma = DOBRAS.reduce((acc, d) => acc + num(dobras[d.key]), 0);
    const idadeN = num(idade);
    const pesoN = num(peso);
    if (soma <= 0 || idadeN <= 0 || pesoN <= 0) return null;

    const BD =
      sexo === "M"
        ? 1.112 - 0.00043499 * soma + 0.00000055 * soma * soma - 0.00028826 * idadeN
        : 1.097 - 0.00046971 * soma + 0.00000056 * soma * soma - 0.00012828 * idadeN;
    const bf = 495 / BD - 450;
    const massaGorda = pesoN * (bf / 100);
    const massaMagra = pesoN - massaGorda;
    return { soma, bf, massaGorda, massaMagra };
  }, [dobras, idade, peso, sexo]);

  const aiProjection = useMemo(() => {
    if (!aiAnalysis) return null;
    const soma = DOBRAS.reduce((acc, d) => acc + num(aiAnalysis.dobras[d.key]), 0);
    const idadeN = num(idade);
    let bf = aiAnalysis.bfEstimado ?? null;
    if (soma > 0 && idadeN > 0) {
      const BD =
        sexo === "M"
          ? 1.112 - 0.00043499 * soma + 0.00000055 * soma * soma - 0.00028826 * idadeN
          : 1.097 - 0.00046971 * soma + 0.00000056 * soma * soma - 0.00012828 * idadeN;
      bf = 495 / BD - 450;
    }
    return { soma: soma || aiAnalysis.somaDobras || null, bf: bf && Number.isFinite(bf) ? bf : null };
  }, [aiAnalysis, idade, sexo]);

  const handleSave = async () => {
    if (!calc) {
      toast.error("Preencha todas as dobras, idade e peso.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        aluno_id: alunoId,
        tenant_id: tenantId ?? null,
        peso_kg: num(peso),
        altura_cm: alturaInicial ?? 0,
        idade: num(idade),
        sexo,
        metodo: "jackson_pollock_7",
        bf_pct_calculado: Number(calc.bf.toFixed(2)),
        massa_gorda_kg: Number(calc.massaGorda.toFixed(2)),
        massa_magra_kg: Number(calc.massaMagra.toFixed(2)),
        dobra_peitoral: num(dobras.peitoral),
        dobra_axilar_media: num(dobras.axilarMedia),
        dobra_triceps: num(dobras.triceps),
        dobra_subescapular: num(dobras.subescapular),
        dobra_abdominal: num(dobras.abdominal),
        dobra_suprailiaca: num(dobras.suprailiaca),
        dobra_coxa: num(dobras.coxa),
      };

      if (aiAnalysis && aiAnalysis.foundCount > 0) {
        payload.ia_estimativa_dobras = aiAnalysis.dobras;
        payload.ia_estimativa_soma_mm = aiProjection?.soma ? Number(aiProjection.soma.toFixed(2)) : null;
        payload.ia_estimativa_bf_pct = aiProjection?.bf ? Number(aiProjection.bf.toFixed(2)) : null;
        payload.ia_estimativa_prompt = aiAnalysis.promptUtilizado || SEVEN_FOLD_VISUAL_PROMPT;
        payload.ia_estimativa_aviso = aiAnalysis.aviso || AI_ESTIMATE_WARNING;
        payload.ia_estimativa_fonte_url = aiAnalysis.fonteUrl || JACKSON_POLLOCK_SOURCE_URL;
      }

      const { error } = await supabase.from("avaliacoes_fisicas").insert(payload);
      if (error) throw error;
      toast.success("Protocolo 7 Dobras salvo!");
      onSaved?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setImporting(true);
    const toastId = toast.loading("Dr. IA analisando as dobras...");
    
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
          fileType: file.type || "image/jpeg",
          importType: "7dobras",
          alunoId: alunoId,
          tenantId: tenantId,
          dryRun: true,
        },
      });

      if (error) throw error;
      
      const ext = data?.extractedData || data?.data || data;
      if (ext && typeof ext === "object") {
        const { next, foundCount, textoLido, somaDobras, bfEstimado, aviso, fonteUrl, promptUtilizado } = extractSevenFolds(ext, createEmptyDobras());
        setAiAnalysis({ dobras: next, foundCount, textoLido, somaDobras, bfEstimado, aviso, fonteUrl, promptUtilizado });
        if (foundCount === 0) {
          toast.warning("Dr. IA analisou a foto, mas não identificou valores em mm suficientes.", { id: toastId });
        } else {
          setDobras((prev) => {
            const merged = { ...prev };
            DOBRAS.forEach((d) => {
              if (next[d.key]) merged[d.key] = next[d.key];
            });
            return merged;
          });
          toast.success(`Dr. IA preencheu ${foundCount} dobra(s). Clique em Salvar Protocolo para manter no histórico.`, { id: toastId });
        }
      } else {
        throw new Error("Não foi possível extrair dados do arquivo.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Falha ao importar: ${e.message}`, { id: toastId });
    } finally {
      setImporting(false);
    }
  };

  const aplicarAnaliseIa = () => {
    if (!aiAnalysis) return;
    setDobras((prev) => {
      const next = { ...prev };
      DOBRAS.forEach((d) => {
        if (aiAnalysis.dobras[d.key]) next[d.key] = aiAnalysis.dobras[d.key];
      });
      return next;
    });
    toast.success("Dobras estimadas pela IA aplicadas nos campos manuais.");
  };

  const baixarPdf = async () => {
    if (!calc) {
      toast.error("Preencha todas as dobras, idade e peso.");
      return;
    }
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    // Busca coach + aluno para cabeçalho premium
    let coachNome: string | null = null;
    let coachLogo: string | null = null;
    let alunoNome: string | null = null;
    try {
      if (tenantId) {
        const { data } = await supabase
          .from("tenants")
          .select("nome, logo_url")
          .eq("id", tenantId)
          .maybeSingle();
        coachNome = (data as any)?.nome || null;
        coachLogo = (data as any)?.logo_url || null;
      }
      if (alunoNomeInicial) {
        alunoNome = alunoNomeInicial;
      } else if (alunoId) {
        const { data } = await supabase
          .from("perfis")
          .select("nome_completo")
          .eq("id", alunoId)
          .maybeSingle();
        alunoNome = (data as any)?.nome_completo || null;
      }
    } catch {
      /* segue sem branding */
    }

    const logo = await loadImageDataUrl(coachLogo);
    let y = renderPdfHeader({
      doc,
      title: "PROTOCOLO 7 DOBRAS",
      subtitle: "Jackson & Pollock — Bioestatística de Competição",
      coachName: coachNome,
      studentName: alunoNome,
      logo,
    });

    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Dados do atleta", 14, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(
      `Sexo: ${sexo === "M" ? "Masculino" : "Feminino"}   •   Idade: ${idade} anos   •   Peso: ${peso} kg`,
      14,
      y,
    );
    y += 10;

    autoTable(doc, {
      startY: y,
      head: [["Dobra cutânea", "Medida (mm)"]],
      body: DOBRAS.map((d) => [d.label, dobras[d.key] || "—"]),
      theme: "striped",
      styles: { fontSize: 12, cellPadding: 3.5 },
      headStyles: { fillColor: [20, 20, 20], textColor: 255, fontStyle: "bold", fontSize: 12.5 },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: "auto", halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    autoTable(doc, {
      startY: y,
      head: [["Resultado", "Valor"]],
      body: [
        ["Soma das 7 dobras", `${calc.soma.toFixed(1)} mm`],
        ["Percentual de gordura (BF%)", `${calc.bf.toFixed(2)} %`],
        ["Massa gorda", `${calc.massaGorda.toFixed(2)} kg`],
        ["Massa magra", `${calc.massaMagra.toFixed(2)} kg`],
      ],
      theme: "striped",
      styles: { fontSize: 12.5, cellPadding: 4 },
      headStyles: { fillColor: [229, 9, 20], textColor: 255, fontStyle: "bold", fontSize: 13 },
      columnStyles: {
        0: { cellWidth: 90, fontStyle: "bold" },
        1: { cellWidth: "auto", halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    doc.save(`protocolo_7_dobras_${Date.now()}.pdf`);
    toast.success("Protocolo baixado em PDF!");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-[#0a0a0a] border-none text-white p-0 shadow-2xl">
        {/* Netflix Style Header */}
        <div className="sticky top-0 z-20 bg-gradient-to-b from-black to-transparent p-8 pb-4">
          <div className="flex items-center gap-2 text-primary mb-2">
            <motion.div
              initial={{ rotate: -180, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              transition={{ duration: 0.8 }}
            >
              <Ruler className="h-6 w-6" />
            </motion.div>
            <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-white/60">
              ESTATÍSTICAS VITAIS
            </span>
          </div>
          <motion.h1 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="font-display text-4xl md:text-5xl uppercase tracking-tighter"
          >
            Protocolo <span className="text-primary">7 Dobras</span>
          </motion.h1>
          <p className="text-sm text-white/40 uppercase tracking-widest mt-2">
            Jackson & Pollock · Bioestatística de Competição
          </p>
        </div>

        <div className="px-8 pb-8 grid md:grid-cols-[1fr_320px] gap-8">
          <div className="space-y-8">
            {/* Seção 1: Dados Base */}
            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full" />
                DADOS DO ATLETA
              </h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-white/40">Idade</Label>
                  <Input
                    type="number"
                    value={idade}
                    onChange={(e) => setIdade(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 focus:border-primary/50 text-xl font-bold rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-white/40">Peso (kg)</Label>
                  <Input
                    type="number"
                    value={peso}
                    onChange={(e) => setPeso(e.target.value)}
                    className="h-12 bg-white/5 border-white/10 focus:border-primary/50 text-xl font-bold rounded-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-white/40">Sexo</Label>
                  <Select value={sexo} onValueChange={(v) => setSexo(v as Sexo)}>
                    <SelectTrigger className="h-12 bg-white/5 border-white/10 focus:border-primary/50 text-sm font-bold rounded-none uppercase">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Seção 2: Dobras */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                  <span className="w-1 h-4 bg-primary rounded-full" />
                  MEDIÇÕES DE ADIPÔMETRO (mm)
                </h2>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleImportFile(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 border-primary/40 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary/5"
                >
                  {importing ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1" />
                  )}
                  Importar via Foto
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {DOBRAS.map((d, index) => (
                  <motion.div 
                    key={d.key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    <Label className="text-[10px] uppercase tracking-widest text-white/40 leading-none">{d.label}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={dobras[d.key]}
                      onChange={(e) => setDobras((prev) => ({ ...prev, [d.key]: e.target.value }))}
                      className="h-12 bg-white/5 border-white/10 focus:border-primary/50 text-xl font-bold rounded-none text-primary"
                    />
                  </motion.div>
                ))}
              </div>
            </section>

            {aiAnalysis && (
              <section className="space-y-4 border border-primary/30 bg-primary/5 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                    <span className="w-1 h-4 bg-primary rounded-full" />
                    DADOS DAS 7 DOBRAS POR IA
                  </h2>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={aplicarAnaliseIa}
                    disabled={aiAnalysis.foundCount === 0}
                    className="h-8 border-primary/40 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary/10"
                  >
                    Usar dobras da IA
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {DOBRAS.map((d) => (
                    <div key={`ia-${d.key}`} className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-widest text-white/40 leading-none">{d.label}</Label>
                      <Input
                        readOnly
                        value={aiAnalysis.dobras[d.key] || "—"}
                        className="h-11 bg-black/30 border-white/10 text-lg font-bold rounded-none text-primary"
                      />
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Soma estimada</p>
                    <p className="text-2xl font-display font-bold text-white tabular-nums">
                      {aiProjection?.soma ? `${aiProjection.soma.toFixed(1)} mm` : "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Gordura estimada</p>
                    <p className="text-2xl font-display font-bold text-primary tabular-nums">
                      {aiProjection?.bf ? `${aiProjection.bf.toFixed(1)}%` : "—"}
                    </p>
                  </div>
                </div>

                <p className="border-l-2 border-primary/50 pl-3 text-[11px] leading-relaxed text-white/55">
                  <span className="font-bold text-white/70">Aviso: </span>
                  {aiAnalysis.aviso || AI_ESTIMATE_WARNING}{" "}
                  <a
                    href={aiAnalysis.fonteUrl || JACKSON_POLLOCK_SOURCE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Ver referência científica
                  </a>
                </p>

                {aiAnalysis.textoLido && (
                  <div className="border-t border-white/10 pt-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2">Leitura da foto</p>
                    <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-white/50">
                      {aiAnalysis.textoLido}
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Lateral: Resultados (Style Sidebar) */}
          <aside className="space-y-6">
            <div className="bg-white/5 border border-white/10 p-6 rounded-none space-y-8 min-h-[400px] flex flex-col">
              <h2 className="text-center text-xs font-bold uppercase tracking-[0.3em] text-white/40">PROJEÇÃO FINAL</h2>
              
              <AnimatePresence mode="wait">
                {calc ? (
                  <motion.div 
                    key="results"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="space-y-8 flex-1 flex flex-col justify-center"
                  >
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Gordura Corporal</p>
                      <p className="text-6xl font-display font-bold text-primary tabular-nums tracking-tighter">
                        {calc.bf.toFixed(1)}<span className="text-2xl text-white/20 ml-1">%</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-white/5 border border-white/5">
                        <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Massa Magra</p>
                        <p className="text-xl font-bold text-white tabular-nums">{calc.massaMagra.toFixed(1)}kg</p>
                      </div>
                      <div className="text-center p-3 bg-white/5 border border-white/5">
                        <p className="text-[9px] uppercase tracking-widest text-white/40 mb-1">Massa Gorda</p>
                        <p className="text-xl font-bold text-white tabular-nums">{calc.massaGorda.toFixed(1)}kg</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/10">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/40">
                        <span>Soma das Dobras</span>
                        <span className="text-white font-bold">{calc.soma.toFixed(1)} mm</span>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col items-center justify-center text-center px-4"
                  >
                    <Info className="h-12 w-12 text-white/10 mb-4" />
                    <p className="text-xs uppercase tracking-widest text-white/40 leading-relaxed">
                      Aguardando medições para processar o perfil físico do atleta
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3 pt-6">
                <PhysicalEvaluationScienceFooter variant="jackson" className="pb-2" />
                <Button
                  onClick={handleSave}
                  disabled={saving || !calc}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-widest text-xs rounded-none shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                >
                  {saving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    "SALVAR PROTOCOLO"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={baixarPdf}
                  disabled={!calc}
                  className="w-full h-12 border-white/20 text-white hover:bg-white/10 font-bold uppercase tracking-widest text-xs rounded-none gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  Baixar PDF
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="w-full h-10 text-white/40 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] rounded-none"
                >
                  CANCELAR
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
