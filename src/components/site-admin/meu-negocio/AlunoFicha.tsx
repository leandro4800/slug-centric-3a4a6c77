import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { dataCobranca, dataPagamento, formatBRL, type Evento, type Pagamento } from "@/lib/meu-negocio-metrics";
import type { AlunoLinha } from "./AlunosLista";

const STATUS_LABEL: Record<string, string> = { pago: "Pago", pendente: "Pendente", vencido: "Vencido", estornado: "Estornado" };
const EVENTO_LABEL: Record<string, string> = { entrou: "Entrou", saiu: "Saiu", voltou: "Voltou" };

const fmtData = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const fmtMes = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

type Props = {
  aluno: AlunoLinha | null;
  eventos: Evento[];
  pagamentos: Pagamento[];
  onClose: () => void;
};

export const AlunoFicha = ({ aluno, eventos, pagamentos, onClose }: Props) => {
  const evs = aluno ? eventos.filter((e) => e.aluno_id === aluno.id).sort((a, b) => a.ocorreu_em.localeCompare(b.ocorreu_em)) : [];
  const pags = aluno
    ? pagamentos.filter((p) => p.aluno_id === aluno.id).sort((a, b) => dataCobranca(b).localeCompare(dataCobranca(a)))
    : [];
  const pagos = pags.filter((p) => p.status === "pago");
  const anoAtual = new Date().getFullYear();
  const pagoAno = pagos.filter((p) => new Date(dataPagamento(p)).getFullYear() === anoAtual).reduce((s, p) => s + p.valor_bruto_centavos, 0);
  const pagoTotal = pagos.reduce((s, p) => s + p.valor_bruto_centavos, 0);
  const desde = evs.find((e) => e.tipo === "entrou")?.ocorreu_em ?? aluno?.desdeFallback ?? null;

  return (
    <Sheet open={!!aluno} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        {aluno && (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="font-display text-2xl uppercase italic tracking-tight">{aluno.nome}</SheetTitle>
              <SheetDescription>
                {aluno.gratuito ? "Aluno gratuito" : aluno.ativo ? "Aluno pagante" : "Não está mais ativo"}
                {aluno.diasSemTreino !== null && aluno.ativo && ` · último treino há ${aluno.diasSemTreino} dias`}
                {aluno.diasSemTreino === null && aluno.ativo && " · ainda não treinou"}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <Info titulo="Aluno desde" valor={desde ? fmtData(desde) : "—"} />
              <Info titulo="Meses pagos" valor={aluno.gratuito ? "—" : String(aluno.mesesPagos.size)} />
              <Info titulo={`Pago em ${anoAtual}`} valor={aluno.gratuito ? "—" : formatBRL(pagoAno)} />
              <Info titulo="Pago no total" valor={aluno.gratuito ? "—" : formatBRL(pagoTotal)} />
            </div>

            <h3 className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Linha do tempo</h3>
            {evs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem registros de entrada ou saída.</p>
            ) : (
              <ol className="relative ml-2 border-l border-border">
                {evs.map((e, i) => (
                  <li key={i} className="mb-3 ml-4">
                    <span className={cn("absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full", e.tipo === "saiu" ? "bg-muted-foreground" : "bg-primary")} />
                    <p className="text-sm font-bold">{EVENTO_LABEL[e.tipo] ?? e.tipo}</p>
                    <p className="text-xs text-muted-foreground">{fmtData(e.ocorreu_em)}</p>
                  </li>
                ))}
              </ol>
            )}

            {!aluno.gratuito && (
              <>
                <h3 className="mb-2 mt-6 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pagamentos</h3>
                {pags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
                ) : (
                  <ul className="divide-y divide-border border border-border">
                    {pags.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold capitalize">{fmtMes(dataCobranca(p))}</p>
                          <p className="truncate text-xs text-muted-foreground">{p.produto_nome || "Plano"}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{formatBRL(p.valor_bruto_centavos)}</p>
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest", p.status === "pago" ? "text-foreground" : "text-primary")}>
                            {STATUS_LABEL[p.status] ?? p.status}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Info = ({ titulo, valor }: { titulo: string; valor: string }) => (
  <div className="border border-border bg-card p-3">
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{titulo}</p>
    <p className="mt-1 text-sm font-bold">{valor}</p>
  </div>
);
