import { describe, it, expect } from "vitest";
import { rankResultados, timerDisplaySeconds } from "@/lib/box-wod";
import { verticalFromTipo } from "@/lib/coach-tipo";

describe("box wod", () => {
  it("AMRAP conta regressivo e termina em zero", () => {
    expect(timerDisplaySeconds("AMRAP", 100, 720)).toEqual({ value: 620, done: false });
    expect(timerDisplaySeconds("AMRAP", 800, 720)).toEqual({ value: 0, done: true });
  });
  it("For Time conta progressivo e para no time cap", () => {
    expect(timerDisplaySeconds("FOR_TIME", 100, 600)).toEqual({ value: 100, done: false });
    expect(timerDisplaySeconds("FOR_TIME", 700, 600)).toEqual({ value: 600, done: true });
  });
  it("ranking: Rx antes de Scaled; For Time menor tempo primeiro", () => {
    const r = rankResultados("FOR_TIME", [
      { aluno_id: "a", escala: "scaled", tempo_seg: 200, rounds: null, reps: null },
      { aluno_id: "b", escala: "rx", tempo_seg: 400, rounds: null, reps: null },
      { aluno_id: "c", escala: "rx", tempo_seg: 300, rounds: null, reps: null },
    ]);
    expect(r.map((x) => x.aluno_id)).toEqual(["c", "b", "a"]);
  });
  it("ranking AMRAP: mais rounds+reps primeiro", () => {
    const r = rankResultados("AMRAP", [
      { aluno_id: "a", escala: "rx", tempo_seg: null, rounds: 5, reps: 10 },
      { aluno_id: "b", escala: "rx", tempo_seg: null, rounds: 6, reps: 0 },
    ]);
    expect(r[0].aluno_id).toBe("b");
  });
  it("nutricionista grava vertical personal", () => {
    expect(verticalFromTipo("nutricionista")).toBe("personal");
    expect(verticalFromTipo("crossfit")).toBe("crossfit");
  });
});
