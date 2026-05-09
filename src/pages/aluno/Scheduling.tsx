import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, CalendarCheck, Clock, ChevronRight, Bell, Bot, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import heroCoach from "@/assets/coach-presencial-hero.jpg";

interface Slot {
  id: string;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  local_nome: string;
  local_endereco: string | null;
  local_lat: number | null;
  local_lng: number | null;
  capacidade: number;
  reservados: number;
}

const WEEKDAYS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];
const MONTHS = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];

const fmtHora = (h: string) => h.slice(0, 5);

const Scheduling = () => {
  const { slug } = useParams();
  const { user } = useAuth();
  const { tenant } = useBranding();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [meusAgendamentos, setMeusAgendamentos] = useState<{ slot_id: string; id: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenant?.id || !user?.id) return;
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const [{ data: slotsData }, { data: meus }] = await Promise.all([
        supabase
          .from("agenda_presencial_slots")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("ativo", true)
          .gte("data", today)
          .order("data")
          .order("hora_inicio"),
        supabase
          .from("agendamentos_presenciais")
          .select("id, slot_id")
          .eq("aluno_id", user.id),
      ]);
      const list = (slotsData || []) as Slot[];
      setSlots(list);
      setMeusAgendamentos(meus || []);
      if (list.length && !selectedDate) setSelectedDate(list[0].data);
      setLoading(false);
    })();
  }, [tenant?.id, user?.id]);

  // Lembrete: notifica quando faltar 1h ou menos para um agendamento
  useEffect(() => {
    if (!meusAgendamentos.length || !slots.length) return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission === "default") Notification.requestPermission();

    const check = () => {
      const now = Date.now();
      meusAgendamentos.forEach(({ slot_id }) => {
        const s = slots.find(x => x.id === slot_id);
        if (!s) return;
        const inicio = new Date(`${s.data}T${s.hora_inicio}`).getTime();
        const diff = inicio - now;
        const key = `notified_${slot_id}`;
        if (diff > 0 && diff <= 60 * 60 * 1000 && !sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          if (Notification.permission === "granted") {
            new Notification("⏰ Aula presencial em breve", {
              body: `${fmtHora(s.hora_inicio)} • ${s.local_nome}`,
              icon: "/favicon.ico",
            });
          }
          toast({
            title: "⏰ Sua aula presencial é em menos de 1h",
            description: `${fmtHora(s.hora_inicio)} • ${s.local_nome}`,
          });
        }
      });
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, [meusAgendamentos, slots]);

  const dias = useMemo(() => {
    const map = new Map<string, Slot[]>();
    slots.forEach(s => {
      const arr = map.get(s.data) || [];
      arr.push(s);
      map.set(s.data, arr);
    });
    return Array.from(map.entries()).map(([data, list]) => {
      const d = new Date(data + "T12:00:00");
      return {
        data,
        weekday: WEEKDAYS[d.getDay()],
        day: d.getDate(),
        month: MONTHS[d.getMonth()],
        slots: list,
      };
    });
  }, [slots]);

  const horariosDoDia = useMemo(
    () => dias.find(d => d.data === selectedDate)?.slots || [],
    [dias, selectedDate],
  );

  const slotInfo = slots.find(s => s.id === selectedSlot);
  const jaAgendado = selectedSlot && meusAgendamentos.some(m => m.slot_id === selectedSlot);

  const openSchedulingChat = () => {
    if (!selectedDate && dias[0]) setSelectedDate(dias[0].data);
    setChatOpen(true);
  };

  const confirmar = async () => {
    if (!selectedSlot || !user?.id || !tenant?.id) return false;
    if (jaAgendado) {
      toast({ title: "Você já está agendado neste horário" });
      return false;
    }
    const slot = slots.find(s => s.id === selectedSlot);
    if (slot && slot.reservados >= slot.capacidade) {
      toast({ title: "Horário esgotado", variant: "destructive" });
      return false;
    }
    setConfirming(true);
    const { data, error } = await supabase
      .from("agendamentos_presenciais")
      .insert({ aluno_id: user.id, tenant_id: tenant.id, slot_id: selectedSlot })
      .select("id, slot_id")
      .single();
    setConfirming(false);
    if (error) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
      return false;
    }
    setMeusAgendamentos(prev => [...prev, data!]);
    setSlots(prev => prev.map(s => s.id === selectedSlot ? { ...s, reservados: s.reservados + 1 } : s));
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }
    toast({ title: "✅ Agendamento confirmado!", description: "Você receberá um lembrete 1h antes." });
    return true;
  };

  const mapsUrl = slotInfo?.local_lat && slotInfo?.local_lng
    ? `https://www.google.com/maps/search/?api=1&query=${slotInfo.local_lat},${slotInfo.local_lng}`
    : slotInfo?.local_endereco
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(slotInfo.local_endereco)}`
      : null;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* HERO */}
      <div className="relative w-full h-[55vh] min-h-[380px] overflow-hidden">
        <img src={heroCoach} alt="Coach" className="absolute inset-0 w-full h-full object-cover object-top" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-transparent to-transparent" />

        <div className="relative z-10 flex flex-col justify-end h-full px-6 pb-8 max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-block text-[10px] font-bold tracking-[0.4em] text-primary mb-3">
              EXCLUSIVO • {tenant?.nome?.toUpperCase() || "ALPHA COACH"}
            </span>
            <h1 className="font-display text-5xl sm:text-6xl leading-none mb-3">
              AGENDAMENTO<br />PRESENCIAL
            </h1>
            <p className="text-sm text-white/70 mb-5 max-w-md font-light">
              Treine ao lado do seu Coach. Escolha o dia, o horário e prepare-se para uma sessão de alto nível.
            </p>
            <Button onClick={openSchedulingChat} variant="default" size="lg" className="rounded-full px-8">
              <MessageCircle className="mr-1" /> MARCAR AGORA
            </Button>
          </motion.div>
        </div>
      </div>

      <div ref={selectorRef} className="scroll-mt-4" />

      {loading ? (
        <div className="p-10 text-center text-white/50 text-xs tracking-widest">CARREGANDO AGENDA...</div>
      ) : dias.length === 0 ? (
        <div className="p-10 text-center text-white/50 text-xs tracking-widest">
          NENHUMA SESSÃO DISPONÍVEL NO MOMENTO
        </div>
      ) : (
        <div className="px-5 pt-10 pb-40 space-y-10">
          {/* CARROSSEL DE DIAS */}
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="font-display text-2xl">ESCOLHA O DIA</h2>
              <span className="text-[10px] tracking-[0.3em] text-white/40">{dias.length} DISPONÍVEIS</span>
            </div>
            <div className="overflow-x-auto -mx-5 px-5 scrollbar-none">
              <motion.div className="flex gap-3 pb-3" layout>
                {dias.map(d => {
                  const ativo = d.data === selectedDate;
                  return (
                    <motion.button
                      key={d.data}
                      onClick={() => { setSelectedDate(d.data); setSelectedSlot(null); }}
                      whileTap={{ scale: 0.94 }}
                      animate={{ scale: ativo ? 1.05 : 1 }}
                      className={`relative shrink-0 w-[110px] h-[160px] rounded-md overflow-hidden flex flex-col items-center justify-center transition-all duration-300
                        ${ativo
                          ? "border-[3px] border-primary shadow-[0_0_30px_-2px_hsl(var(--primary)/0.7)] bg-gradient-to-b from-primary/30 to-black"
                          : "border border-white/10 bg-white/5 hover:bg-white/10"
                        }`}
                    >
                      <span className={`text-[10px] tracking-[0.3em] mb-1 ${ativo ? "text-primary" : "text-white/50"}`}>
                        {d.weekday}
                      </span>
                      <span className="font-display text-5xl leading-none">{d.day}</span>
                      <span className={`text-[10px] tracking-[0.3em] mt-1 ${ativo ? "text-white" : "text-white/50"}`}>
                        {d.month}
                      </span>
                      <span className="text-[8px] tracking-widest mt-2 text-white/40">
                        {d.slots.length} HORÁRIO{d.slots.length > 1 ? "S" : ""}
                      </span>
                    </motion.button>
                  );
                })}
              </motion.div>
            </div>
          </section>

          {/* CARROSSEL DE HORÁRIOS */}
          <section>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="font-display text-2xl">ESCOLHA O HORÁRIO</h2>
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDate}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="overflow-x-auto -mx-5 px-5 scrollbar-none"
              >
                <div className="flex gap-3 pb-3">
                  {horariosDoDia.map(h => {
                    const ativo = h.id === selectedSlot;
                    const cheio = h.reservados >= h.capacidade;
                    const meu = meusAgendamentos.some(m => m.slot_id === h.id);
                    return (
                      <motion.button
                        key={h.id}
                        onClick={() => !cheio && setSelectedSlot(h.id)}
                        whileTap={{ scale: 0.94 }}
                        disabled={cheio && !meu}
                        animate={{ scale: ativo ? 1.05 : 1 }}
                        className={`shrink-0 px-6 py-4 rounded-md font-display text-2xl tracking-wider transition-all
                          ${ativo
                            ? "bg-primary text-white shadow-[0_0_25px_-2px_hsl(var(--primary)/0.8)] border-[2px] border-white"
                            : meu
                              ? "bg-emerald-600/30 border border-emerald-500/50 text-emerald-200"
                              : cheio
                                ? "bg-white/5 border border-white/10 text-white/30 line-through cursor-not-allowed"
                                : "bg-white/5 border border-white/15 hover:bg-white/10 hover:border-primary/50"
                          }`}
                      >
                        {fmtHora(h.hora_inicio)}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>

          {/* LOCAL */}
          <AnimatePresence>
            {slotInfo && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-4"
              >
                <h2 className="font-display text-2xl px-1">LOCAL DA SESSÃO</h2>
                <div className="relative rounded-lg overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/10 to-black p-5 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)]">
                  <div className="absolute top-0 right-0 h-full w-1 bg-primary" />
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center shrink-0">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] tracking-[0.3em] text-primary mb-1">CENTRO DE TREINAMENTO</div>
                      <div className="font-display text-2xl leading-tight">{slotInfo.local_nome}</div>
                      {slotInfo.local_endereco && (
                        <div className="text-sm text-white/70 mt-2 font-light">{slotInfo.local_endereco}</div>
                      )}
                      <div className="flex items-center gap-2 mt-3 text-xs text-white/60">
                        <Clock className="h-3 w-3" />
                        {fmtHora(slotInfo.hora_inicio)} – {fmtHora(slotInfo.hora_fim)}
                      </div>
                    </div>
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener"
                      className="mt-4 flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-md px-4 py-3 transition"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <Navigation className="h-4 w-4 text-primary" />
                        Abrir rota no Google Maps
                      </span>
                      <ChevronRight className="h-4 w-4 text-white/50" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-white/50 px-1">
                  <Bell className="h-3 w-3 text-primary" />
                  Você receberá um lembrete 1h antes da sessão.
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* MEUS AGENDAMENTOS */}
          {meusAgendamentos.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-2xl px-1">MEUS AGENDAMENTOS</h2>
              <div className="space-y-2">
                {meusAgendamentos.map(m => {
                  const s = slots.find(x => x.id === m.slot_id);
                  if (!s) return null;
                  const d = new Date(s.data + "T12:00:00");
                  return (
                    <div key={m.id} className="flex items-center justify-between bg-white/5 border-l-4 border-primary rounded-md px-4 py-3">
                      <div>
                        <div className="font-display text-lg">
                          {WEEKDAYS[d.getDay()]} {d.getDate()} {MONTHS[d.getMonth()]} • {fmtHora(s.hora_inicio)}
                        </div>
                        <div className="text-xs text-white/60">{s.local_nome}</div>
                      </div>
                      <CalendarCheck className="h-5 w-5 text-emerald-400" />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md border-primary/30 bg-black text-white rounded-2xl p-0 overflow-hidden shadow-[0_0_60px_-10px_hsl(var(--primary)/0.8)]">
          <DialogHeader className="px-5 pt-5 pb-3 text-left border-b border-white/10 bg-gradient-to-r from-primary/25 to-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="font-display text-2xl tracking-wider text-white">DR. AGENDA</DialogTitle>
                <DialogDescription className="text-xs text-white/60">
                  Escolha seu horário presencial com o Coach.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-5 py-4 space-y-5">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-2xl rounded-tl-sm bg-white/10 border border-white/10 px-4 py-3 text-sm text-white/80">
                {loading
                  ? "Estou buscando os horários disponíveis..."
                  : dias.length === 0
                    ? "Ainda não existe nenhum horário liberado pelo Coach. Assim que ele cadastrar, você agenda por aqui."
                    : "Primeiro escolha o dia. Depois eu libero os horários disponíveis."}
              </div>
            </div>

            {!loading && dias.length > 0 && (
              <>
                <div className="space-y-2">
                  <div className="text-[10px] font-bold tracking-[0.3em] text-white/40">DIAS</div>
                  <div className="grid grid-cols-3 gap-2">
                    {dias.map(d => {
                      const ativo = d.data === selectedDate;
                      return (
                        <button
                          key={d.data}
                          onClick={() => { setSelectedDate(d.data); setSelectedSlot(null); }}
                          className={`rounded-2xl border px-3 py-3 text-center transition ${ativo ? "border-primary bg-primary text-white" : "border-white/10 bg-white/5 text-white/70 hover:border-primary/60"}`}
                        >
                          <div className="text-[10px] tracking-widest">{d.weekday}</div>
                          <div className="font-display text-3xl leading-none">{d.day}</div>
                          <div className="text-[10px] tracking-widest">{d.month}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-white/10 border border-white/10 px-4 py-3 text-sm text-white/80">
                    Agora selecione o horário da sua sessão presencial.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-bold tracking-[0.3em] text-white/40">HORÁRIOS</div>
                  <div className="grid grid-cols-2 gap-2">
                    {horariosDoDia.map(h => {
                      const ativo = h.id === selectedSlot;
                      const cheio = h.reservados >= h.capacidade;
                      const meu = meusAgendamentos.some(m => m.slot_id === h.id);
                      return (
                        <button
                          key={h.id}
                          disabled={cheio && !meu}
                          onClick={() => !cheio && setSelectedSlot(h.id)}
                          className={`rounded-full border px-4 py-3 font-display text-xl tracking-wider transition ${ativo ? "border-white bg-primary text-white" : meu ? "border-emerald-500/60 bg-emerald-600/25 text-emerald-200" : cheio ? "border-white/10 bg-white/5 text-white/30 line-through" : "border-white/10 bg-white/5 text-white hover:border-primary/60"}`}
                        >
                          {fmtHora(h.hora_inicio)}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {slotInfo && (
                  <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.25em] text-primary">
                      <MapPin className="h-3 w-3" /> LOCAL
                    </div>
                    <div className="font-display text-2xl">{slotInfo.local_nome}</div>
                    {slotInfo.local_endereco && <div className="text-xs text-white/60">{slotInfo.local_endereco}</div>}
                    <div className="text-xs text-white/60">{fmtHora(slotInfo.hora_inicio)} – {fmtHora(slotInfo.hora_fim)}</div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-4 border-t border-white/10 bg-black">
            <button
              onClick={async () => {
                const ok = await confirmar();
                if (ok) setChatOpen(false);
              }}
              disabled={!selectedSlot || !!jaAgendado || confirming}
              className="w-full rounded-full bg-primary py-4 font-display text-2xl tracking-[0.18em] text-white shadow-[0_0_35px_-6px_hsl(var(--primary)/0.8)] disabled:opacity-40 disabled:shadow-none"
            >
              {jaAgendado ? "JÁ AGENDADO" : confirming ? "CONFIRMANDO..." : "CONFIRMAR"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FOOTER FIXO DE CONFIRMAÇÃO */}
      <AnimatePresence>
        {selectedSlot && !jaAgendado && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-20 left-0 right-0 z-30 px-4"
          >
            <button
              onClick={confirmar}
              disabled={confirming}
              className="w-full max-w-2xl mx-auto block bg-primary text-white font-display text-2xl tracking-[0.2em] py-5 rounded-full shadow-[0_0_50px_-5px_hsl(var(--primary)/0.8)] animate-pulse disabled:opacity-60"
            >
              {confirming ? "CONFIRMANDO..." : "CONFIRMAR AGENDAMENTO"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Scheduling;
