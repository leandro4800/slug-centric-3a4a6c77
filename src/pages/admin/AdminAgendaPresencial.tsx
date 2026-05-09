import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarPlus, Trash2, Users, MapPin } from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { toast } from "sonner";

interface Slot {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  capacidade: number;
  reservados: number;
  local_nome: string;
  local_endereco: string | null;
  local_lat: number | null;
  local_lng: number | null;
  ativo: boolean;
}

interface Reserva {
  id: string;
  slot_id: string;
  aluno_id: string;
  status: string;
  academia_confirmada: string | null;
  created_at: string;
  aluno?: { nome_completo: string | null; email: string | null };
}

const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

const AdminAgendaPresencial = () => {
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [capacidade, setCapacidade] = useState("8");
  const [localNome, setLocalNome] = useState("");
  const [localEndereco, setLocalEndereco] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!tenant) return;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data: s } = await supabase
      .from("agenda_presencial_slots")
      .select("*")
      .eq("tenant_id", tenant.id)
      .gte("data", today)
      .order("data")
      .order("hora_inicio");
    const slotIds = (s || []).map((x: any) => x.id);
    let reservasData: any[] = [];
    if (slotIds.length) {
      const { data: r } = await supabase
        .from("agendamentos_presenciais")
        .select("id, slot_id, aluno_id, status, created_at")
        .in("slot_id", slotIds);
      const alunoIds = Array.from(new Set((r || []).map((x: any) => x.aluno_id)));
      let perfis: Record<string, any> = {};
      if (alunoIds.length) {
        const { data: p } = await supabase
          .from("perfis")
          .select("id, nome_completo, email")
          .in("id", alunoIds);
        (p || []).forEach((x: any) => { perfis[x.id] = x; });
      }
      reservasData = (r || []).map((x: any) => ({ ...x, aluno: perfis[x.aluno_id] }));
    }
    setSlots((s as Slot[]) || []);
    setReservas(reservasData);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [tenant?.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!data || !horaInicio || !horaFim || !localNome) {
      toast.error("Preencha data, horários e nome do local");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("agenda_presencial_slots").insert({
      tenant_id: tenant.id,
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      capacidade: parseInt(capacidade) || 1,
      local_nome: localNome,
      local_endereco: localEndereco || null,
      local_lat: lat ? parseFloat(lat) : null,
      local_lng: lng ? parseFloat(lng) : null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Horário presencial criado!");
    setData(""); setHoraInicio(""); setHoraFim("");
    setLocalEndereco(""); setLat(""); setLng("");
    void load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este horário? As reservas também serão removidas.")) return;
    const { error } = await supabase.from("agenda_presencial_slots").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Excluído"); void load(); }
  };

  const handleToggle = async (s: Slot) => {
    const { error } = await supabase
      .from("agenda_presencial_slots")
      .update({ ativo: !s.ativo })
      .eq("id", s.id);
    if (error) toast.error(error.message);
    else void load();
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="border-b border-white/10 px-6 py-4 flex items-center gap-4 sticky top-0 bg-black/95 z-10">
        <AdminBackButton to={`/${slug}/admin`} />
        <h1 className="font-display text-xl uppercase tracking-wider">Agenda — Presencial</h1>
      </header>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        <section className="bg-black/60 border border-white/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarPlus className="h-5 w-5 text-primary" />
            <h2 className="font-display text-2xl uppercase tracking-wider text-primary">Novo horário presencial</h2>
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
              <Label>Nome do local *</Label>
              <Input value={localNome} onChange={(e) => setLocalNome(e.target.value)} placeholder="Ex: Alpha Studio Centro" required />
            </div>
            <div className="md:col-span-3">
              <Label>Endereço completo</Label>
              <Input value={localEndereco} onChange={(e) => setLocalEndereco(e.target.value)} placeholder="Rua, número, bairro, cidade" />
            </div>
            <div>
              <Label>Latitude (opcional)</Label>
              <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-23.5505" />
            </div>
            <div>
              <Label>Longitude (opcional)</Label>
              <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="-46.6333" />
            </div>
            <div className="md:col-span-3">
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar horário"}
              </Button>
            </div>
          </form>
        </section>

        <section>
          <h2 className="font-display text-2xl uppercase tracking-wider mb-4">Próximos horários</h2>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhum horário cadastrado. Crie acima para os alunos poderem reservar.</p>
          ) : (
            <div className="space-y-3">
              {slots.map((s) => {
                const rs = reservas.filter((r) => r.slot_id === s.id);
                return (
                  <div key={s.id} className={`bg-black/60 border rounded-xl p-4 ${s.ativo ? "border-white/20" : "border-white/5 opacity-50"}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-display text-lg">{formatDate(s.data)} · {s.hora_inicio.slice(0,5)}–{s.hora_fim.slice(0,5)}</p>
                        <p className="text-xs flex items-center gap-1 mt-1"><MapPin className="h-3 w-3 text-primary" /> {s.local_nome}</p>
                        {s.local_endereco && <p className="text-xs text-muted-foreground">{s.local_endereco}</p>}
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
                    {rs.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-1">
                        {rs.map((r) => (
                          <p key={r.id} className="text-xs text-muted-foreground">
                            <span className="text-white">{r.aluno?.nome_completo || "Aluno"}</span> · {r.aluno?.email || r.aluno_id.slice(0, 8)}
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
      </main>
    </div>
  );
};

export default AdminAgendaPresencial;
