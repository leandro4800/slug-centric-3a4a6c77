import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { chamarIA } from "@/hooks/use-assistente";

type Msg = { papel: "coach" | "assistente"; texto: string };

const SUGESTOES = ["Quanto lucrei no mês passado?", "Quem está para cancelar?", "Quem renova esta semana?"];

export const PergunteNegocio = ({ tenantId }: { tenantId: string }) => {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [uso, setUso] = useState<{ usadas: number; limite: number } | null>(null);

  const enviar = async (texto: string) => {
    const q = texto.trim();
    if (q.length < 2 || carregando) return;
    const historico = msgs.slice(-6);
    setMsgs((m) => [...m, { papel: "coach", texto: q }]);
    setPergunta("");
    setCarregando(true);
    try {
      const r = await chamarIA<{ resposta: string; usadas: number; limite: number }>({ acao: "pergunta", tenant_id: tenantId, pergunta: q, historico });
      setMsgs((m) => [...m, { papel: "assistente", texto: r.resposta }]);
      setUso({ usadas: r.usadas, limite: r.limite });
    } catch (e) {
      setMsgs((m) => [...m, { papel: "assistente", texto: (e as Error).message }]);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-3 border border-border bg-background/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pergunte ao seu negócio</p>
      {msgs.length > 0 && (
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {msgs.map((m, i) => (
            <p
              key={i}
              className={
                m.papel === "coach"
                  ? "ml-auto max-w-[85%] whitespace-pre-wrap bg-primary px-3 py-2 text-sm text-primary-foreground"
                  : "max-w-[85%] whitespace-pre-wrap border border-border bg-card px-3 py-2 text-sm"
              }
            >
              {m.texto}
            </p>
          ))}
          {carregando && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
        </div>
      )}
      {msgs.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGESTOES.map((s) => (
            <button key={s} onClick={() => enviar(s)} className="border border-border px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground">
              {s}
            </button>
          ))}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          enviar(pergunta);
        }}
      >
        <Input value={pergunta} onChange={(e) => setPergunta(e.target.value)} placeholder="Ex.: quanto lucrei em outubro?" maxLength={500} aria-label="Pergunta" />
        <Button type="submit" size="icon" disabled={carregando || pergunta.trim().length < 2} aria-label="Enviar pergunta">
          {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
      <p className="text-[11px] text-muted-foreground">
        A IA só consulta números do seu CT e recebe o mínimo de dados (primeiro nome, sem telefone ou e-mail).
        {uso && ` ${uso.usadas} de ${uso.limite} usos no mês.`}
      </p>
    </div>
  );
};
