import { useMemo, useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Loader2,
  CheckCircle2,
  FileText,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { WORKOUT_PLANS, type PlanoTreino } from "@/data/workoutPlans";

const CATEGORIA_ORDEM = [
  "Iniciante",
  "Intermediário",
  "Avançado",
  "Super Avançado",
  "Feminino",
];

function csvSafe(v: string) {
  const needsQuote = /[",;\n]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function buildCsv(plan: PlanoTreino) {
  const lines: string[] = [];
  lines.push("Metodologia Alpha - Planilha de Treino");
  lines.push(`Plano:,${csvSafe(plan.title)}`);
  lines.push(`Categoria:,${csvSafe(plan.categoria)}`);
  if (plan.recomendacoes) {
    lines.push(`Recomendacoes:,${csvSafe(plan.recomendacoes)}`);
  }
  if (plan.divisao?.length) {
    lines.push("");
    lines.push("Sugestao de Divisao Semanal");
    plan.divisao.forEach((d) => lines.push(csvSafe(d)));
  }
  plan.workouts.forEach((w) => {
    lines.push("");
    lines.push(csvSafe(w.nome));
    lines.push("Exercicio,Series / Detalhes");
    w.exercicios.forEach((ex) => {
      const detalhes = ex.detalhes.length
        ? ex.detalhes.join(" | ")
        : "Conforme prescrição";
      lines.push(`${csvSafe(ex.nome)},${csvSafe(detalhes)}`);
    });
  });
  return lines.join("\n");
}

export const WorkoutSpreadsheetGenerator = () => {
  const [categoria, setCategoria] = useState<string>("");
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const categorias = useMemo(() => {
    const arr = Array.from(new Set(WORKOUT_PLANS.map((p) => p.categoria)));
    arr.sort((a, b) => {
      const ia = CATEGORIA_ORDEM.indexOf(a);
      const ib = CATEGORIA_ORDEM.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
    return arr;
  }, []);

  const planosDaCategoria = useMemo(
    () => WORKOUT_PLANS.filter((p) => p.categoria === categoria),
    [categoria],
  );

  const planoSelecionado = useMemo(
    () => WORKOUT_PLANS.find((p) => p.id === selectedPlanId),
    [selectedPlanId],
  );

  const handleDownload = () => {
    if (!planoSelecionado) {
      toast.error("Selecione um plano de treino antes de gerar a planilha.");
      return;
    }
    setIsGenerating(true);
    try {
      const csv = buildCsv(planoSelecionado);
      // BOM para Excel reconhecer acentos
      const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `planilha_${planoSelecionado.id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Planilha baixada com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar a planilha.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold">Gerar Nova Planilha</h4>
            <p className="text-xs text-muted-foreground">
              Escolha a categoria e a divisão de treino baseada na
              Metodologia Alpha.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest opacity-70">
              Categoria / Nível
            </label>
            <Select
              value={categoria}
              onValueChange={(v) => {
                setCategoria(v);
                setSelectedPlanId("");
              }}
            >
              <SelectTrigger className="bg-black/20 rounded-xl h-12">
                <SelectValue placeholder="Escolha o nível..." />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest opacity-70">
              Divisão de Treino
            </label>
            <Select
              value={selectedPlanId}
              onValueChange={setSelectedPlanId}
              disabled={!categoria}
            >
              <SelectTrigger className="bg-black/20 rounded-xl h-12">
                <SelectValue
                  placeholder={
                    categoria ? "Escolha a divisão..." : "Selecione um nível"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {planosDaCategoria.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {planoSelecionado && (
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <p className="text-sm text-primary font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {planoSelecionado.title}
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wider">
              <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-bold flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {planoSelecionado.workouts.length}{" "}
                {planoSelecionado.workouts.length === 1 ? "treino" : "treinos"}
              </span>
              <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground font-bold">
                {planoSelecionado.workouts.reduce(
                  (a, w) => a + w.exercicios.length,
                  0,
                )}{" "}
                exercícios
              </span>
              <span className="px-2 py-1 rounded-md bg-muted text-muted-foreground font-bold">
                {planoSelecionado.categoria}
              </span>
            </div>
            {planoSelecionado.recomendacoes && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                {planoSelecionado.recomendacoes}
              </p>
            )}
          </div>
        )}

        <Button
          onClick={handleDownload}
          disabled={isGenerating || !selectedPlanId}
          className="w-full h-12 gap-2 rounded-xl text-md font-bold"
        >
          {isGenerating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          Baixar Planilha de Treino
        </Button>
      </div>

      <div className="bg-card/50 border border-border/40 rounded-2xl p-6">
        <h5 className="font-bold text-sm mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Como usar este material
        </h5>
        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
          <p>
            As planilhas são geradas seguindo rigorosamente a{" "}
            <strong>Metodologia Alpha</strong>, com {WORKOUT_PLANS.length}{" "}
            divisões de treino disponíveis cobrindo desde adaptação muscular
            até protocolos avançados e específicos para o público feminino.
          </p>
          <ul className="list-disc list-inside space-y-1.5">
            <li>
              O arquivo exportado é CSV (UTF-8 com BOM), compatível com Excel
              e Google Sheets.
            </li>
            <li>
              Cada planilha inclui a sugestão de divisão semanal,
              recomendações da fase e o detalhamento das séries de aquecimento,
              ajuste e trabalho.
            </li>
            <li>
              Use este material para entregar aos alunos que preferem
              acompanhamento físico ou offline.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
