import { describe, expect, it } from "vitest";
import { estaSumindo, nuncaTreinou } from "@/lib/meu-negocio-metrics";
import { calcularPanorama } from "../../supabase/functions/_shared/assistente-resumo";
import {
  adiarAte,
  alertasVisiveis,
  CONFIG_PADRAO,
  deveEnviarAgora,
  linkWhatsapp,
  mensagemPronta,
  montarResumo,
  riscoCancelamento,
  telefoneWhatsapp,
  type Alerta,
} from "@/lib/assistente";

const now = new Date(2026, 10, 15, 12);
const alerta = (p: Partial<Alerta>): Alerta => ({
  id: Math.random().toString(36).slice(2),
  tenant_id: "t1",
  aluno_id: "a1",
  aluno_nome: "Maria Souza",
  tipo: "sumindo",
  prioridade: 3,
  titulo: "Maria está há 12 dias sem treinar",
  detalhe: {},
  estado: "novo",
  adiar_ate: null,
  created_at: "2026-11-15T09:30:00Z",
  ...p,
});

describe("sumindo x nunca treinaram", () => {
  it("quem nunca treinou não conta como sumindo", () => {
    expect(estaSumindo(null, now)).toBe(false);
    expect(nuncaTreinou(null)).toBe(true);
  });
  it("sumindo só a partir de 10 dias sem treinar", () => {
    expect(estaSumindo("2026-11-06", now)).toBe(false); // 9 dias
    expect(estaSumindo("2026-11-05", now)).toBe(true); // 10 dias
  });
});

describe("alertas no painel", () => {
  it("Chamar/Já falei tira o aluno dos alertas por 7 dias", () => {
    const ate = adiarAte(now);
    expect(new Date(ate).getTime() - now.getTime()).toBe(7 * 86400_000);
    const lista = [
      alerta({ id: "x", estado: "adiado", adiar_ate: ate }),
      alerta({ id: "y", tipo: "pagamento_vencido", prioridade: 1 }), // mesmo aluno, outro alerta
    ];
    expect(alertasVisiveis(lista, now)).toHaveLength(0);
    const depois = new Date(now.getTime() + 8 * 86400_000);
    expect(alertasVisiveis(lista, depois).map((a) => a.id)).toEqual(["y", "x"]);
  });
  it("dispensado e nunca_treinou não aparecem", () => {
    const lista = [alerta({ estado: "dispensado" }), alerta({ tipo: "nunca_treinou", aluno_id: "a2" })];
    expect(alertasVisiveis(lista, now)).toHaveLength(0);
  });
});

describe("resumo da manhã", () => {
  const base = { ...CONFIG_PADRAO };
  it("no máximo um por dia, no horário escolhido e nunca entre 21h e 7h", () => {
    expect(deveEnviarAgora(base, 8, "2026-11-15")).toBe(true);
    expect(deveEnviarAgora(base, 9, "2026-11-15")).toBe(false);
    expect(deveEnviarAgora({ ...base, ultimo_resumo_data: "2026-11-15" }, 8, "2026-11-15")).toBe(false);
    expect(deveEnviarAgora({ ...base, resumo_hora: 21 }, 21, "2026-11-15")).toBe(false);
    expect(deveEnviarAgora({ ...base, resumo_hora: 6 }, 6, "2026-11-15")).toBe(false);
    expect(deveEnviarAgora({ ...base, resumo_ativo: false }, 8, "2026-11-15")).toBe(false);
  });
  it("dia sem novidade não gera notificação", () => {
    expect(montarResumo({ alertas: [], cfg: base })).toBeNull();
  });
  it("limita a 5 itens por prioridade e mostra o resto como + N no painel", () => {
    const alertas = [
      ...Array.from({ length: 6 }, (_, i) => alerta({ id: `s${i}`, aluno_id: `s${i}` })),
      alerta({ id: "p1", tipo: "pagamento_vencido", prioridade: 1 }),
      alerta({ id: "r1", tipo: "renovacao_proxima", prioridade: 2 }),
    ];
    const r = montarResumo({ alertas, cfg: base, nomeCoach: "Leandro Silva", receitaMesCentavos: 150000 })!;
    expect(r.itens).toHaveLength(5);
    expect(r.itens[0].id).toBe("p1");
    expect(r.itens[1].id).toBe("r1");
    expect(r.restantes).toBe(3);
    expect(r.incluidos).toHaveLength(8);
    expect(r.titulo).toBe("Bom dia, Leandro!");
    expect(r.corpo).toContain("1 renovação");
    expect(r.corpo).toContain("6 alunos sumidos");
    expect(r.corpo.replace(/\s/g, " ")).toContain("R$ 1.500,00");
  });
  it("tipo desligado na configuração fica fora do resumo", () => {
    const cfg = { ...base, tipos: { ...base.tipos, sumindo: false } };
    expect(montarResumo({ alertas: [alerta({})], cfg })).toBeNull();
  });
});

describe("resumo semanal completo", () => {
  const alunos = [
    { nome: "Ana", ultimoTreino: "2026-11-12" }, // 4 dias: treinando
    { nome: "Bia", ultimoTreino: "2026-10-28" }, // 19 dias: sumida
    { nome: "Caio", ultimoTreino: "2026-08-25" }, // 83 dias: parado
    { nome: "Davi", ultimoTreino: null }, // nunca treinou
  ];
  it("separa treinando, sumidos (10–60 dias), parados (+60) e nunca treinaram", () => {
    const p = calcularPanorama(alunos, "2026-11-16");
    expect(p.ativos).toBe(4);
    expect(p.treinando).toBe(1);
    expect(p.sumidos).toEqual([{ nome: "Bia", dias: 19 }]);
    expect(p.parados).toEqual([{ nome: "Caio", dias: 83 }]);
    expect(p.nuncaTreinaram).toEqual(["Davi"]);
  });
  it("na segunda vai mesmo sem alerta novo, com o panorama de todos", () => {
    const panorama = calcularPanorama(alunos, "2026-11-16");
    const r = montarResumo({ alertas: [], cfg: { ...CONFIG_PADRAO }, nomeCoach: "Leandro", panorama })!;
    expect(r).not.toBeNull();
    expect(r.titulo).toBe("Bom dia, Leandro! Resumo da semana");
    expect(r.corpo).toContain("1 parados há mais de 60 dias");
    expect(r.corpo).toContain("1 nunca treinaram");
  });
  it("nos outros dias, sem alerta novo continua sem notificação", () => {
    expect(montarResumo({ alertas: [], cfg: { ...CONFIG_PADRAO }, panorama: null })).toBeNull();
  });
});

describe("risco de cancelamento", () => {
  it("regras simples: dias sem treino + atraso + queda", () => {
    expect(riscoCancelamento({ diasSemTreino: 5, atrasado: false, quedaFrequencia: false })).toBeNull();
    expect(riscoCancelamento({ diasSemTreino: 12, atrasado: false, quedaFrequencia: true })).toBe("medio");
    expect(riscoCancelamento({ diasSemTreino: 20, atrasado: false, quedaFrequencia: false })).toBe("medio");
    expect(riscoCancelamento({ diasSemTreino: 10, atrasado: true, quedaFrequencia: false })).toBe("alto");
  });
});

describe("Chamar no WhatsApp", () => {
  it("mensagem pronta usa o primeiro nome do aluno e do coach", () => {
    expect(mensagemPronta(alerta({}), "Leandro Silva")).toMatch(/^Oi, Maria! Leandro aqui\./);
  });
  it("telefone brasileiro vira número internacional", () => {
    expect(telefoneWhatsapp("(11) 98765-4321")).toBe("5511987654321");
    expect(telefoneWhatsapp("+55 21 3333-4444")).toBe("552133334444");
    expect(telefoneWhatsapp("123")).toBeNull();
    expect(linkWhatsapp("oi tudo bem", "11987654321")).toBe("https://wa.me/5511987654321?text=oi%20tudo%20bem");
    expect(linkWhatsapp("oi", null)).toBe("https://wa.me/?text=oi");
  });
});
