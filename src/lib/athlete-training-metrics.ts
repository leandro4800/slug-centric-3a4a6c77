export interface AthleteSet {
  sessao_id: string | null;
  treino_prescrito_id: string | null;
  exercicio_chave: string | null;
  peso_kg: number | null;
  reps: number | null;
  volume_kg: number | null;
  concluida_em: string | null;
  created_at: string | null;
}
export interface AthleteSession {
  id: string;
  data_treino: string;
  dia_semana: string | null;
  duracao_min: number;
}

export function trainingMetrics(sets: AthleteSet[], sessions: AthleteSession[], names: Map<string, string>, since: string) {
  const sessionMap = new Map(sessions.map(s => [s.id, s]));
  const daily = new Map<string, { date: string; volume: number; series: number }>();
  const exercises = new Map<string, { name: string; volume: number; series: number; points: Map<string, number> }>();
  const sessionCounts = new Map<string, { volume: number; series: number }>();
  for (const set of sets) {
    const session = set.sessao_id ? sessionMap.get(set.sessao_id) : undefined;
    const date = (session?.data_treino || set.concluida_em || set.created_at || "").slice(0, 10);
    if (!date || date < since) continue;
    // Recompute from the corrected load/reps, rather than a potentially stale aggregate.
    const volume = set.peso_kg != null && set.reps != null
      ? Math.max(0, Number(set.peso_kg)) * Math.max(0, Number(set.reps))
      : Math.max(0, Number(set.volume_kg) || 0);
    const day = daily.get(date) || { date, volume: 0, series: 0 };
    day.volume += volume; day.series += 1; daily.set(date, day);
    const name = (set.treino_prescrito_id ? names.get(set.treino_prescrito_id) : undefined) || set.exercicio_chave || "Exercício sem nome";
    const key = name.trim().toLocaleLowerCase("pt-BR");
    const exercise = exercises.get(key) || { name, volume: 0, series: 0, points: new Map<string, number>() };
    exercise.volume += volume; exercise.series += 1;
    if (set.peso_kg != null) exercise.points.set(date, Math.max(exercise.points.get(date) || 0, Number(set.peso_kg)));
    exercises.set(key, exercise);
    if (set.sessao_id) {
      const count = sessionCounts.get(set.sessao_id) || { volume: 0, series: 0 };
      count.volume += volume; count.series += 1; sessionCounts.set(set.sessao_id, count);
    }
  }
  const history = sessions.filter(s => s.data_treino.slice(0, 10) >= since && sessionCounts.has(s.id))
    .map(s => ({ ...s, ...sessionCounts.get(s.id) })).sort((a, b) => b.data_treino.localeCompare(a.data_treino));
  const chart = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    chart,
    volume: chart.reduce((sum, d) => sum + d.volume, 0),
    series: chart.reduce((sum, d) => sum + d.series, 0),
    completed: history.filter(s => s.duracao_min > 0).length,
    history,
    exercises: [...exercises.values()].map(e => {
      const points = [...e.points].sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, value }));
      return { name: e.name, volume: e.volume, series: e.series, points, first: points[0]?.value, last: points.at(-1)?.value };
    }).sort((a, b) => a.name.localeCompare(b.name)),
  };
}