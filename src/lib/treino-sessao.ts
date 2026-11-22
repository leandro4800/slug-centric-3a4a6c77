/**
 * Sessão de treino presa no app: nenhuma série registrada, mas todos os exercícios
 * do dia já aparecem marcados. Não há o que registrar, então ela é encerrada sem
 * contar como treino concluído.
 */
export function sessaoPresaSemSeries(input: {
  series: number;
  exerciciosDoDia: string[];
  marcados: Set<string>;
}): boolean {
  if (input.series > 0) return false;
  if (input.exerciciosDoDia.length === 0) return false;
  return input.exerciciosDoDia.every((id) => input.marcados.has(id));
}
