import { PlanConfig } from "@/components/coach/PlanConfig";
import { Info } from "lucide-react";

export default function Planos() {
  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Financeiro</p>
        <h1 className="font-display text-3xl uppercase italic tracking-tighter md:text-4xl">Meus Planos</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Configure os valores dos seus planos. Ao salvar, o preço é sincronizado automaticamente na sua conta Stripe.
        </p>
      </div>

      <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs md:text-sm space-y-1">
          <p className="font-bold text-foreground">Como funciona a taxa do aluno</p>
          <p className="text-muted-foreground">
            Você digita o valor cheio do plano (ex: <span className="font-mono text-foreground">R$ 29,90</span>).
            No Stripe, é salvo automaticamente <span className="font-mono text-foreground">R$ 30,79</span> —
            os <b>2,99%</b> extras são a taxa cobrada do aluno para cobrir custos do Stripe.
            Você recebe o valor que digitou.
          </p>
        </div>
      </div>

      <PlanConfig />
    </div>
  );
}
