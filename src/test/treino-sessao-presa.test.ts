import { describe, expect, it } from "vitest";
import { sessaoPresaSemSeries } from "@/lib/treino-sessao";

describe("sessão presa sem séries", () => {
  it("é presa quando não há séries e todos os exercícios do dia estão marcados", () => {
    expect(sessaoPresaSemSeries({ series: 0, exerciciosDoDia: ["a", "b"], marcados: new Set(["a", "b"]) })).toBe(true);
  });
  it("não é presa quando há pelo menos 1 série registrada", () => {
    expect(sessaoPresaSemSeries({ series: 1, exerciciosDoDia: ["a", "b"], marcados: new Set(["a", "b"]) })).toBe(false);
  });
  it("não é presa quando ainda falta exercício para marcar", () => {
    expect(sessaoPresaSemSeries({ series: 0, exerciciosDoDia: ["a", "b"], marcados: new Set(["a"]) })).toBe(false);
  });
});
