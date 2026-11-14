import { describe, it, expect } from "vitest";
import {
  alunosPagantes,
  getPeriodo,
  inadimplencia,
  permanenciaMedia,
  previsaoProximoMes,
  receita,
  retencao,
  semaforoInadimplencia,
  semaforoRetencao,
  ticketMedio,
  type Assinatura,
  type Evento,
  type Pagamento,
} from "@/lib/meu-negocio-metrics";

const now = new Date(2026, 10, 14); // 14/nov/2026
const pg = (o: Partial<Pagamento>): Pagamento => ({
  id: Math.random().toString(36),
  aluno_id: "a1",
  aluno_nome: null,
  produto_tipo: "consultoria",
  produto_nome: null,
  valor_bruto_centavos: 10000,
  status: "pago",
  data_vencimento: null,
  data_pagamento: new Date(2026, 10, 5).toISOString(),
  created_at: new Date(2026, 10, 5).toISOString(),
  ...o,
});
const sub = (o: Partial<Assinatura>): Assinatura => ({
  id: Math.random().toString(36),
  aluno_id: "a1",
  plano_id: "p1",
  status: "active",
  origem: "stripe",
  current_period_end: new Date(2026, 11, 10).toISOString(),
  created_at: new Date(2026, 0, 1).toISOString(),
  ...o,
});
const mes = getPeriodo("mes_atual", now);

describe("semáforo", () => {
  it("retenção: verde a partir de 90%, amarelo de 80% a 90%, vermelho abaixo de 80%", () => {
    expect(semaforoRetencao(0.9)).toBe("verde");
    expect(semaforoRetencao(0.89)).toBe("amarelo");
    expect(semaforoRetencao(0.8)).toBe("amarelo");
    expect(semaforoRetencao(0.79)).toBe("vermelho");
  });
  it("inadimplência: verde até 3%, amarelo até 10%, vermelho acima de 10%", () => {
    expect(semaforoInadimplencia(0.03)).toBe("verde");
    expect(semaforoInadimplencia(0.031)).toBe("amarelo");
    expect(semaforoInadimplencia(0.1)).toBe("amarelo");
    expect(semaforoInadimplencia(0.11)).toBe("vermelho");
  });
  it("sem base de cálculo mostra estado neutro", () => {
    expect(semaforoRetencao(null)).toBe("neutro");
    expect(semaforoInadimplencia(null)).toBe("neutro");
  });
});

describe("gratuitos fora dos cálculos de dinheiro", () => {
  it("aluno só com assinatura gratuita não é pagante", () => {
    const set = alunosPagantes([sub({ aluno_id: "g1", origem: "gratuito" }), sub({ aluno_id: "s1" })], []);
    expect(set.has("g1")).toBe(false);
    expect(set.has("s1")).toBe(true);
  });
  it("receita soma só pagamentos pagos do período", () => {
    const lista = [
      pg({ valor_bruto_centavos: 10000 }),
      pg({ valor_bruto_centavos: 5000, status: "vencido" }),
      pg({ valor_bruto_centavos: 7000, data_pagamento: new Date(2026, 9, 5).toISOString() }),
    ];
    expect(receita(lista, mes)).toBe(10000);
  });
  it("previsão ignora assinaturas gratuitas", () => {
    const planos = [{ id: "p1", nome: "Mensal", preco_centavos: 15000 }];
    const subs = [sub({}), sub({ aluno_id: "g1", origem: "gratuito" })];
    expect(previsaoProximoMes(subs, planos, now)).toBe(15000);
  });
});

describe("indicadores sem base retornam vazio", () => {
  it("sem pagamentos não há ticket, inadimplência nem permanência", () => {
    expect(ticketMedio([], mes)).toBeNull();
    expect(inadimplencia([], mes)).toBeNull();
    expect(permanenciaMedia([])).toBeNull();
  });
  it("ticket = receita ÷ alunos que pagaram", () => {
    const lista = [pg({ aluno_id: "a1" }), pg({ aluno_id: "a1" }), pg({ aluno_id: "a2" })];
    expect(ticketMedio(lista, mes)).toBe(15000);
  });
  it("inadimplência = vencido ÷ cobrado", () => {
    const lista = [
      pg({ valor_bruto_centavos: 9000 }),
      pg({ valor_bruto_centavos: 1000, status: "vencido", data_vencimento: "2026-11-10" }),
    ];
    expect(inadimplencia(lista, mes)).toBeCloseTo(0.1);
  });
});

describe("retenção considera só pagantes", () => {
  it("(ativos no fim − novos) ÷ ativos no início", () => {
    const ev = (aluno: string, tipo: string, d: Date): Evento => ({
      aluno_id: aluno, aluno_nome: null, tipo, ocorreu_em: d.toISOString(),
    });
    const eventos = [
      ...["a1", "a2", "a3", "a4"].map((a) => ev(a, "entrou", new Date(2026, 5, 1))),
      ev("a4", "saiu", new Date(2026, 10, 3)),
      ev("a5", "entrou", new Date(2026, 10, 4)),
      ev("g1", "entrou", new Date(2026, 5, 1)),
      ev("g1", "saiu", new Date(2026, 10, 3)),
    ];
    const pagantes = new Set(["a1", "a2", "a3", "a4", "a5"]);
    // início: 4 ativos; fim: a1,a2,a3,a5 = 4; novos: 1 → (4−1)/4 = 75%
    expect(retencao(eventos, pagantes, mes, now)).toBeCloseTo(0.75);
  });
});
