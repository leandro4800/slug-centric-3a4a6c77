import { DespesasSecao } from "@/components/site-admin/meu-negocio/DespesasSecao";
import { Indicadores } from "@/components/site-admin/meu-negocio/Indicadores";
import { despesasNoPeriodo, despesasPorCategoria, getPeriodo, somaDespesas, type Despesa } from "@/lib/meu-negocio-metrics";
const despesas: Despesa[] = [
  { id: "1", categoria: "aluguel_academia", valor_centavos: 80000, data: "2026-09-05", descricao: "Sala do estúdio", fixa: true, gasto_captacao: false },
  { id: "2", categoria: "anuncio", valor_centavos: 15000, data: "2026-11-10", descricao: "Instagram", fixa: false, gasto_captacao: true, origem: "planilha" },
  { id: "3", categoria: "contador", valor_centavos: 25000, data: "2026-11-12", descricao: null, fixa: false, gasto_captacao: false },
];
export default function TmpDespesasPreview() {
  const oc = despesasNoPeriodo(despesas, getPeriodo("mes_atual"));
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <DespesasSecao tenantId="x" despesas={despesas} ocorrencias={oc} porCategoria={despesasPorCategoria(oc)} total={somaDespesas(oc)} />
      <Indicadores titulo="Resultado do negócio" subtitulo="Calculado com as vendas e as despesas lançadas." itens={[
        { titulo: "Lucro do negócio", valor: "R$ 1.040,00", cor: "verde", frase: "O que sobrou." },
        { titulo: "LTV versus CAC", valor: "4,0x", cor: "verde", frase: "Ótimo." },
        { titulo: "Ponto de equilíbrio", valor: "6 alunos", cor: "vermelho", frase: "Você tem 4." },
      ]} />
    </div>
  );
}
