import { useMemo, useState } from "react";
import { BriefcaseBusiness, Loader2 } from "lucide-react";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { useMeuNegocio } from "@/hooks/use-meu-negocio";
import { useDespesas } from "@/hooks/use-despesas";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PERIODO_OPCOES,
  alunosPagantes,
  atrasado,
  contarEventos,
  despesasNoPeriodo,
  despesasPorCategoria,
  diasSemTreino,
  estaSumindo,
  nuncaTreinou,
  formatBRL,
  formatPct,
  getPeriodo,
  getPeriodoAnterior,
  inadimplencia,
  isAtiva,
  ltv,
  mesesPagosPorAluno,
  permanenciaMedia,
  previsaoProximoMes,
  receita,
  receitaMensal,
  receitaPorProduto,
  receitaRecorrente,
  resultadoNegocio,
  retencao,
  semaforoInadimplencia,
  semaforoLtvCac,
  semaforoMargem,
  semaforoRetencao,
  ticketMedio,
  ultimosMeses,
  variacao,
  type PeriodoKey,
} from "@/lib/meu-negocio-metrics";
import { ResumoCards } from "@/components/site-admin/meu-negocio/ResumoCards";
import { Indicadores, type Indicador } from "@/components/site-admin/meu-negocio/Indicadores";
import { ReceitaPorProduto } from "@/components/site-admin/meu-negocio/ReceitaPorProduto";
import { ReceitaMiniGrafico } from "@/components/site-admin/meu-negocio/ReceitaMiniGrafico";
import { AlunosLista, type AlunoLinha, type FiltroAluno } from "@/components/site-admin/meu-negocio/AlunosLista";
import { AlunoFicha } from "@/components/site-admin/meu-negocio/AlunoFicha";
import { DespesasSecao } from "@/components/site-admin/meu-negocio/DespesasSecao";
import { AssistenteSecao } from "@/components/site-admin/meu-negocio/AssistenteSecao";
import { useAlertas } from "@/hooks/use-assistente";
import { riscoCancelamento } from "@/lib/assistente";

const MeuNegocio = () => {
  const { tenant, loading: tenantLoading } = useSiteTenant();
  const { data, isLoading, error, refetch } = useMeuNegocio(tenant?.id);
  const { data: despesas } = useDespesas(tenant?.id);
  const { data: alertas } = useAlertas(tenant?.id);
  const [periodoKey, setPeriodoKey] = useState<PeriodoKey>("mes_atual");
  const [filtro, setFiltro] = useState<FiltroAluno>("ativos");
  const [aberto, setAberto] = useState<AlunoLinha | null>(null);

  const calc = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const periodo = getPeriodo(periodoKey, now);
    const anterior = getPeriodoAnterior(periodo);
    const { assinaturas, pagamentos, eventos, planos, alunos } = data;

    const pagantes = alunosPagantes(assinaturas, pagamentos);
    const ativosIds = new Set(assinaturas.filter(isAtiva).map((a) => a.aluno_id));
    const mesesPagos = mesesPagosPorAluno(pagamentos);

    const eventosPorAluno = new Map<string, typeof eventos>();
    for (const e of eventos) {
      if (!e.aluno_id) continue;
      if (!eventosPorAluno.has(e.aluno_id)) eventosPorAluno.set(e.aluno_id, []);
      eventosPorAluno.get(e.aluno_id)!.push(e);
    }
    const atrasadosIds = new Set(pagamentos.filter((p) => p.status === "vencido").map((p) => p.aluno_id));
    const caindoIds = new Set(
      (alertas ?? []).filter((a) => a.tipo === "queda_frequencia").map((a) => a.aluno_id),
    );
    const criadoEm = new Map<string, string>();
    for (const a of assinaturas) if (!criadoEm.has(a.aluno_id)) criadoEm.set(a.aluno_id, a.created_at);

    const linhas: AlunoLinha[] = [...alunos.values()].map((info) => {
      const ativo = ativosIds.has(info.id);
      const evs = eventosPorAluno.get(info.id) ?? [];
      const dias = diasSemTreino(info.ultimo_treino, now);
      return {
        id: info.id,
        nome: info.nome,
        avatar_url: info.avatar_url,
        ativo,
        gratuito: ativo && !pagantes.has(info.id),
        sumindo: ativo && estaSumindo(info.ultimo_treino, now),
        nuncaTreinou: ativo && nuncaTreinou(info.ultimo_treino),
        risco: ativo ? riscoCancelamento({ diasSemTreino: dias, atrasado: atrasadosIds.has(info.id), quedaFrequencia: caindoIds.has(info.id) }) : null,
        saiu: !ativo,
        voltou: ativo && evs.some((e) => e.tipo === "voltou"),
        diasSemTreino: dias,
        mesesPagos: mesesPagos.get(info.id) ?? new Set(),
        desdeFallback: criadoEm.get(info.id) ?? null,
      };
    });

    const rec = receita(pagamentos, periodo);
    const recAnt = receita(pagamentos, anterior);
    const atr = atrasado(pagamentos);
    const ticket = ticketMedio(pagamentos, periodo);
    const ret = retencao(eventos, pagantes, periodo, now);
    const inad = inadimplencia(pagamentos, periodo);
    const perm = permanenciaMedia(pagamentos);
    const vida = ltv(pagamentos);
    const listaDespesas = despesas ?? [];
    const ocorrencias = despesasNoPeriodo(listaDespesas, periodo, now);
    const res = resultadoNegocio({ pagamentos, eventos, pagantes, despesas: listaDespesas, periodo, now });
    const semDespesas = listaDespesas.length === 0;
    const pagantesAtivos = linhas.filter((l) => l.ativo && !l.gratuito).length;

    const indicadores: Indicador[] = [
      {
        titulo: "Ticket médio",
        valor: formatBRL(ticket),
        cor: "neutro",
        frase: ticket === null ? "Aparece quando houver alunos pagando no período." : "Quanto cada aluno pagante deixou, em média, no período.",
      },
      {
        titulo: "Retenção",
        valor: formatPct(ret),
        cor: semaforoRetencao(ret),
        frase:
          ret === null
            ? "Aparece quando houver alunos pagantes no início do período."
            : ret >= 0.9
              ? "Ótimo: quase todos os pagantes continuam com você."
              : ret >= 0.8
                ? "Atenção: alguns pagantes estão saindo."
                : "Alerta: muitos pagantes saíram no período.",
      },
      {
        titulo: "Inadimplência",
        valor: formatPct(inad, 1),
        cor: semaforoInadimplencia(inad),
        frase:
          inad === null
            ? "Aparece quando houver cobranças no período."
            : inad <= 0.03
              ? "Ótimo: quase tudo que foi cobrado foi pago."
              : inad <= 0.1
                ? "Atenção: há cobranças em atraso."
                : "Alerta: muita cobrança em atraso.",
      },
      {
        titulo: "Permanência média",
        valor: perm === null ? "—" : `${perm.toFixed(1).replace(".", ",")} ${perm === 1 ? "mês" : "meses"}`,
        cor: "neutro",
        frase: perm === null ? "Aparece quando houver pagamentos." : "Quantos meses, em média, cada aluno pagante já pagou.",
      },
      {
        titulo: "LTV",
        valor: formatBRL(vida),
        cor: "neutro",
        frase: vida === null ? "Aparece quando houver pagamentos." : "Quanto cada aluno pagante já deixou, em média, desde que entrou.",
      },
    ];

    const fraseSemDespesa = "Lance despesas para calcular.";
    const resultado: Indicador[] = [
      {
        titulo: "Lucro do negócio",
        valor: semDespesas ? "—" : formatBRL(res.lucro),
        cor: semDespesas ? "neutro" : res.lucro >= 0 ? "verde" : "vermelho",
        frase: semDespesas ? fraseSemDespesa : "O que sobrou: recebido (já sem taxas) menos despesas do período.",
      },
      {
        titulo: "Margem",
        valor: semDespesas ? "—" : formatPct(res.margem),
        cor: semDespesas ? "neutro" : semaforoMargem(res.margem),
        frase: semDespesas ? fraseSemDespesa : res.margem === null ? "Aparece quando houver receita no período." : "Quanto de cada R$ 100 vendidos virou lucro.",
      },
      {
        titulo: "CAC",
        valor: formatBRL(res.cac),
        cor: "neutro",
        frase:
          res.captacao === 0
            ? "Marque gastos como captação (ex.: anúncio) para calcular."
            : res.cac === null
              ? "Nenhum aluno pagante novo no período."
              : "Quanto custou, em média, trazer cada aluno pagante novo.",
      },
      {
        titulo: "LTV versus CAC",
        valor: res.ltvCac === null ? "—" : `${res.ltvCac.toFixed(1).replace(".", ",")}x`,
        cor: semaforoLtvCac(res.ltvCac),
        frase:
          res.ltvCac === null
            ? "Aparece quando houver CAC e pagamentos."
            : res.ltvCac >= 3
              ? "Ótimo: cada aluno vale bem mais do que custou."
              : res.ltvCac >= 1
                ? "Atenção: o aluno paga o que custou, mas sobra pouco."
                : "Alerta: trazer aluno está custando mais do que ele paga.",
      },
      {
        titulo: "Retorno da captação",
        valor: res.retornoCaptacao === null ? "—" : `${res.retornoCaptacao.toFixed(1).replace(".", ",")}x`,
        cor: "neutro",
        frase:
          res.retornoCaptacao === null
            ? "Marque gastos como captação para calcular."
            : `Cada R$ 1 investido em captação trouxe ${formatBRL(Math.round(res.retornoCaptacao * 100))} dos alunos novos no período.`,
      },
      {
        titulo: "Ponto de equilíbrio",
        valor: res.pontoEquilibrioAlunos === null ? "—" : `${res.pontoEquilibrioAlunos} ${res.pontoEquilibrioAlunos === 1 ? "aluno" : "alunos"}`,
        cor: res.pontoEquilibrioAlunos === null ? "neutro" : pagantesAtivos >= res.pontoEquilibrioAlunos ? "verde" : "vermelho",
        frase: semDespesas
          ? fraseSemDespesa
          : res.pontoEquilibrioAlunos === null
            ? `Precisa faturar ${formatBRL(res.despesaMensal)} por mês para cobrir as despesas.`
            : `Pagantes necessários para cobrir ${formatBRL(res.despesaMensal)}/mês. Você tem ${pagantesAtivos}.`,
      },
    ];

    return {
      linhas,
      indicadores,
      resultado,
      despesas: { lista: listaDespesas, ocorrencias, porCategoria: despesasPorCategoria(ocorrencias), total: res.despesas },
      resumo: {
        receita: rec,
        variacao: variacao(rec, recAnt),
        temVendas: rec > 0,
        pagantes: linhas.filter((l) => l.ativo && !l.gratuito).length,
        gratuitos: linhas.filter((l) => l.gratuito).length,
        novos: contarEventos(eventos, "entrou", periodo),
        sairam: contarEventos(eventos, "saiu", periodo),
        atrasadoValor: atr.valor,
        atrasadoAlunos: atr.alunos,
        previsao: previsaoProximoMes(assinaturas, planos, now),
        recorrente: receitaRecorrente(assinaturas, planos),
        sumindo: linhas.filter((l) => l.sumindo).length,
      },
      nuncaTreinaram: linhas.filter((l) => l.nuncaTreinou).length,
      produtos: receitaPorProduto(pagamentos, periodo),
      mensal: receitaMensal(pagamentos, 12, now),
      meses: ultimosMeses(12, now),
    };
  }, [data, despesas, alertas, periodoKey]);

  const verSumindo = () => {
    setFiltro("sumindo");
    document.getElementById("meu-negocio-alunos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (tenantLoading || (isLoading && !data)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Gestão</p>
          <h1 className="flex items-center gap-3 font-display text-3xl uppercase italic tracking-tighter md:text-4xl">
            <BriefcaseBusiness className="h-7 w-7 text-primary" /> Meu negócio
          </h1>
        </div>
        <Select value={periodoKey} onValueChange={(v) => setPeriodoKey(v as PeriodoKey)}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Período">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODO_OPCOES.map((o) => (
              <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error || !calc ? (
        <div className="space-y-3 border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Não conseguimos carregar os números agora.</p>
          <button onClick={() => refetch()} className="border border-border px-4 py-2 text-sm font-bold hover:bg-primary/10">
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <AssistenteSecao tenantId={tenant!.id} alertas={alertas ?? []} nuncaTreinaram={calc.nuncaTreinaram} />
          <ResumoCards {...calc.resumo} onVerSumindo={verSumindo} />
          <ReceitaMiniGrafico dados={calc.mensal} />
          <Indicadores itens={calc.indicadores} />
          <ReceitaPorProduto linhas={calc.produtos} />
          <DespesasSecao
            tenantId={tenant!.id}
            despesas={calc.despesas.lista}
            ocorrencias={calc.despesas.ocorrencias}
            porCategoria={calc.despesas.porCategoria}
            total={calc.despesas.total}
          />
          <Indicadores titulo="Resultado do negócio" subtitulo="Calculado com as vendas e as despesas lançadas." itens={calc.resultado} />
          <AlunosLista alunos={calc.linhas} meses={calc.meses} filtro={filtro} onFiltro={setFiltro} onAbrir={setAberto} />
          <AlunoFicha aluno={aberto} eventos={data!.eventos} pagamentos={data!.pagamentos} onClose={() => setAberto(null)} />
        </>
      )}
    </div>
  );
};

export default MeuNegocio;
