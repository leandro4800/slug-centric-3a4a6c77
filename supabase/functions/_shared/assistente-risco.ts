// Risco de cancelamento por regras simples (sem modelo): dias sem treino,
// pagamento atrasado e queda de frequência. Usado pelo painel e pela IA.
export type NivelRisco = "alto" | "medio" | null;

export function pontosRisco(p: { diasSemTreino: number | null; atrasado: boolean; quedaFrequencia: boolean }): number {
  let pts = 0;
  if (p.diasSemTreino !== null) {
    if (p.diasSemTreino >= 20) pts += 2;
    else if (p.diasSemTreino >= 10) pts += 1;
  }
  if (p.atrasado) pts += 2;
  if (p.quedaFrequencia) pts += 1;
  return pts;
}

export function riscoCancelamento(p: { diasSemTreino: number | null; atrasado: boolean; quedaFrequencia: boolean }): NivelRisco {
  const pts = pontosRisco(p);
  if (pts >= 3) return "alto";
  if (pts >= 2) return "medio";
  return null;
}
