import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles } from "lucide-react";

export type CoachPlanTier = "standard" | "premium" | "pro";

export const COACH_PLANS: Array<{
  id: CoachPlanTier;
  name: string;
  full: number;
  max_alunos: string;
  features: string[];
}> = [
  {
    id: "standard",
    name: "Alpha Standard",
    full: 59.90,
    max_alunos: "Até 25 alunos",
    features: [
      "Gestão completa de alunos",
      "Biblioteca de treinos e cardápios",
      "Cobranças automáticas",
      "Suporte humanizado",
    ],
  },
  {
    id: "premium",
    name: "Alpha Premium",
    full: 99.90,
    max_alunos: "Até 50 alunos",
    features: [
      "Tudo do Standard",
      "Anamnese personalizada",
      "Avaliações físicas avançadas",
      "Marketing & landing personalizada",
    ],
  },
  {
    id: "pro",
    name: "Alpha Pro",
    full: 189.90,
    max_alunos: "Alunos ilimitados",
    features: [
      "Tudo do Premium",
      "Feedback personalizado",
      "IA Nutricional & de Treino",
      "Integrações & API",
    ],
  },
];

interface Props {
  recommended?: CoachPlanTier;
  onSelect: (plan: CoachPlanTier) => void;
}

export function CoachPlanSelector({ recommended, onSelect }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/40 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-5 text-center">
        <div className="flex items-center justify-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Oferta especial</span>
        </div>
        <p className="mt-2 text-lg font-bold">Primeiro mês por <span className="text-primary">R$ 1,00</span></p>
        <p className="mt-1 text-xs text-muted-foreground">Teste a plataforma completa sem compromisso. Cancele quando quiser.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {COACH_PLANS.map((plan) => {
          const isRec = recommended === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-zinc-900/60 p-6 transition-all hover:scale-[1.02] ${
                isRec ? "border-primary shadow-[0_0_30px_-10px_hsl(var(--primary))]" : "border-border"
              }`}
            >
              {isRec && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
                  Recomendado p/ você
                </div>
              )}
              <h3 className="font-display text-lg uppercase tracking-tighter">{plan.name}</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{plan.max_alunos}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-black text-primary">R$ 1</span>
                <span className="text-xs text-muted-foreground">/ 1º mês</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">depois R$ {plan.full.toFixed(2).replace(".", ",")}/mês</p>
              <ul className="my-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-zinc-300">
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button onClick={() => onSelect(plan.id)} variant={isRec ? "default" : "outline"} className="w-full font-black uppercase tracking-widest text-[10px]">
                Aproveitar oferta por R$ 1,00
              </Button>
            </div>
          );
        })}
      </div>
      <p className="text-center text-[10px] uppercase tracking-widest text-muted-foreground">
        + taxa de 7,99% sobre cada venda processada aos seus alunos
      </p>
    </div>
  );
}
