/**
 * Referências técnicas usadas na leitura educacional de exames (Alpha Insight).
 * Links específicos das páginas oficiais de diretrizes.
 */
export const EXAM_REFERENCES = [
  {
    label: "Ministério da Saúde — Protocolos Clínicos e Diretrizes Terapêuticas (PCDT)",
    url: "https://www.gov.br/saude/pt-br/assuntos/pcdt",
  },
  {
    label: "Organização Mundial da Saúde (OMS) — Diretrizes de saúde",
    url: "https://www.who.int/publications/who-guidelines",
  },
  {
    label: "Sociedade Brasileira de Cardiologia — Diretrizes oficiais",
    url: "https://www.portal.cardiol.br/diretrizes",
  },
] as const;

/** Referência genérica sobre interpretação de exames laboratoriais (por biomarcador). */
export const MARKER_REFERENCE_URL = "https://medlineplus.gov/lab-tests/";

export const RESULT_WARNING_TITLE = "⚠️ INFORMAÇÃO IMPORTANTE";

export const RESULT_WARNING_TEXT =
  "Esta análise é exclusivamente informativa e educacional. A Inteligência Artificial pode apresentar interpretações incorretas e não realiza diagnóstico médico. Os resultados devem ser avaliados considerando o contexto individual por um profissional de saúde. Não utilize as informações deste aplicativo para iniciar, alterar ou interromper medicamentos ou tratamentos.";

export const FINAL_DISCLAIMER =
  "Aviso: O Alpha Coach Pro fornece informações educacionais baseadas em referências técnicas e nos dados disponíveis no exame enviado. Esta ferramenta não fornece diagnóstico médico e não substitui consulta, avaliação ou aconselhamento de um profissional de saúde.";

export const UPLOAD_WARNING =
  "⚠️ IMPORTANTE: Esta ferramenta fornece informações de caráter educacional e não realiza diagnóstico médico. Os resultados podem ter diferentes interpretações dependendo do contexto individual. As informações apresentadas não substituem avaliação, diagnóstico ou aconselhamento de um profissional de saúde.";

export type MarkerStatus = "DentroReferencia" | "ForaReferencia" | "NaoIdentificado";

/** Normaliza classificações antigas (Otimizado/Alerta/Critico/Subotimizado) para o novo padrão. */
export function normalizeMarkerStatus(status?: string | null): MarkerStatus {
  const s = (status || "").toLowerCase();
  if (s.includes("dentro") || s === "otimizado" || s === "subotimizado") return "DentroReferencia";
  if (s.includes("fora") || s === "alerta" || s === "critico" || s === "crítico") return "ForaReferencia";
  return "NaoIdentificado";
}
