import { describe, expect, it } from "vitest";
import { alunoPertenceAoTime } from "@/lib/coach-athlete-access";

describe("evolução do aluno no app do coach", () => {
  it("libera aluno do mesmo time", () => {
    expect(alunoPertenceAoTime({ tenant_id: "t1" }, "t1")).toBe(true);
  });
  it("bloqueia aluno de outro time", () => {
    expect(alunoPertenceAoTime({ tenant_id: "t2" }, "t1")).toBe(false);
  });
  it("bloqueia quando o aluno não foi encontrado ou o time é desconhecido", () => {
    expect(alunoPertenceAoTime(null, "t1")).toBe(false);
    expect(alunoPertenceAoTime({ tenant_id: "t1" }, null)).toBe(false);
  });
});
