import { describe, it, expect } from "vitest";
import { resumoFinanceiro, textoComparacao, type Assinatura, type Pagamento } from "@/lib/meu-negocio-metrics";

const now = new Date(2026, 10, 15, 11, 0); // 15/nov/2026 11h
const pg = (dia: Date, valor = 60000, o: Partial<Pagamento> = {}): Pagamento => ({
  id: Math.random().toString(36), aluno_id: "a1", aluno_nome: null, produto_tipo: "consultoria", produto_nome: null,
  valor_bruto_centavos: valor, status: "pago", data_vencimento: null,
  data_pagamento: dia.toISOString(), created_at: dia.toISOString(), ...o,
});
const sub = (o: Partial<Assinatura>): Assinatura => ({
  id: Math.random().toString(36), aluno_id: "a1", plano_id: "p1", status: "active", origem: "stripe",
  current_period_end: new Date(2026, 10, 21).toISOString(), created_at: new Date(2026, 0, 1).toISOString(), ...o,
});
const planos = [{ id: "p1", nome: "Mensal", preco_centavos: 60000, intervalo: "mensal" }];

describe("resumoFinanceiro", () => {
  it("separa hoje, ontem, semana e mês só com pagamentos pagos", () => {
    const r = resumoFinanceiro({
      pagamentos: [
        pg(new Date(2026, 10, 15, 9)),
        pg(new Date(2026, 10, 14, 9)),
        pg(new Date(2026, 10, 3, 9)),
        pg(new Date(2026, 10, 15, 8), 60000, { status: "vencido" }),
      ],
      assinaturas: [], planos, eventos: [],
    }, now);
    expect(r.hoje).toBe(60000);
    expect(r.ontem).toBe(60000);
    expect(r.semana).toBe(120000);
    expect(r.semanaAnterior).toBe(60000); // dia 3 cai na semana anterior (2 a 8)
    expect(r.mes).toBe(180000);
  });

  it("renovação esperada soma só assinaturas pagas que vencem em 30 dias", () => {
    const r = resumoFinanceiro({
      pagamentos: [], planos, eventos: [],
      assinaturas: [
        sub({}),
        sub({ aluno_id: "a2", origem: "gratuito" }),
        sub({ aluno_id: "a3", current_period_end: new Date(2027, 0, 20).toISOString() }),
        sub({ aluno_id: "a4", status: "canceled" }),
      ],
    }, now);
    expect(r.renovacao30d).toBe(60000);
    expect(r.renovacao30dQtd).toBe(1);
  });
});

describe("textoComparacao", () => {
  it("mostra igual, variação ou valor anterior", () => {
    expect(textoComparacao(100, 100, "Ontem", "Igual ao dia anterior")).toBe("Igual ao dia anterior");
    expect(textoComparacao(120, 100, "Ontem", "x")).toBe("+20% vs ontem");
    expect(textoComparacao(100, 0, "Ontem", "x")).toMatch(/^Ontem: R\$\s0,00$/);
  });
});
