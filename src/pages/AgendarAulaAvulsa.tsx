import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CalendarCheck, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Slot {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  capacidade: number;
  reservados: number;
  local: string | null;
  link_online: string | null;
  observacao: string | null;
}

interface Agendamento {
  id: string;
  tenant_id: string;
  slot_id: string | null;
  nome: string;
  email: string;
  status: string;
}

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const AgendarAulaAvulsa = () => {
  const { slug, token } = useParams();
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [tenant, setTenant] = useState<{ slug: string; nome: string; logo_url: string | null } | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agendamento-aula?token=${token}`,
        { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro carregando agendamento");
      setAgendamento(json.agendamento);
      setTenant(json.tenant);
      setSlot(json.slot);
      setSlots(json.slots || []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [token]);

  const handleSelect = async (slotId: string) => {
    if (!token) return;
    setConfirming(slotId);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agendamento-aula`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ token, slot_id: slotId }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro reservando");
      toast.success("Aula agendada!");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setConfirming(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!agendamento || !tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <p>Agendamento não encontrado.</p>
      </div>
    );
  }

  const isPending = agendamento.status === "pendente";
  const isConfirmed = agendamento.status === "confirmado" && slot;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4">
        {tenant.logo_url && <img src={tenant.logo_url} alt="" className="h-10 w-10 rounded object-cover" />}
        <div>
          <h1 className="font-display text-xl uppercase">{tenant.nome}</h1>
          <p className="text-xs text-muted-foreground">Aula avulsa</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6">
        {isPending && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-center">
            <p className="text-sm">Aguardando confirmação do pagamento. Recarregue em instantes.</p>
            <Button onClick={load} variant="ghost" size="sm" className="mt-3">Recarregar</Button>
          </div>
        )}

        {isConfirmed && slot && (
          <div className="bg-card border border-primary/30 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <CheckCircle2 className="h-6 w-6" />
              <h2 className="font-display text-2xl uppercase">Aula confirmada!</h2>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> {formatDate(slot.data)}</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {slot.hora_inicio.slice(0,5)} — {slot.hora_fim.slice(0,5)}</p>
              {slot.local && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {slot.local}</p>}
              {slot.link_online && (
                <p className="break-all">
                  <a href={slot.link_online} target="_blank" rel="noreferrer" className="text-primary underline">Link da aula online</a>
                </p>
              )}
              {slot.observacao && <p className="text-muted-foreground italic">{slot.observacao}</p>}
            </div>
            <Link to={`/${slug}`}>
              <Button variant="outline" className="w-full mt-4">Voltar</Button>
            </Link>
          </div>
        )}

        {!isPending && !isConfirmed && (
          <>
            <div className="text-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />
              <h2 className="font-display text-2xl uppercase">Pagamento confirmado!</h2>
              <p className="text-sm text-muted-foreground mt-1">Escolha um horário disponível para a sua aula avulsa.</p>
            </div>

            {slots.length === 0 ? (
              <div className="bg-card border border-border rounded-xl p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nenhum horário disponível no momento. O coach entrará em contato pelo e-mail{" "}
                  <strong>{agendamento.email}</strong>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelect(s.id)}
                    disabled={!!confirming}
                    className="w-full text-left bg-card border border-border hover:border-primary rounded-xl p-4 transition disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-display text-lg">{formatDate(s.data)}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" /> {s.hora_inicio.slice(0,5)} — {s.hora_fim.slice(0,5)}
                        </p>
                        {s.local && (
                          <p className="text-xs text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-3 w-3" /> {s.local}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {s.capacidade - s.reservados} vaga{s.capacidade - s.reservados > 1 ? "s" : ""}
                      </div>
                    </div>
                    {confirming === s.id && (
                      <p className="text-xs text-primary mt-2 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Reservando…
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AgendarAulaAvulsa;
