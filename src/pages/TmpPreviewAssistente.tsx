import { AssistenteSecao } from "@/components/site-admin/meu-negocio/AssistenteSecao";
import { DespesasGraficoMensal } from "@/components/site-admin/meu-negocio/DespesasGraficoMensal";
import { CustosFixosSecao } from "@/components/site-admin/meu-negocio/CustosFixosSecao";
import { despesasMensais, custoFixoMensal } from "@/lib/meu-negocio-metrics";
const al = (id: string, tipo: string, prioridade: number, titulo: string, aluno = true) => ({ id, tenant_id: "t", aluno_id: aluno ? id : null, aluno_nome: titulo.split(" ")[0], tipo, prioridade, titulo, detalhe: {}, estado: "novo", adiar_ate: null, created_at: "2026-11-15T09:30:00Z" });
const alertas = [
  al("1", "sumindo", 3, "Gustavo está há 12 dias sem treinar"),
  al("2", "pagamento_vencido", 1, "Ana está com pagamento atrasado (R$ 150,00)"),
  al("3", "renovacao_proxima", 2, "Bruno renova em 18/11"),
  al("4", "lucro_queda", 2, "Lucro caiu em 10/2026: R$ 1.200,00 (antes R$ 1.800,00)", false),
];
const desp = [
  { id: "f1", categoria: "aluguel_academia", valor_centavos: 120000, data: "2026-06-01", descricao: "Aluguel da sala", fixa: true, gasto_captacao: false },
  { id: "f2", categoria: "anuncio", valor_centavos: 30000, data: "2026-09-01", descricao: "Instagram Ads", fixa: true, gasto_captacao: true },
  { id: "a1", categoria: "equipamento", valor_centavos: 45000, data: "2026-10-10", descricao: "Halteres", fixa: false, gasto_captacao: false },
];
export default function TmpPreviewAssistente() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <AssistenteSecao tenantId="t" alertas={alertas as any} nuncaTreinaram={3} />
      <DespesasGraficoMensal dados={despesasMensais(desp, 12)} />
      <CustosFixosSecao tenantId="t" fixas={desp.filter((d) => d.fixa)} total={custoFixoMensal(desp)} onApagar={() => {}} />
    </div>
  );
}
