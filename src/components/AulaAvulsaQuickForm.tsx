import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useNavigate, useParams } from "react-router-dom";

interface Props {
  tenantId: string;
  tenantNome: string;
  preco: number;
  onClose?: () => void;
}

export const AulaAvulsaQuickForm = ({ tenantId, tenantNome, preco, onClose }: Props) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState<{ token: string } | null>(null);

  const handleCheckEmail = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agendamento-aula?email=${email.trim().toLowerCase()}&tenant_id=${tenantId}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const json = await res.json();
      if (json.found && json.token) {
        setAlreadyPaid({ token: json.token });
        toast.success("Encontramos sua aula avulsa!");
      } else {
        setAlreadyPaid(null);
      }
    } catch (err) {
      console.error("Erro ao verificar e-mail", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (alreadyPaid) {
      navigate(`/${slug}/agendar-aula/${alreadyPaid.token}`);
      onClose?.();
      return;
    }

    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha nome e e-mail");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          tenant_id: tenantId,
          type: "aula_avulsa",
          email: email.trim().toLowerCase(),
          nome: nome.trim(),
          telefone: telefone.trim(),
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao iniciar pagamento");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="font-display text-2xl uppercase">Aula Avulsa</h3>
        <p className="text-sm text-muted-foreground">
          {tenantNome} · R$ {preco.toFixed(2).replace(".", ",")}
        </p>
      </div>
      
      <div>
        <Label htmlFor="aa-email">E-mail</Label>
        <div className="flex gap-2">
          <Input 
            id="aa-email" 
            type="email" 
            required 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            onBlur={handleCheckEmail}
            placeholder="Seu e-mail de compra"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Usaremos seu e-mail para identificar pagamentos anteriores.
        </p>
      </div>

      {!alreadyPaid ? (
        <>
          <div>
            <Label htmlFor="aa-nome">Nome completo</Label>
            <Input id="aa-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="aa-tel">Telefone (WhatsApp)</Label>
            <Input id="aa-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
          </div>
          <Button type="submit" disabled={loading} className="w-full font-bold uppercase tracking-widest">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pagar R$ ${preco.toFixed(2).replace(".", ",")}`}
          </Button>
        </>
      ) : (
        <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg space-y-3">
          <p className="text-sm text-center">
            Identificamos uma aula avulsa vinculada a este e-mail.
          </p>
          <Button type="submit" className="w-full font-bold uppercase tracking-widest">
            <Calendar className="mr-2 h-4 w-4" /> Ir para Agendamento
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            className="w-full text-xs"
            onClick={() => setAlreadyPaid(null)}
          >
            Comprar outra aula
          </Button>
        </div>
      )}

      {onClose && (
        <Button type="button" variant="ghost" onClick={onClose} className="w-full text-xs">
          Cancelar
        </Button>
      )}
    </form>
  );
};
