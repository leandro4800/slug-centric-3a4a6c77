import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, MessageCircle, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { chamarIA } from "@/hooks/use-assistente";
import { linkWhatsapp, mensagemPronta, telefoneWhatsapp, type Alerta } from "@/lib/assistente";

type Props = {
  alerta: Alerta | null;
  tenantId: string;
  onClose: () => void;
  /** Chamado ao abrir o WhatsApp: tira o aluno dos alertas por 7 dias. */
  onEnviado: (alerta: Alerta) => void;
};

export const ChamarDialog = ({ alerta, tenantId, onClose, onEnviado }: Props) => {
  const { user } = useAuth();
  const [texto, setTexto] = useState("");
  const [gerando, setGerando] = useState(false);
  const [uso, setUso] = useState<{ usadas: number; limite: number } | null>(null);

  const { data: info } = useQuery({
    queryKey: ["assistente-chamar", alerta?.aluno_id, user?.id],
    enabled: !!alerta?.aluno_id,
    queryFn: async () => {
      const [aluno, coach] = await Promise.all([
        supabase.from("perfis").select("telefone").eq("id", alerta!.aluno_id!).maybeSingle(),
        user ? supabase.from("perfis").select("nome_completo").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      return { telefone: aluno.data?.telefone ?? null, coach: (coach as any).data?.nome_completo ?? null };
    },
  });

  useEffect(() => {
    if (alerta) setTexto(mensagemPronta(alerta, info?.coach));
  }, [alerta, info?.coach]);

  const personalizar = async () => {
    if (!alerta) return;
    setGerando(true);
    try {
      const r = await chamarIA<{ mensagem: string; usadas: number; limite: number }>({ acao: "mensagem", tenant_id: tenantId, alerta_id: alerta.id });
      setTexto(r.mensagem);
      setUso({ usadas: r.usadas, limite: r.limite });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setGerando(false);
    }
  };

  const abrir = () => {
    if (!alerta || !texto.trim()) return;
    window.open(linkWhatsapp(texto.trim(), info?.telefone), "_blank", "noopener,noreferrer");
    onEnviado(alerta);
    onClose();
  };

  const temTelefone = !!telefoneWhatsapp(info?.telefone);

  return (
    <Dialog open={!!alerta} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Chamar {alerta?.aluno_nome?.split(" ")[0] ?? "aluno"}</DialogTitle>
          <DialogDescription>
            Revise a mensagem. Ela só vai quando você enviar no WhatsApp; o aluno nunca recebe nada sozinho.
          </DialogDescription>
        </DialogHeader>
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={6} maxLength={1000} aria-label="Mensagem" />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <Button type="button" variant="outline" size="sm" onClick={personalizar} disabled={gerando}>
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Personalizar com IA
          </Button>
          <span>{uso ? `${uso.usadas} de ${uso.limite} usos de IA no mês` : "Usa treino e peso do aluno, sem dados pessoais."}</span>
        </div>
        {!temTelefone && (
          <p className="text-xs text-muted-foreground">Este aluno não tem telefone no cadastro: o WhatsApp vai abrir para você escolher o contato.</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={abrir} disabled={!texto.trim()}>
            <MessageCircle className="h-4 w-4" /> Abrir WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
