import { cn } from "@/lib/utils";
import type { Semaforo } from "@/lib/meu-negocio-metrics";

export const SEMAFORO_BG: Record<Semaforo, string> = {
  verde: "bg-[hsl(var(--semaforo-verde))]",
  amarelo: "bg-[hsl(var(--semaforo-amarelo))]",
  vermelho: "bg-[hsl(var(--semaforo-vermelho))]",
  neutro: "bg-muted-foreground/40",
};

export const SemaforoDot = ({ cor, className }: { cor: Semaforo; className?: string }) => (
  <span aria-hidden className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", SEMAFORO_BG[cor], className)} />
);
