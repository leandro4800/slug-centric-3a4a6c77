import { describe, it, expect } from "vitest";
import {
  despesasNoPeriodo,
  despesasPorCategoria,
  diasComoAluno,
  getPeriodo,
  ltv,
  receitaRecorrente,
  resultadoNegocio,
  semaforoLtvCac,
  type Assinatura,
  type Despesa,
  type Evento,
  type Pagamento,
} from "@/lib/meu-negocio-metrics";
import { categoriaDe, dataIso, lerCsv, lerLinhasDespesas, valorEmCentavos } from "@/lib/despesas-planilha";

const now = new Date(2026, 10, 15); // 15/nov/2026
const desp = (o: Partial<Despesa>): Despesa => ({
  id: Math.random().toString(36),
  categoria: "outros",
  valor_centavos: 10000,
  data: "2026-11-05",
  descricao: null,
  fixa: false,
  gasto_captacao: false,
  ...o,
});
const pg = (o: Partial<Pagamento>): Pagamento => ({
  id: Math.random().toString(36),
  aluno_id: "a1",
  aluno_nome: null,
  produto_tipo: "consultoria",
  produto_nome: null,
  valor_bruto_centavos: 20000,
  valor_liquido_centavos: 18000,
  status: "pago",
  data_vencimento: null,
  data_pagamento: new Date(2026, 10, 5).toISOString(),
  created_at: new Date(2026, 10, 5).toISOString(),
  ...o,
});
const ev = (aluno_id: string, tipo: string, d: Date): Evento => ({ aluno_id, aluno_nome: null, tipo, ocorreu_em: d.toISOString() });

describe("despesas fixas", () => {
  it("despesa fixa de setembro conta em set, out e nov nos últimos 3 meses", () => {
    const oc = despesasNoPeriodo([desp({ fixa: true, data: "2026-09-10" })], getPeriodo("3m", now), now);
    expect(oc.map((o) => o.mes)).toEqual(["2026-09", "2026-10", "2026-11"]);
  });
  it("despesa fixa nunca entra em meses futuros", () => {
    const oc = despesasNoPeriodo([desp({ fixa: true, data: "2026-11-01" })], getPeriodo("12m", now), now);
    expect(oc).toHaveLength(1);
  });
  it("despesa comum só conta no mês da data", () => {
    const p = getPeriodo("mes_atual", now);
    expect(despesasNoPeriodo([desp({ data: "2026-10-31" })], p, now)).toHaveLength(0);
    expect(despesasNoPeriodo([desp({ data: "2026-11-01" })], p, now)).toHaveLength(1);
  });
  it("agrupa por categoria", () => {
    const oc = despesasNoPeriodo(
      [desp({ categoria: "anuncio", valor_centavos: 5000 }), desp({ categoria: "anuncio", valor_centavos: 3000 }), desp({ categoria: "contador", valor_centavos: 25000 })],
      getPeriodo("mes_atual", now),
      now,
    );
    expect(despesasPorCategoria(oc)).toEqual([
      { categoria: "contador", nome: "Contador", valor: 25000 },
      { categoria: "anuncio", nome: "Anúncio", valor: 8000 },
    ]);
  });
});

describe("resultado do negócio", () => {
  const pagamentos = [pg({ aluno_id: "a1" }), pg({ aluno_id: "a2" })]; // R$ 400 bruto, R$ 360 líquido
  const eventos = [ev("a1", "entrou", new Date(2026, 10, 2)), ev("a2", "entrou", new Date(2026, 4, 1))];
  const pagantes = new Set(["a1", "a2"]);
  const despesas = [desp({ categoria: "aluguel_academia", valor_centavos: 10000 }), desp({ categoria: "anuncio", valor_centavos: 5000, gasto_captacao: true })];
  const r = resultadoNegocio({ pagamentos, eventos, pagantes, despesas, periodo: getPeriodo("mes_atual", now), now });

  it("lucro = recebido líquido − despesas", () => expect(r.lucro).toBe(36000 - 15000));
  it("margem = lucro ÷ receita bruta", () => expect(r.margem).toBeCloseTo(21000 / 40000));
  it("CAC = captação ÷ novos pagantes", () => expect(r.cac).toBe(5000));
  it("LTV ÷ CAC usa o LTV histórico", () => expect(r.ltvCac).toBeCloseTo(20000 / 5000));
  it("retorno da captação = receita dos novos ÷ captação", () => expect(r.retornoCaptacao).toBeCloseTo(20000 / 5000));
  it("ponto de equilíbrio = despesa mensal ÷ líquido por aluno-mês, arredondado pra cima", () => expect(r.pontoEquilibrioAlunos).toBe(1));
  it("sem gasto de captação, CAC fica vazio", () => {
    const r2 = resultadoNegocio({ pagamentos, eventos, pagantes, despesas: [desp({})], periodo: getPeriodo("mes_atual", now), now });
    expect(r2.cac).toBeNull();
  });
  it("semáforo LTV×CAC: 3 verde, 1 amarelo, abaixo de 1 vermelho", () => {
    expect(semaforoLtvCac(3)).toBe("verde");
    expect(semaforoLtvCac(1)).toBe("amarelo");
    expect(semaforoLtvCac(0.9)).toBe("vermelho");
  });
});

describe("receita recorrente, LTV e tempo como aluno", () => {
  const sub = (o: Partial<Assinatura>): Assinatura => ({
    id: "s", aluno_id: "a1", plano_id: "m", status: "active", origem: "stripe", current_period_end: null, created_at: "2026-01-01", ...o,
  });
  it("plano anual entra mensalizado e gratuito fica fora", () => {
    const planos = [{ id: "m", nome: "Mensal", preco_centavos: 15000, intervalo: "mensal" }, { id: "a", nome: "Anual", preco_centavos: 120000, intervalo: "anual" }];
    expect(receitaRecorrente([sub({}), sub({ plano_id: "a" }), sub({ origem: "gratuito" })], planos)).toBe(15000 + 10000);
  });
  it("LTV = total pago ÷ alunos que pagaram", () => {
    expect(ltv([pg({ aluno_id: "a1" }), pg({ aluno_id: "a1" }), pg({ aluno_id: "a2" })])).toBe(20000);
    expect(ltv([])).toBeNull();
  });
  it("tempo como aluno soma só os períodos ativos", () => {
    const evs = [ev("a", "entrou", new Date(2026, 0, 1)), ev("a", "saiu", new Date(2026, 0, 31)), ev("a", "voltou", new Date(2026, 10, 5))];
    expect(diasComoAluno(evs, now)).toBe(30 + 10);
  });
});

describe("importar planilha de despesas", () => {
  it("lê valores em formato brasileiro", () => {
    expect(valorEmCentavos("R$ 1.234,56")).toBe(123456);
    expect(valorEmCentavos("800")).toBe(80000);
    expect(valorEmCentavos("1.500")).toBe(150000);
    expect(valorEmCentavos("12.5")).toBe(1250);
    expect(valorEmCentavos(99.9)).toBe(9990);
    expect(valorEmCentavos("0")).toBeNull();
  });
  it("lê datas dd/mm/aaaa, ISO e série do Excel", () => {
    expect(dataIso("05/11/2026")).toBe("2026-11-05");
    expect(dataIso("2026-11-05")).toBe("2026-11-05");
    expect(dataIso(46331)).toBe("2026-11-05");
    expect(dataIso("31/02/2026")).toBeNull();
  });
  it("reconhece as categorias prontas por nome livre", () => {
    expect(categoriaDe("Aluguel")).toBe("aluguel_academia");
    expect(categoriaDe("Academia")).toBe("aluguel_academia");
    expect(categoriaDe("Anúncios Instagram")).toBe("anuncio");
    expect(categoriaDe("Equipamento")).toBe("equipamento");
    expect(categoriaDe("Transporte")).toBe("transporte");
    expect(categoriaDe("Contador")).toBe("contador");
    expect(categoriaDe("Ferramentas")).toBe("ferramentas");
    expect(categoriaDe("Café")).toBe("outros");
  });
  it("CSV com cabeçalho: marca fixa, captação e aponta linhas com erro", () => {
    const csv = "Data;Categoria;Valor;Descrição;Fixa;Captação\n05/11/2026;Aluguel;800,00;Sala;Sim;\n10/11/2026;Anúncio;150;Insta;não;\n;Contador;250;;;\n12/11/2026;Outros;abc;;;";
    const r = lerLinhasDespesas(lerCsv(csv));
    expect(r.validas).toHaveLength(2);
    expect(r.validas[0]).toMatchObject({ categoria: "aluguel_academia", valor_centavos: 80000, fixa: true, gasto_captacao: false });
    expect(r.validas[1]).toMatchObject({ categoria: "anuncio", valor_centavos: 15000, fixa: false, gasto_captacao: true });
    expect(r.erros.map((e) => e.linha)).toEqual([4, 5]);
  });
  it("planilha sem cabeçalho usa a ordem do modelo", () => {
    const r = lerLinhasDespesas([[new Date(Date.UTC(2026, 10, 3)), "Equipamento", 320.5, "Kettlebell", "não", "não"]]);
    expect(r.validas[0]).toMatchObject({ data: "2026-11-03", categoria: "equipamento", valor_centavos: 32050 });
  });
});
