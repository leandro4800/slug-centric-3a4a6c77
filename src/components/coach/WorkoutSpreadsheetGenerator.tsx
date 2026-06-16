import { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  FileText,
  Sparkles,
  Mars,
  Venus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Exercicio {
  nome: string;
  series: string;
  repeticoes: string;
  intervalo: string;
  tecnica?: string;
}
interface Treino {
  nome: string;
  exercicios: Exercicio[];
}
interface PlanoIA {
  title: string;
  recomendacoes: string;
  divisao: string[];
  workouts: Treino[];
}

const csvSafe = (v: string) => {
  const s = String(v ?? "");
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function buildCsv(plan: PlanoIA) {
  const lines: string[] = [];
  lines.push("Metodologia Alpha - Planilha Premium");
  lines.push(`Plano:,${csvSafe(plan.title)}`);
  if (plan.recomendacoes) lines.push(`Recomendacoes:,${csvSafe(plan.recomendacoes)}`);
  if (plan.divisao?.length) {
    lines.push("");
    lines.push("Divisao Semanal");
    plan.divisao.forEach((d) => lines.push(csvSafe(d)));
  }
  plan.workouts.forEach((w) => {
    lines.push("");
    lines.push(csvSafe(w.nome));
    lines.push("Exercicio,Series,Repeticoes,Intervalo,Tecnica");
    w.exercicios.forEach((ex) => {
      lines.push(
        [ex.nome, ex.series, ex.repeticoes, ex.intervalo, ex.tecnica || ""]
          .map(csvSafe)
          .join(","),
      );
    });
  });
  return lines.join("\n");
}

function downloadCsv(plan: PlanoIA) {
  const csv = buildCsv(plan);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `planilha_${plan.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadPdf(plan: PlanoIA) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  // Cabeçalho
  doc.setFillColor(229, 9, 20); // Netflix red
  doc.rect(0, 0, pageW, 22, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("METODOLOGIA ALPHA — PLANILHA PREMIUM", pageW / 2, 14, { align: "center" });

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(plan.title, 14, 32, { maxWidth: pageW - 28 });

  let y = 40;
  if (plan.recomendacoes) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(plan.recomendacoes, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 4 + 4;
  }

  if (plan.divisao?.length) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Divisão Semanal", 14, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    plan.divisao.forEach((d) => {
      doc.text(`• ${d}`, 16, y);
      y += 4.5;
    });
    y += 4;
  }

  plan.workouts.forEach((w) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    autoTable(doc, {
      startY: y,
      head: [[w.nome]],
      body: [],
      theme: "plain",
      headStyles: { fillColor: [20, 20, 20], textColor: 255, fontSize: 11, fontStyle: "bold" },
      margin: { left: 14, right: 14 },
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      head: [["Exercício", "Séries", "Reps", "Interv.", "Técnica"]],
      body: w.exercicios.map((ex) => [
        ex.nome,
        ex.series,
        ex.repeticoes,
        ex.intervalo,
        ex.tecnica || "—",
      ]),
      theme: "striped",
      styles: { fontSize: 8.5, cellPadding: 2 },
      headStyles: { fillColor: [229, 9, 20], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 55 },
        1: { cellWidth: 38 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: "auto" },
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  });

  doc.save(`planilha_${plan.title.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.pdf`);
}

export const WorkoutSpreadsheetGenerator = () => {
  const [sexo, setSexo] = useState<"masculino" | "feminino" | "">("");
  const [nivel, setNivel] = useState("");
  const [frequencia, setFrequencia] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [foco, setFoco] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [plano, setPlano] = useState<PlanoIA | null>(null);

  const handleGerar = async () => {
    if (!sexo || !nivel || !frequencia || !objetivo) {
      toast.error("Preencha sexo, nível, frequência e objetivo.");
      return;
    }
    setLoading(true);
    setPlano(null);
    try {
      const { data, error } = await supabase.functions.invoke("gerar-planilha-treino", {
        body: {
          sexo,
          nivel,
          frequencia: Number(frequencia),
          objetivo,
          foco,
          observacoes,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const p = (data as any)?.plano as PlanoIA;
      if (!p?.workouts?.length) throw new Error("IA não retornou treinos.");
      setPlano(p);
      toast.success("Planilha premium gerada com IA!");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao gerar planilha.");
    } finally {
      setLoading(false);
    }
  };

  const objetivosFem = ["Hipertrofia de Glúteo", "Definição", "Hipertrofia Geral", "Emagrecimento", "Tônus / Funcional"];
  const objetivosMasc = ["Hipertrofia", "Força", "Definição", "Emagrecimento", "Powerbuilding"];

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold">Gerar Planilha Premium com IA</h4>
            <p className="text-xs text-muted-foreground">
              Personalize por sexo, nível e objetivo. A IA monta volume completo (5+ exercícios para musculaturas grandes).
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest opacity-70">Sexo</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={sexo === "masculino" ? "default" : "outline"}
                onClick={() => setSexo("masculino")}
                className="h-12 gap-2"
              >
                <Mars className="h-4 w-4" /> Masculino
              </Button>
              <Button
                type="button"
                variant={sexo === "feminino" ? "default" : "outline"}
                onClick={() => setSexo("feminino")}
                className="h-12 gap-2"
              >
                <Venus className="h-4 w-4" /> Feminino
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest opacity-70">Nível</label>
            <Select value={nivel} onValueChange={setNivel}>
              <SelectTrigger className="bg-black/20 rounded-xl h-12">
                <SelectValue placeholder="Escolha o nível..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Iniciante">Iniciante</SelectItem>
                <SelectItem value="Intermediário">Intermediário</SelectItem>
                <SelectItem value="Avançado">Avançado</SelectItem>
                <SelectItem value="Atleta">Atleta / Alto Nível</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest opacity-70">Frequência semanal</label>
            <Select value={frequencia} onValueChange={setFrequencia}>
              <SelectTrigger className="bg-black/20 rounded-xl h-12">
                <SelectValue placeholder="Dias por semana..." />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}x na semana
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest opacity-70">Objetivo</label>
            <Select value={objetivo} onValueChange={setObjetivo}>
              <SelectTrigger className="bg-black/20 rounded-xl h-12">
                <SelectValue placeholder="Objetivo principal..." />
              </SelectTrigger>
              <SelectContent>
                {(sexo === "feminino" ? objetivosFem : objetivosMasc).map((o) => (
                  <SelectItem key={o} value={o}>{o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest opacity-70">
            Foco extra (opcional)
          </label>
          <Input
            value={foco}
            onChange={(e) => setFoco(e.target.value)}
            placeholder="Ex: priorizar glúteo, melhorar postura, ganho de braços..."
            className="bg-black/20 rounded-xl h-11"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest opacity-70">
            Observações do coach (opcional)
          </label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Lesões, restrições, equipamentos disponíveis..."
            className="bg-black/20 rounded-xl min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleGerar}
          disabled={loading}
          className="w-full h-12 gap-2 rounded-xl text-md font-bold"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" /> Gerando com IA...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" /> Gerar Planilha Premium
            </>
          )}
        </Button>
      </div>

      {plano && (
        <div className="bg-card border border-primary/40 rounded-2xl p-6 space-y-5 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-1">
              <p className="text-sm text-primary font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {plano.title}
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wider">
                <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-bold">
                  {plano.workouts.length} treinos
                </span>
                <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground font-bold">
                  {plano.workouts.reduce((a, w) => a + w.exercicios.length, 0)} exercícios
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => downloadPdf(plano)} className="gap-2 rounded-xl">
                <Download className="h-4 w-4" /> PDF
              </Button>
              <Button onClick={() => downloadCsv(plano)} variant="outline" className="gap-2 rounded-xl">
                <FileSpreadsheet className="h-4 w-4" /> CSV
              </Button>
            </div>
          </div>

          {plano.recomendacoes && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {plano.recomendacoes}
            </p>
          )}

          {plano.divisao?.length > 0 && (
            <div className="bg-black/20 rounded-xl p-3 space-y-1">
              <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-2">
                Divisão Semanal
              </p>
              {plano.divisao.map((d, i) => (
                <p key={i} className="text-xs">• {d}</p>
              ))}
            </div>
          )}

          <div className="space-y-4">
            {plano.workouts.map((w, i) => (
              <div key={i} className="border border-border/40 rounded-xl overflow-hidden">
                <div className="bg-primary/10 px-4 py-2">
                  <p className="font-bold text-sm">{w.nome}</p>
                </div>
                <div className="divide-y divide-border/40">
                  {w.exercicios.map((ex, j) => (
                    <div key={j} className="px-4 py-3 space-y-1">
                      <p className="font-semibold text-sm">{ex.nome}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span><strong className="text-foreground">Séries:</strong> {ex.series}</span>
                        <span><strong className="text-foreground">Reps:</strong> {ex.repeticoes}</span>
                        <span><strong className="text-foreground">Interv:</strong> {ex.intervalo}</span>
                        {ex.tecnica && <span><strong className="text-foreground">Técnica:</strong> {ex.tecnica}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card/50 border border-border/40 rounded-2xl p-6">
        <h5 className="font-bold text-sm mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Como funciona
        </h5>
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p>
            A IA da <strong>Metodologia Alpha</strong> monta planilhas premium com volume real:
            costas, quadríceps, posterior, peitoral e glúteo recebem no mínimo 5 exercícios por sessão.
          </p>
          <p>
            Treinos femininos priorizam glúteo, posterior e quadríceps com técnicas avançadas.
            Treinos masculinos focam em hipertrofia clássica com compostos pesados.
          </p>
          <p>Baixe em <strong>PDF</strong> (entrega ao aluno) ou <strong>CSV</strong> (Excel/Sheets).</p>
        </div>
      </div>
    </div>
  );
};
