import { useState } from "react";
import { 
  FileSpreadsheet, 
  Download, 
  Loader2,
  Dumbbell,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const WORKOUT_PLANS = [
  {
    id: "adaptacao",
    title: "Adaptação Muscular (Full Body)",
    description: "Ideal para iniciantes totais ou retorno após longo tempo parado.",
    workouts: [
      { name: "Treino A", exercises: ["Supino reto (3x10-15)", "Leg 45 (3x10-15)", "Pulley frente triângulo (3x10-15)", "Flexor deitado (3x10-15)", "Elevação lateral (3x10-15)", "Tríceps corda (3x10-15)", "Panturrilha máquina (3x10-15)", "Rosca direta sentado (3x10-15)"] }
    ]
  },
  {
    id: "iniciante_etapa2",
    title: "Iniciantes - Etapa 2 (AB)",
    description: "Fase de transição após adaptação muscular.",
    workouts: [
      { name: "Treino A (Superiores)", exercises: ["Supino inclinado (3x10-15)", "Supino reto (3x10-15)", "Pulley frente aberto (3x10-15)", "Remada baixa triangulo (3x10-15)", "Desenvolvimento halteres (3x10-15)", "Elevação lateral (3x10-15)", "Tríceps corda (3x10-15)", "Rosca direta barra (3x10-15)"] },
      { name: "Treino B (Inferiores)", exercises: ["Leg 45 (3x10-15)", "Extensor (3x10-15)", "Flexor sentado (3x10-15)", "Flexor deitado (3x10-15)", "Abdutor (3x10-15)", "Panturrilha smith (3x10-15)", "Abdominal supra (3x10-15)"] }
    ]
  },
  {
    id: "intermediario_abcd",
    title: "Intermediário (ABCD)",
    description: "Treino dividido para quem já domina a execução.",
    workouts: [
      { name: "Treino A (Peito/Bíceps)", exercises: ["Supino inclinado (1x6-10 trabalho)", "Supino reto (1x6-10 trabalho + Rest Pause)", "Supino declinado (1x6-10 trabalho)", "Voador (1x10-15 trabalho + Drop Set)", "Rosca direta barra (1x6-10 trabalho)", "Rosca Scott (1x6-10 trabalho)", "Rosca direta corda (1x6-10 trabalho)", "Abdominal supra (3x15-20)"] },
      { name: "Treino B (Costas/Panturrilha)", exercises: ["Remada curvada (1x6-10 trabalho)", "Remada baixa triangulo (1x6-10 trabalho + Rest Pause)", "Remada baixa aberta (1x6-10 trabalho)", "Pulley frente triângulo (1x6-10 trabalho + Drop Set)", "Meio Terra (1x6-10 trabalho)", "Panturrilha máquina (3x6-10 trabalho)"] },
      { name: "Treino C (Ombros/Tríceps)", exercises: ["Desenvolvimento halteres (1x6-10 trabalho)", "Elevação frontal (1x6-10 trabalho + Rest Pause)", "Elevação lateral (1x6-10 trabalho)", "Elevação unilateral cabo (1x10-15 trabalho + Drop Set)", "Tríceps testa corda (1x6-10 trabalho)", "Tríceps corda (1x6-10 trabalho)", "Tríceps francês (1x6-10 trabalho)", "Abdominal infra (3x15-20)"] },
      { name: "Treino D (Pernas)", exercises: ["Panturrilha sentada (3x6-10 trabalho)", "Agachamento livre (1x6-10 trabalho)", "Leg 45 (1x6-10 trabalho + Rest Pause)", "Extensor (1x6-10 trabalho + Drop Set)", "Flexor deitado (1x6-10 trabalho + Rest Pause)", "Stiff (1x6-10 trabalho)", "Elevação de quadril (1x6-10 trabalho)"] }
    ]
  }
];

export const WorkoutSpreadsheetGenerator = () => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = () => {
    if (!selectedPlanId) {
      toast.error("Por favor, selecione um plano de treino.");
      return;
    }

    setIsGenerating(true);
    
    try {
      const plan = WORKOUT_PLANS.find(p => p.id === selectedPlanId);
      if (!plan) throw new Error("Plano não encontrado");

      // Criar conteúdo do CSV
      let csvContent = "Metodologia Pacholok - Planilha de Treino\n";
      csvContent += `Plano: ${plan.title}\n`;
      csvContent += `Descricao: ${plan.description}\n\n`;

      plan.workouts.forEach(workout => {
        csvContent += `${workout.name}\n`;
        csvContent += "Exercicio,Series/Reps\n";
        workout.exercises.forEach(ex => {
          csvContent += `${ex.replace(",", " -")}\n`;
        });
        csvContent += "\n";
      });

      // Download do arquivo
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `planilha_treino_${plan.id}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Planilha baixada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar a planilha.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/40 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold">Gerar Nova Planilha</h4>
            <p className="text-xs text-muted-foreground">Selecione uma fase da Metodologia Pacholok para exportar.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest opacity-70">Nível / Fase</label>
            <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
              <SelectTrigger className="bg-black/20 rounded-xl h-12">
                <SelectValue placeholder="Escolha uma fase..." />
              </SelectTrigger>
              <SelectContent>
                {WORKOUT_PLANS.map(plan => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPlanId && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
              <p className="text-sm text-primary font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                {WORKOUT_PLANS.find(p => p.id === selectedPlanId)?.description}
              </p>
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
      </div>

      <div className="bg-card/50 border border-border/40 rounded-2xl p-6">
        <h5 className="font-bold text-sm mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Como usar este material
        </h5>
        <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
          <p>
            As planilhas são geradas seguindo rigorosamente a <strong>Metodologia Pacholok</strong> contida no material técnico.
          </p>
          <ul className="list-disc list-inside space-y-2">
            <li>O arquivo exportado está em formato CSV, compatível com Excel e Google Sheets.</li>
            <li>Use este material para entregar aos alunos que preferem acompanhamento físico ou offline.</li>
            <li>Lembre-se de orientar sobre as Séries de Aquecimento e Ajuste antes das Séries Válidas.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};