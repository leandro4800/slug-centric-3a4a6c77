import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bot, Check, MessageCircle, Settings, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAlertaAcoes } from "@/hooks/use-assistente";
import { alertasVisiveis, alertaDeAluno, DIAS_ADIAR, ROTULO_TIPO, type Alerta } from "@/lib/assistente";
import { ChamarDialog } from "./ChamarDialog";
import { AssistenteConfigDialog } from "./AssistenteConfigDialog";
import { PergunteNegocio } from "./PergunteNegocio";

const VISIVEIS = 6;

export const AssistenteSecao = ({ tenantId, alertas, nuncaTreinaram }: { tenantId: string; alertas: Alerta[]; nuncaTreinaram: number }) => {
  const { adiar, dispensar } = useAlertaAcoes(tenantId);
  const [chamando, setChamando] = useState<Alerta | null>(null);
  const [config, setConfig] = useState(false);
  const [todos, setTodos] = useState(false);
  const lista = useMemo(() => alertasVisiveis(alertas), [alertas]);
  const mostrados = todos ? lista : lista.slice(0, VISIVEIS);

  const jaFalei = (a: Alerta) =>
    adiar.mutate(a.id, {
      onSuccess: () => toast.success(`${a.aluno_nome?.split(" ")[0] ?? "Aluno"} sai dos alertas por ${DIAS_ADIAR} dias.`),
      onError: () => toast.error("Não foi possível salvar agora."),
    });
  const onDispensar = (a: Alerta) => dispensar.mutate(a.id, { onError: () => toast.error("Não foi possível salvar agora.") });

  return (
    <section className="space-y-3 border border-primary/40 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg uppercase italic tracking-tight">
          <Bot className="h-5 w-5 text-primary" /> Assistente
        </h2>
        <Button variant="outline" size="sm" onClick={() => setConfig(true)}>
          <Settings className="h-4 w-4" /> Configurar
        </Button>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada pedindo sua atenção hoje.</p>
      ) : (
        <ul className="divide-y divide-border border border-border">
          {mostrados.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <span
                  className={cn(
                    "mr-2 inline-block border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    a.prioridade === 1 ? "border-primary text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {ROTULO_TIPO[a.tipo] ?? a.tipo}
                </span>
                <span className="text-sm">{a.titulo}</span>
              </div>
              <div className="flex shrink-0 gap-2">
                {alertaDeAluno(a) && (
                  <>
                    <Button size="sm" onClick={() => setChamando(a)}>
                      <MessageCircle className="h-4 w-4" /> Chamar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => jaFalei(a)} disabled={adiar.isPending}>
                      <Check className="h-4 w-4" /> Já falei
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => onDispensar(a)} disabled={dispensar.isPending}>
                  <X className="h-4 w-4" /> Dispensar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {lista.length > VISIVEIS && (
        <button onClick={() => setTodos((v) => !v)} className="text-xs text-muted-foreground underline underline-offset-2">
          {todos ? "Mostrar menos" : `+ ${lista.length - VISIVEIS} alertas`}
        </button>
      )}

      {nuncaTreinaram > 0 && (
        <p className="text-xs text-muted-foreground">
          Para sua informação: {nuncaTreinaram} {nuncaTreinaram === 1 ? "aluno ativo ainda não fez" : "alunos ativos ainda não fizeram"} o primeiro treino.
        </p>
      )}

      <PergunteNegocio tenantId={tenantId} />

      <ChamarDialog
        alerta={chamando}
        tenantId={tenantId}
        onClose={() => setChamando(null)}
        onEnviado={(a) => adiar.mutate(a.id)}
      />
      <AssistenteConfigDialog tenantId={tenantId} open={config} onOpenChange={setConfig} />
    </section>
  );
};
