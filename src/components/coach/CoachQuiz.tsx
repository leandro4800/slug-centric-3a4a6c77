import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export interface QuizAnswers {
  profissao: string;
  profissao_outro?: string;
  alunos_atuais: string;
  faturamento_mensal: string;
  plano_recomendado: "standard" | "premium" | "pro";
}

interface Props {
  email?: string | null;
  userId?: string | null;
  onComplete: (answers: QuizAnswers) => void;
}

const PROFISSOES = ["Personal Trainer", "Nutricionista", "Coach de Vida", "Outro"];
const ALUNOS = ["Até 25", "25 a 50", "50 a 100", "Mais de 100"];
const FATURAMENTOS = ["Até R$ 2.000", "R$ 2.000 – R$ 5.000", "R$ 5.000 – R$ 10.000", "Mais de R$ 10.000"];

const recomendarPlano = (alunos: string): "standard" | "premium" | "pro" => {
  if (alunos === "Mais de 100") return "pro";
  if (alunos === "Até 25") return "standard";
  return "premium";
};

export function CoachQuiz({ email, userId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [profissao, setProfissao] = useState("");
  const [profissaoOutro, setProfissaoOutro] = useState("");
  const [alunos, setAlunos] = useState("");
  const [faturamento, setFaturamento] = useState("");
  const [saving, setSaving] = useState(false);

  const total = 3;
  const progress = ((step + 1) / total) * 100;

  const handleFinish = async (lastValue: string) => {
    setSaving(true);
    const recomendacao = recomendarPlano(alunos);
    const answers: QuizAnswers = {
      profissao,
      profissao_outro: profissao === "Outro" ? profissaoOutro : undefined,
      alunos_atuais: alunos,
      faturamento_mensal: lastValue,
      plano_recomendado: recomendacao,
    };
    try {
      await supabase.from("coach_qualification_leads").insert({
        user_id: userId ?? null,
        email: email ?? null,
        profissao: answers.profissao,
        profissao_outro: answers.profissao_outro ?? null,
        alunos_atuais: answers.alunos_atuais,
        faturamento_mensal: answers.faturamento_mensal,
        plano_recomendado: answers.plano_recomendado,
      });
    } catch (_) { /* ignore */ }
    setSaving(false);
    onComplete(answers);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <span>Qualificação</span>
          <span>{step + 1} / {total}</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          <h2 className="font-display text-2xl uppercase italic">Qual sua profissão principal?</h2>
          <div className="grid gap-3">
            {PROFISSOES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProfissao(p)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  profissao === p ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span className="font-bold uppercase tracking-wide text-sm">{p}</span>
                {profissao === p && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          {profissao === "Outro" && (
            <div>
              <Label>Qual?</Label>
              <Input value={profissaoOutro} onChange={(e) => setProfissaoOutro(e.target.value)} placeholder="Especifique" />
            </div>
          )}
          <Button
            disabled={!profissao || (profissao === "Outro" && !profissaoOutro)}
            onClick={() => setStep(1)}
            className="w-full font-black uppercase tracking-widest"
          >
            Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <h2 className="font-display text-2xl uppercase italic">Quantos alunos você atende hoje?</h2>
          <div className="grid gap-3">
            {ALUNOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setAlunos(p); }}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  alunos === p ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span className="font-bold uppercase tracking-wide text-sm">{p}</span>
                {alunos === p && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <Button disabled={!alunos} onClick={() => setStep(2)} className="w-full font-black uppercase tracking-widest">
            Próximo <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h2 className="font-display text-2xl uppercase italic">Qual seu faturamento mensal médio?</h2>
          <div className="grid gap-3">
            {FATURAMENTOS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFaturamento(p)}
                className={`flex items-center justify-between rounded-xl border p-4 text-left transition-all ${
                  faturamento === p ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"
                }`}
              >
                <span className="font-bold uppercase tracking-wide text-sm">{p}</span>
                {faturamento === p && <CheckCircle2 className="h-4 w-4 text-primary" />}
              </button>
            ))}
          </div>
          <Button
            disabled={!faturamento || saving}
            onClick={() => handleFinish(faturamento)}
            className="w-full font-black uppercase tracking-widest"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Ver meu plano <ArrowRight className="ml-2 h-4 w-4" /></>}
          </Button>
        </div>
      )}
    </div>
  );
}
