import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarPlus, Trash2, Users } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
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
  ativo: boolean;
}

interface Agend {
  id: string;
  slot_id: string | null;
  nome: string;
  email: string;
  telefone: string | null;
  status: string;
  created_at: string;
}

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const AdminAgendaAvulsa = () => {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [agends, setAgends] = useState<Agend[]>([]);
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [capacidade, setCapacidade] = useState("1");
  const [local, setLocal] = useState("");
  const [linkOnline, setLinkOnline] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!tenant) return;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase
        .from("agenda_aula_avulsa_slots")
        .select("*")
        .eq("tenant_id", tenant.id)
        .gte("data", today)
        .order("data")
        .order("hora_inicio"),
      supabase
        .from("agendamentos_aula_avulsa")
        .select("*")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false }),
    ]);
    setSlots((s as Slot[]) || []);
    setAgends((a as Agend[]) || []);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [tenant?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!data || !horaInicio || !horaFim) {
      toast.error("Preencha data, hora início e fim");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("agenda_aula_avulsa_slots").insert({
      tenant_id: tenant.id,
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      capacidade: parseInt(capacidade) || 1,
      local: local || null,
      link_online: linkOnline || null,
      observacao: observacao || null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Horário criado!");
    setData(""); setHoraInicio(""); setHoraFim(""); setCapacidade("1");
    setLocal(""); setLinkOnline(""); setObservacao("");
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este horário?")) return;
    const { error } = await supabase.from("agenda_aula_avulsa_slots").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); void load(); }
  };

  const handleToggle = async (s: Slot) => {
    const { error } = await supabase
      .from("agenda_aula_avulsa_slots")
      .update({ ativo: !s.ativo })
      .eq("id", s.id);
    if (error) toast.error(error.message);
    else void load();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 bg-black/95 z-10">
        <AdminBackButton to={`/${slug}/admin`} />
        <h1 className="font-display text-xl uppercase tracking-wider">Agenda — Aulas Avulsas</h1>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Form criar slot */}
        <section className="bg-black/60 border border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarPlus className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase tracking-wider text-primary">Novo horário</h2>
          </div>
          <form onSubmit={handleCreate} className="grid md:grid-cols-3 gap-4">
            <div>
              <Label>Data</Label>
              <Input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
            </div>
            <div>
              <Label>Hora início</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required />
            </div>
            <div>
              <Label>Hora fim</Label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} required />
            </div>
            <div>
              <Label>Capacidade</Label>
              <Input type="number" min="1" value={capacidade} onChange={(e) => setCapacidade(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Label>Local (opcional)</Label>
              <Input value={local} onChange={(e) => setLocal(e.target.value)} placeholder="Ex: Studio Central — Av X, 123" />
            </div>
            <div className="md:col-span-3">
              <Label>Link online (opcional)</Label>
              <Input value={linkOnline} onChange={(e) => setLinkOnline(e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
            <div className="md:col-span-3">
              <Label>Observação</Label>
              <Input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Trazer toalha, garrafinha…" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar horário"}
              </Button>
            </div>
          </form>
        </section>

        {/* Lista de slots */}
        <section>
          <h2 className="font-display text-2xl uppercase tracking-wider mb-4">Próximos horários</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum horário cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {slots.map((s) => {
                const reservas = agends.filter((a) => a.slot_id === s.id && a.status === "confirmado");
                return (
                  <div key={s.id} className={`bg-black/60 border rounded-xl p-4 ${s.ativo ? "border-white/20" : "border-white/5 opacity-50"}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-display text-lg">{formatDate(s.data)} · {s.hora_inicio.slice(0,5)}–{s.hora_fim.slice(0,5)}</p>
                        {s.local && <p className="text-xs text-muted-foreground">{s.local}</p>}
                        {s.link_online && <p className="text-xs text-primary break-all">{s.link_online}</p>}
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Users className="h-3 w-3" /> {s.reservados} / {s.capacidade} reservas
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleToggle(s)}>
                          {s.ativo ? "Desativar" : "Ativar"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(s.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {reservas.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                        {reservas.map((r) => (
                          <p key={r.id} className="text-xs text-muted-foreground">
                            <span className="text-white">{r.nome}</span> · {r.email}{r.telefone ? ` · ${r.telefone}` : ""}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Agendamentos pagos sem slot */}
        <section>
          <h2 className="font-display text-xl uppercase tracking-wider mb-4">Pagos aguardando escolha de horário</h2>
          {agends.filter((a) => a.status === "pago" && !a.slot_id).length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum pendente.</p>
          ) : (
            <div className="space-y-2">
              {agends.filter((a) => a.status === "pago" && !a.slot_id).map((a) => (
                <div key={a.id} className="bg-black/60 border border-yellow-500/30 rounded-xl p-3 text-sm">
                  <span className="text-white font-medium">{a.nome}</span> · {a.email}{a.telefone ? ` · ${a.telefone}` : ""}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminAgendaAvulsa;
