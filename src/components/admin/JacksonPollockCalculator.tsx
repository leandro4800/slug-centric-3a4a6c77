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

const num = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
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
  const [dobras, setDobras] = useState<Record<DobraKey, string>>({
    peitoral: "",
    axilarMedia: "",
    triceps: "",
    subescapular: "",
    abdominal: "",
    suprailiaca: "",
    coxa: "",
  });
  const [idade, setIdade] = useState<string>(idadeInicial ? String(idadeInicial) : "");
  const [peso, setPeso] = useState<string>(pesoInicial ? String(pesoInicial) : "");
  const [sexo, setSexo] = useState<Sexo>(
    (sexoInicial?.toUpperCase().startsWith("F") ? "F" : "M") as Sexo,
  );
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIdade(idadeInicial ? String(idadeInicial) : "");
    setPeso(pesoInicial ? String(pesoInicial) : "");
    setSexo((sexoInicial?.toUpperCase().startsWith("F") ? "F" : "M") as Sexo);
  }, [alunoId, idadeInicial, pesoInicial, sexoInicial]);

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

  const handleSave = async () => {
    if (!calc) {
      toast.error("Preencha todas as dobras, idade e peso.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("avaliacoes_fisicas").insert({
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
      });
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
          fileType: file.type,
          importType: "7dobras",
          alunoId: alunoId,
          tenantId: tenantId,
          dryRun: true,
        },
      });

      if (error) throw error;
      
      const ext = data?.extractedData || data?.data;
      if (ext) {
        // A IA retorna dobras aninhadas em ext.dobras (snake_case). Aceitamos também valores no nível raiz como fallback.
        const d = ext.dobras || {};
        const pick = (a: any, b: any, c: any) => {
          const v = a ?? b ?? c;
          return v !== undefined && v !== null && v !== "" ? String(v) : "";
        };
        setDobras({
          peitoral: pick(d.peitoral, ext.peitoral, dobras.peitoral) || dobras.peitoral,
          axilarMedia: pick(d.axilar_media, ext.axilar_media ?? ext.axilarMedia, dobras.axilarMedia) || dobras.axilarMedia,
          triceps: pick(d.triceps, ext.triceps, dobras.triceps) || dobras.triceps,
          subescapular: pick(d.subescapular, ext.subescapular, dobras.subescapular) || dobras.subescapular,
          abdominal: pick(d.abdominal, ext.abdominal, dobras.abdominal) || dobras.abdominal,
          suprailiaca: pick(d.suprailiaca, ext.suprailiaca, dobras.suprailiaca) || dobras.suprailiaca,
          coxa: pick(d.coxa, ext.coxa, dobras.coxa) || dobras.coxa,
        });
        if (ext.peso) setPeso(String(ext.peso));
        if (ext.idade) setIdade(String(ext.idade));
        toast.success("Dobras extraídas com sucesso!", { id: toastId });
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
