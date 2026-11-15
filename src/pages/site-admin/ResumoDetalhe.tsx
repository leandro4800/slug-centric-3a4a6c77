import { useMemo, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { BarChart3, CalendarClock, CalendarDays, Loader2, Pencil, Receipt, Target, TrendingUp, Wallet } from "lucide-react";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { useMeuNegocio, type AlunoInfo } from "@/hooks/use-meu-negocio";
import { useMetaMensal } from "@/hooks/use-meta-mensal";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Button } from "@/components/ui/button";
import { ResumoGrafico } from "@/components/site-admin/resumo/ResumoGrafico";
import { MetaMensalDialog } from "@/components/site-admin/resumo/MetaMensalDialog";
import { ReceitaPorProduto } from "@/components/site-admin/meu-negocio/ReceitaPorProduto";
import {
  PRODUTO_LABEL,
  dataCobranca,
  dataPagamento,
  formatBRL,
  getPeriodo,
  pagamentosAtrasados,
  pagamentosPagos,
  pagoPorAluno,
  periodoDias,
  previsaoProximoMes,
  progressoMeta,
  receita,
  receitaDiaria,
  receitaMensal,
  receitaPorProduto,
  receitaRecorrente,
  receitaSemanal,
  renovacoesProximas,
  resumoFinanceiro,
  textoComparacao,
  ticketMedio,
  ticketMensal,
  type Pagamento,
} from "@/lib/meu-negocio-metrics";
import type { MeuNegocioData } from "@/hooks/use-meu-negocio";

export const TEMAS_RESUMO = ["diario", "periodo", "mensal", "ticket", "renovacao", "meta"] as const;
type Tema = (typeof TEMAS_RESUMO)[number];

const TITULOS: Record<Tema, { titulo: string; icon: typeof Wallet }> = {
  diario: { titulo: "Resumo diário", icon: CalendarDays },
  periodo: { titulo: "Vendas por período", icon: TrendingUp },
  mensal: { titulo: "Vendas mensais", icon: BarChart3 },
  ticket: { titulo: "Ticket médio", icon: Receipt },
  renovacao: { titulo: "Renovação esperada", icon: CalendarClock },
  meta: { titulo: "Meta mensal", icon: Target },
};

const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR");
const nomeAluno = (alunos: Map<string, AlunoInfo>, id: string | null, fallback?: string | null) =>
  (id && alunos.get(id)?.nome) || fallback || "Aluno";

const Kpi = ({ label, valor, sub }: { label: string; valor: string; sub?: string }) => (
  <div className="border border-border bg-card p-4">
    <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="font-display text-2xl tracking-tight md:text-3xl">{valor}</p>
    {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
  </div>
);

const Secao = ({ titulo, sub, children }: { titulo: string; sub?: string; children: ReactNode }) => (
  <section className="space-y-3">
    <div>
      <h2 className="font-display text-lg uppercase italic tracking-tight">{titulo}</h2>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
    {children}
  </section>
);

const Vazio = ({ texto }: { texto: string }) => (
  <p className="border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">{texto}</p>
);

const ListaPagamentos = ({ itens, alunos, vazio }: { itens: Pagamento[]; alunos: Map<string, AlunoInfo>; vazio: string }) =>
  itens.length === 0 ? (
    <Vazio texto={vazio} />
  ) : (
    <ul className="divide-y divide-border border border-border bg-card">
      {itens.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{nomeAluno(alunos, p.aluno_id, p.aluno_nome)}</p>
            <p className="text-xs text-muted-foreground">
              {fmtData(p.status === "pago" ? dataPagamento(p) : dataCobranca(p))} · {p.produto_nome || PRODUTO_LABEL[p.produto_tipo ?? ""] || "Venda"}
            </p>
          </div>
          <span className="shrink-0 text-sm font-bold">{formatBRL(p.valor_bruto_centavos)}</span>
        </li>
      ))}
    </ul>
  );

// ---------------------------------------------------------------------------

const Diario = ({ d }: { d: MeuNegocioData }) => {
  const dias = useMemo(() => receitaDiaria(d.pagamentos, 30), [d.pagamentos]);
  const [sel, setSel] = useState(dias[dias.length - 1].key);
  const fin = resumoFinanceiro(d);
  const dia = dias.find((x) => x.key === sel) ?? dias[dias.length - 1];
  const fimDia = new Date(dia.inicio.getFullYear(), dia.inicio.getMonth(), dia.inicio.getDate() + 1);
  const lista = pagamentosPagos(d.pagamentos, { inicio: dia.inicio, fim: fimDia });
  const media = Math.round(dias.reduce((s, x) => s + x.valor, 0) / dias.length);
  const ehHoje = sel === dias[dias.length - 1].key;
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Hoje" valor={formatBRL(fin.hoje)} sub={textoComparacao(fin.hoje, fin.ontem, "Ontem", "Igual ao dia anterior")} />
        <Kpi label="Ontem" valor={formatBRL(fin.ontem)} />
        <Kpi label="Média por dia (30 dias)" valor={formatBRL(media)} />
      </div>
      <ResumoGrafico titulo="Vendas por dia — últimos 30 dias" dados={dias} selecionado={sel} onSelecionar={setSel} />
      <Secao titulo={ehHoje ? "Pagamentos de hoje" : `Pagamentos de ${dia.label}`} sub={`Total: ${formatBRL(dia.valor)}`}>
        <ListaPagamentos itens={lista} alunos={d.alunos} vazio="Nenhum pagamento neste dia." />
      </Secao>
    </>
  );
};

const OPCOES_PERIODO = [7, 30, 90] as const;

const PeriodoVendas = ({ d }: { d: MeuNegocioData }) => {
  const [dias, setDias] = useState<(typeof OPCOES_PERIODO)[number]>(7);
  const { atual, anterior } = periodoDias(dias);
  const total = receita(d.pagamentos, atual);
  const totalAnt = receita(d.pagamentos, anterior);
  const lista = pagamentosPagos(d.pagamentos, atual);
  const grafico = dias === 90 ? receitaSemanal(d.pagamentos, 13) : receitaDiaria(d.pagamentos, dias);
  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:flex">
        {OPCOES_PERIODO.map((n) => (
          <Button key={n} variant={n === dias ? "default" : "outline"} onClick={() => setDias(n)}>
            {n} dias
          </Button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label={`Últimos ${dias} dias`} valor={formatBRL(total)} sub={textoComparacao(total, totalAnt, "Período anterior", "Igual ao período anterior")} />
        <Kpi label={`${dias} dias anteriores`} valor={formatBRL(totalAnt)} />
        <Kpi label="Pagamentos recebidos" valor={String(lista.length)} />
      </div>
      <ResumoGrafico titulo={dias === 90 ? "Vendas por semana" : "Vendas por dia"} dados={grafico} />
      <Secao titulo="Pagamentos do período">
        <ListaPagamentos itens={lista} alunos={d.alunos} vazio="Nenhum pagamento no período." />
      </Secao>
    </>
  );
};

const Mensal = ({ d }: { d: MeuNegocioData }) => {
  const mes = getPeriodo("mes_atual");
  const ant = getPeriodo("mes_anterior");
  const total = receita(d.pagamentos, mes);
  const totalAnt = receita(d.pagamentos, ant);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Mês atual" valor={formatBRL(total)} sub={textoComparacao(total, totalAnt, "Mês passado", "Igual ao mês passado")} />
        <Kpi label="Mês passado" valor={formatBRL(totalAnt)} />
        <Kpi label="Previsão do próximo mês" valor={formatBRL(previsaoProximoMes(d.assinaturas, d.planos))} sub="Renovações já agendadas" />
        <Kpi label="Receita recorrente" valor={formatBRL(receitaRecorrente(d.assinaturas, d.planos))} sub="Por mês, planos ativos" />
      </div>
      <ResumoGrafico titulo="Vendas — últimos 12 meses" dados={receitaMensal(d.pagamentos, 12)} />
      <ReceitaPorProduto linhas={receitaPorProduto(d.pagamentos, mes)} />
      <Secao titulo="Pagamentos deste mês">
        <ListaPagamentos itens={pagamentosPagos(d.pagamentos, mes)} alunos={d.alunos} vazio="Nenhum pagamento neste mês." />
      </Secao>
    </>
  );
};

const Ticket = ({ d }: { d: MeuNegocioData }) => {
  const mes = getPeriodo("mes_atual");
  const t = ticketMedio(d.pagamentos, mes);
  const tAnt = ticketMedio(d.pagamentos, getPeriodo("mes_anterior"));
  const serie = ticketMensal(d.pagamentos, 12);
  const comValor = serie.filter((x) => x.valor !== null);
  const media = comValor.length ? Math.round(comValor.reduce((s, x) => s + (x.valor ?? 0), 0) / comValor.length) : null;
  const porAluno = pagoPorAluno(d.pagamentos, mes);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Ticket do mês" valor={formatBRL(t ?? 0)} sub={t !== null && tAnt !== null ? textoComparacao(t, tAnt, "Mês passado", "Igual ao mês passado") : "Por aluno pagante"} />
        <Kpi label="Mês passado" valor={formatBRL(tAnt ?? 0)} />
        <Kpi label="Média 12 meses" valor={formatBRL(media ?? 0)} />
      </div>
      <ResumoGrafico titulo="Ticket médio por mês" dados={serie} referencia={media} referenciaLabel="média" />
      <Secao titulo="Quanto cada aluno pagou neste mês" sub="O ticket é o total recebido dividido pelo número de alunos que pagaram.">
        {porAluno.length === 0 ? (
          <Vazio texto="Nenhum pagamento neste mês." />
        ) : (
          <ul className="divide-y divide-border border border-border bg-card">
            {porAluno.map((a) => (
              <li key={a.aluno_id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{nomeAluno(d.alunos, a.aluno_id, a.nome)}</p>
                  <p className="text-xs text-muted-foreground">{a.qtd} {a.qtd === 1 ? "pagamento" : "pagamentos"}</p>
                </div>
                <span className="shrink-0 text-sm font-bold">{formatBRL(a.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </>
  );
};

const RenovacaoEsperada = ({ d }: { d: MeuNegocioData }) => {
  const lista = renovacoesProximas(d.assinaturas, d.planos, 30);
  const semana = lista.filter((r) => r.dias <= 7);
  const atrasos = pagamentosAtrasados(d.pagamentos);
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi label="Próximos 30 dias" valor={formatBRL(lista.reduce((s, r) => s + r.valor, 0))} sub={`${lista.length} ${lista.length === 1 ? "aluno" : "alunos"}`} />
        <Kpi label="Próximos 7 dias" valor={formatBRL(semana.reduce((s, r) => s + r.valor, 0))} sub={`${semana.length} ${semana.length === 1 ? "aluno" : "alunos"}`} />
        <Kpi label="Em atraso" valor={formatBRL(atrasos.reduce((s, p) => s + p.valor_bruto_centavos, 0))} sub={`${atrasos.length} ${atrasos.length === 1 ? "cobrança" : "cobranças"}`} />
      </div>
      <Secao titulo="Quem renova nos próximos 30 dias" sub="Só alunos pagantes. Alunos gratuitos não aparecem.">
        {lista.length === 0 ? (
          <Vazio texto="Nenhuma renovação nos próximos 30 dias." />
        ) : (
          <ul className="divide-y divide-border border border-border bg-card">
            {lista.map((r) => (
              <li key={r.assinatura_id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{nomeAluno(d.alunos, r.aluno_id)}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.plano} · {fmtData(r.vence)} · {r.dias === 0 ? "hoje" : r.dias === 1 ? "amanhã" : `em ${r.dias} dias`}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-bold">{formatBRL(r.valor)}</span>
              </li>
            ))}
          </ul>
        )}
      </Secao>
      <Secao titulo="Cobranças em atraso">
        <ListaPagamentos itens={atrasos} alunos={d.alunos} vazio="Nenhuma cobrança em atraso." />
      </Secao>
    </>
  );
};

const Meta = ({ d, tenantId }: { d: MeuNegocioData; tenantId: string }) => {
  const { meta } = useMetaMensal(tenantId);
  const [editar, setEditar] = useState(false);
  const vendido = receita(d.pagamentos, getPeriodo("mes_atual"));
  const prog = progressoMeta(meta, vendido);
  const pct = prog.pct === null ? 0 : Math.min(1, prog.pct);
  return (
    <>
      <div className="border border-border bg-card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vendido neste mês</p>
            <p className="font-display text-4xl tracking-tight">{formatBRL(vendido)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {meta ? `${Math.round((prog.pct ?? 0) * 100)}% de ${formatBRL(meta)}` : "Você ainda não definiu uma meta."}
            </p>
          </div>
          <Button variant={meta ? "outline" : "default"} onClick={() => setEditar(true)}>
            <Pencil className="h-4 w-4" /> {meta ? "Mudar meta" : "Definir meta"}
          </Button>
        </div>
        {meta && (
          <div className="mt-4 h-3 w-full bg-muted">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct * 100}%` }} />
          </div>
        )}
      </div>
      {meta && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label="Falta vender" valor={formatBRL(prog.falta)} sub={prog.falta === 0 ? "Meta batida!" : undefined} />
          <Kpi label="Dias restantes" valor={String(prog.diasRestantes)} sub="Contando hoje" />
          <Kpi label="Precisa vender por dia" valor={formatBRL(prog.porDia)} />
        </div>
      )}
      <ResumoGrafico titulo="Vendas por mês x meta" dados={receitaMensal(d.pagamentos, 12)} referencia={meta} referenciaLabel="meta" />
      <MetaMensalDialog tenantId={tenantId} open={editar} onOpenChange={setEditar} vendidoMes={vendido} />
    </>
  );
};

// ---------------------------------------------------------------------------

const ResumoDetalhe = () => {
  const { tema } = useParams<{ tema: string }>();
  const { tenant, loading } = useSiteTenant();
  const { data, isLoading, error, refetch } = useMeuNegocio(tenant?.id);

  if (!TEMAS_RESUMO.includes(tema as Tema)) return <Navigate to="/site/admin/dashboard" replace />;
  const t = tema as Tema;
  const { titulo, icon: Icon } = TITULOS[t];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <AdminBackButton to="/site/admin/dashboard" />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Métricas financeiras</p>
          <h1 className="flex items-center gap-3 font-display text-3xl uppercase italic tracking-tighter md:text-4xl">
            <Icon className="h-7 w-7 text-primary" /> {titulo}
          </h1>
        </div>
        <Link to="/site/admin/meu-negocio" className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary">
          Ver tudo em Meu negócio →
        </Link>
      </div>

      {loading || (isLoading && !data) ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error || !data ? (
        <div className="space-y-3 border border-border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">Não conseguimos carregar os números agora.</p>
          <Button variant="outline" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : (
        <>
          {t === "diario" && <Diario d={data} />}
          {t === "periodo" && <PeriodoVendas d={data} />}
          {t === "mensal" && <Mensal d={data} />}
          {t === "ticket" && <Ticket d={data} />}
          {t === "renovacao" && <RenovacaoEsperada d={data} />}
          {t === "meta" && <Meta d={data} tenantId={tenant!.id} />}
        </>
      )}
    </div>
  );
};

export default ResumoDetalhe;
