// Regras puras do Assistente do "Meu negócio" (testáveis sem tela).
export { riscoCancelamento, pontosRisco, type NivelRisco } from "../../supabase/functions/_shared/assistente-risco";
export { montarResumo, deveEnviarAgora, dentroDoHorario, MAX_ITENS_RESUMO, CONFIG_PADRAO } from "../../supabase/functions/_shared/assistente-resumo";
import { CONFIG_PADRAO } from "../../supabase/functions/_shared/assistente-resumo";

export type TipoAlerta =
  | "sumindo"
  | "nunca_treinou"
  | "queda_frequencia"
  | "pagamento_vencido"
  | "renovacao_proxima"
  | "lucro_queda"
  | "retencao_queda"
  | "cac_alto";

export type Alerta = {
  id: string;
  tenant_id: string;
  aluno_id: string | null;
  aluno_nome: string | null;
  tipo: TipoAlerta | string;
  prioridade: number;
  titulo: string;
  detalhe: Record<string, unknown>;
  estado: string;
  adiar_ate: string | null;
  created_at: string;
};

export type AssistenteConfig = {
  resumo_ativo: boolean;
  resumo_hora: number;
  canal_email: boolean;
  canal_push: boolean;
  tipos: Record<string, boolean>;
};

export const CONFIG_INICIAL: AssistenteConfig = {
  resumo_ativo: CONFIG_PADRAO.resumo_ativo,
  resumo_hora: CONFIG_PADRAO.resumo_hora,
  canal_email: CONFIG_PADRAO.canal_email,
  canal_push: CONFIG_PADRAO.canal_push,
  tipos: { ...CONFIG_PADRAO.tipos },
};

/** "Chamar" ou "Já falei" tiram o aluno dos alertas por 7 dias. */
export const DIAS_ADIAR = 7;

export const TIPOS_CONFIG: { key: string; label: string; descricao: string }[] = [
  { key: "sumindo", label: "Aluno sumido", descricao: "Aviso aos 10 dias sem treinar e lembrete aos 20." },
  { key: "queda_frequencia", label: "Treinando menos", descricao: "Quando o aluno treina bem menos que o normal." },
  { key: "pagamento", label: "Pagamento atrasado", descricao: "No dia do vencimento e de novo após 3 dias." },
  { key: "renovacao", label: "Renovação", descricao: "Planos pagos que renovam nos próximos 7 dias." },
  { key: "negocio", label: "Negócio (segunda-feira)", descricao: "Lucro ou retenção em queda e custo para trazer aluno acima do ticket." },
];

export const ROTULO_TIPO: Record<string, string> = {
  sumindo: "Sumido",
  queda_frequencia: "Treinando menos",
  pagamento_vencido: "Pagamento",
  renovacao_proxima: "Renovação",
  lucro_queda: "Lucro",
  retencao_queda: "Retenção",
  cac_alto: "Captação",
};

export const alertaDeAluno = (a: Pick<Alerta, "aluno_id">) => !!a.aluno_id;

/**
 * Alertas que aparecem no painel: abertos (novo/visto) ou adiados cujo prazo
 * já passou; some qualquer alerta de aluno que esteja adiado (Chamar/Já falei).
 * Ordenados por prioridade e data.
 */
export function alertasVisiveis(alertas: Alerta[], now: Date = new Date()): Alerta[] {
  const t = now.getTime();
  const adiados = new Set(
    alertas.filter((a) => a.aluno_id && a.adiar_ate && new Date(a.adiar_ate).getTime() > t).map((a) => a.aluno_id as string),
  );
  return alertas
    .filter((a) => {
      if (a.tipo === "nunca_treinou") return false; // só informação, nunca alerta
      const aberto = a.estado === "novo" || a.estado === "visto" || (a.estado === "adiado" && (!a.adiar_ate || new Date(a.adiar_ate).getTime() <= t));
      if (!aberto) return false;
      if (a.aluno_id && adiados.has(a.aluno_id)) return false;
      return true;
    })
    .sort((a, b) => a.prioridade - b.prioridade || a.created_at.localeCompare(b.created_at));
}

export function adiarAte(now: Date = new Date()): string {
  return new Date(now.getTime() + DIAS_ADIAR * 86400_000).toISOString();
}

const primeiro = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] || "";

/** Mensagem pronta (editável) para o coach mandar no WhatsApp. */
export function mensagemPronta(alerta: Pick<Alerta, "tipo" | "aluno_nome" | "detalhe">, nomeCoach?: string | null): string {
  const nome = primeiro(alerta.aluno_nome);
  const oi = nome ? `Oi, ${nome}!` : "Oi!";
  const assinatura = primeiro(nomeCoach) ? ` ${primeiro(nomeCoach)} aqui.` : "";
  switch (alerta.tipo) {
    case "sumindo":
      return `${oi}${assinatura} Senti sua falta nos treinos. Está tudo bem? Se quiser, ajusto o treino para encaixar melhor na sua rotina. Bora voltar essa semana? 💪`;
    case "queda_frequencia":
      return `${oi}${assinatura} Vi que os treinos diminuíram nas últimas semanas. Aconteceu alguma coisa? Posso adaptar o treino para ficar mais fácil de manter.`;
    case "pagamento_vencido": {
      const c = Number((alerta.detalhe as any)?.valor_centavos ?? 0);
      const valor = c > 0 ? ` de ${(c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : "";
      return `${oi}${assinatura} Passando para lembrar que o pagamento${valor} ficou em aberto. Se precisar de ajuda com isso, me avisa!`;
    }
    case "renovacao_proxima":
      return `${oi}${assinatura} Seu plano renova nos próximos dias. Que tal a gente conversar sobre os próximos objetivos? Tô animado com a sua evolução!`;
    default:
      return `${oi}${assinatura}`;
  }
}

/** Telefone brasileiro em formato internacional só com dígitos (ou null). */
export function telefoneWhatsapp(tel?: string | null): string | null {
  const d = (tel ?? "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55") && (d.length === 12 || d.length === 13)) return d;
  const semZero = d.replace(/^0+/, "");
  if (semZero.length === 10 || semZero.length === 11) return `55${semZero}`;
  return null;
}

/** Abre o WhatsApp com o texto pronto; sem telefone, o coach escolhe o contato. */
export function linkWhatsapp(texto: string, tel?: string | null): string {
  const num = telefoneWhatsapp(tel);
  return `https://wa.me/${num ?? ""}?text=${encodeURIComponent(texto)}`;
}
