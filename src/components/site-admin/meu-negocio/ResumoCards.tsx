import { AlertTriangle, TrendingDown, TrendingUp, UserMinus, UserPlus, Users, Wallet, CalendarClock, ShoppingBag, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBRL, formatPct, DIAS_SUMINDO } from "@/lib/meu-negocio-metrics";

type Props = {
  receita: number;
  variacao: number | null;
  temVendas: boolean;
  pagantes: number;
  gratuitos: number;
  novos: number;
  sairam: number;
  atrasadoValor: number;
  atrasadoAlunos: number;
  previsao: number;
  recorrente: number;
  sumindo: number;
  onVerSumindo: () => void;
};

const Card = ({ titulo, icon: Icon, children, className }: { titulo: string; icon: any; children: React.ReactNode; className?: string }) => (
  <div className={cn("border border-border bg-card p-4", className)}>
    <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary" /> {titulo}
    </p>
    {children}
  </div>
);

export const ResumoCards = (p: Props) => (
  <div className="space-y-3">
    {p.sumindo > 0 && (
      <button
        onClick={p.onVerSumindo}
        className="flex w-full items-center gap-3 border border-primary/40 bg-primary/10 p-3 text-left text-sm transition-colors hover:bg-primary/15"
      >
        <AlertTriangle className="h-4 w-4 shrink-0 text-primary" />
        <span>
          <strong>{p.sumindo} {p.sumindo === 1 ? "aluno está" : "alunos estão"}</strong> há mais de {DIAS_SUMINDO} dias sem treinar.
          <span className="ml-1 text-muted-foreground underline underline-offset-2">Ver quem</span>
        </span>
      </button>
    )}

    {!p.temVendas && (
      <div className="flex items-start gap-3 border border-dashed border-border bg-card p-4">
        <ShoppingBag className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-bold">Ainda sem vendas no app</p>
          <p className="text-xs text-muted-foreground">
            Quando seus alunos começarem a pagar pelo app, a receita, o ticket e os indicadores aparecem aqui sozinhos.
          </p>
        </div>
      </div>
    )}

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      <Card titulo="Receita" icon={Wallet} className="col-span-2 lg:col-span-1">
        <p className="font-display text-3xl tracking-tight">{formatBRL(p.receita)}</p>
        {p.variacao !== null ? (
          <p className={cn("mt-1 flex items-center gap-1 text-xs", p.variacao >= 0 ? "text-foreground" : "text-primary")}>
            {p.variacao >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {p.variacao >= 0 ? "+" : ""}{formatPct(p.variacao)} vs período anterior
          </p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">Sem período anterior para comparar</p>
        )}
      </Card>

      <Card titulo="Alunos ativos" icon={Users}>
        <p className="font-display text-3xl tracking-tight">{p.pagantes + p.gratuitos}</p>
        <p className="mt-1 text-xs text-muted-foreground">{p.pagantes} pagantes + {p.gratuitos} gratuitos</p>
      </Card>

      <Card titulo="Novos / Saíram" icon={UserPlus}>
        <p className="flex items-baseline gap-3 font-display text-3xl tracking-tight">
          <span>+{p.novos}</span>
          <span className="flex items-center gap-1 text-primary"><UserMinus className="h-5 w-5" />{p.sairam}</span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">no período</p>
      </Card>

      <Card titulo="A receber atrasado" icon={AlertTriangle}>
        <p className={cn("font-display text-3xl tracking-tight", p.atrasadoValor > 0 && "text-primary")}>{formatBRL(p.atrasadoValor)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {p.atrasadoAlunos === 0 ? "Ninguém em atraso" : `${p.atrasadoAlunos} ${p.atrasadoAlunos === 1 ? "aluno" : "alunos"}`}
        </p>
      </Card>

      <Card titulo="Previsão próximo mês" icon={CalendarClock}>
        <p className="font-display text-3xl tracking-tight">{formatBRL(p.previsao)}</p>
        <p className="mt-1 text-xs text-muted-foreground">renovações de alunos pagantes</p>
      </Card>

      <Card titulo="Receita recorrente" icon={Repeat}>
        <p className="font-display text-3xl tracking-tight">{formatBRL(p.recorrente)}</p>
        <p className="mt-1 text-xs text-muted-foreground">por mês, somando os planos ativos dos pagantes</p>
      </Card>
    </div>
  </div>
);
