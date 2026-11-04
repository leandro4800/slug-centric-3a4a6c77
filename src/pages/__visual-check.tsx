import { useLocation } from "react-router-dom";
import { Utensils, TrendingUp } from "lucide-react";
import BackHandler from "@/components/BackHandler";
import { PageHeader } from "@/components/aluno/PageHeader";

/** Rota temporária só para conferir o layout no celular. */
export default function VisualCheck() {
  const { search } = useLocation();
  const mode = new URLSearchParams(search).get("mode") ?? "box";

  if (mode === "dieta") {
    return (
      <div className="min-h-screen bg-transparent pb-24">
        <BackHandler />
        <PageHeader icon={Utensils} title="MINHA DIETA" subtitle="Ganhar massa muscular" />
        <div className="px-5 pb-10">
          <div className="border border-border bg-card p-6 text-sm">dieta de exemplo</div>
        </div>
        <PageHeader icon={TrendingUp} title="EVOLUÇÃO" subtitle="METODOLOGIA JACKSON" />
        <div className="px-5 pb-10">
          <div className="border border-border bg-card p-6 text-sm">evolução de exemplo</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pb-24">
      <BackHandler />
      <div className="min-h-screen bg-background px-4 pt-6 pb-28 space-y-4 max-w-xl mx-auto">
        <header>
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold">Box</p>
          <h1 className="font-display text-3xl uppercase">WOD do dia</h1>
          <p className="text-xs text-muted-foreground">quarta-feira, 04 de novembro</p>
        </header>
        <div className="border border-border bg-card p-6 text-sm">aquecimento de exemplo</div>
      </div>
    </div>
  );
}
