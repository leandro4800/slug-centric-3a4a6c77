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
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        <Label htmlFor="aa-nome">Nome completo</Label>
        <Input id="aa-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="aa-email">E-mail</Label>
        <Input id="aa-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="aa-tel">Telefone (WhatsApp)</Label>
        <Input id="aa-tel" type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 99999-9999" />
      </div>
      <Button type="submit" disabled={loading} className="w-full font-bold uppercase tracking-widest">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pagar R$ ${preco.toFixed(2).replace(".", ",")}`}
      </Button>
      {onClose && (
        <Button type="button" variant="ghost" onClick={onClose} className="w-full text-xs">
          Cancelar
        </Button>
      )}
    </form>
  );
};
