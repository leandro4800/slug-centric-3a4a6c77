import { describe, expect, it } from "vitest";
import { trainingMetrics, type AthleteSet } from "@/lib/athlete-training-metrics";

const set = (values: Partial<AthleteSet> = {}): AthleteSet => ({ sessao_id: "s1", treino_prescrito_id: "p1", exercicio_chave: null, peso_kg: 20, reps: 10, volume_kg: 999, concluida_em: "2026-10-30T09:00:00Z", created_at: null, ...values });
const sessions = [{ id: "s1", data_treino: "2026-10-30", dia_semana: "sexta", duracao_min: 30 }];
const names = new Map([["p1", "Agachamento"]]);
describe("athlete monitoring metrics", () => {
  it("uses corrected load times repetitions for volume", () => {
    expect(trainingMetrics([set()], sessions, names, "2026-10-01").volume).toBe(200);
  });
  it("tracks load evolution per exercise", () => {
    const result = trainingMetrics([set({ sessao_id: null, peso_kg: 10, concluida_em: "2026-10-01" }), set({ peso_kg: 25 })], sessions, names, "2026-10-01");
    expect(result.exercises[0].first).toBe(10);
    expect(result.exercises[0].last).toBe(25);
    expect(result.exercises[0].points).toHaveLength(2);
  });
  it("does not count a closed session with zero series as completed", () => {
    expect(trainingMetrics([], sessions, names, "2026-10-01").completed).toBe(0);
  });
  it("uses the session date even if the set was recorded later", () => {
    expect(trainingMetrics([set()], [{ ...sessions[0], data_treino: "2026-09-01" }], names, "2026-10-01").series).toBe(0);
  });
});