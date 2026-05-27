import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, CalendarCheck, Clock, ChevronRight, Bell, Bot, MessageCircle, Settings, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useBranding } from "@/contexts/BrandingProvider";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  tipo_aula: string | null;
}

interface Reserva {
  id: string;
  slot_id: string;
  aluno_id: string;
  academia_confirmada: string | null;
  aluno?: {
    nome_completo: string | null;
    avatar_url: string | null;
  };
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
  const [allReservas, setAllReservas] = useState<Reserva[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [academiaConfirmada, setAcademiaConfirmada] = useState("");
  const selectorRef = useRef<HTMLDivElement>(null);

  const isCoach = useMemo(() => {
    return user?.id === tenant?.owner_user_id;
  }, [user?.id, tenant?.owner_user_id]);

  const loadData = async () => {
    if (!tenant?.id || !user?.id) return;
    
    const today = new Date().toISOString().split("T")[0];
    
    // Fetch slots
    const { data: slotsData } = await supabase
      .from("agenda_presencial_slots")
      .select("*")
      .eq("tenant_id", tenant.id)
      .eq("ativo", true)
      .gte("data", today)
      .order("data")
      .order("hora_inicio");

    const list = (slotsData || []) as Slot[];
    setSlots(list);
    if (list.length && !selectedDate) setSelectedDate(list[0].data);

    if (isCoach) {
      // Coach: Fetch all reservations for these slots
      const slotIds = list.map(s => s.id);
      if (slotIds.length > 0) {
        const { data: resData } = await supabase
          .from("agendamentos_presenciais")
          .select("id, slot_id, aluno_id, academia_confirmada")
          .in("slot_id", slotIds);

        if (resData) {
          const alunoIds = Array.from(new Set(resData.map(r => r.aluno_id)));
          const { data: perfis } = await supabase
            .from("perfis")
            .select("id, nome_completo, avatar_url")
            .in("id", alunoIds);

          const mappedReservas = resData.map(r => ({
            ...r,
            aluno: perfis?.find(p => p.id === r.aluno_id)
          }));
          setAllReservas(mappedReservas);
        }
      }
    } else {
      // Athlete: Fetch my reservations
      const { data: meus } = await supabase
        .from("agendamentos_presenciais")
        .select("id, slot_id")
        .eq("aluno_id", user.id);
      setMeusAgendamentos(meus || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    loadData();

    // Set up real-time subscription
    const channel = supabase
      .channel('agenda_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agendamentos_presenciais', filter: `tenant_id=eq.${tenant?.id}` },
        () => {
          loadData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'agenda_presencial_slots', filter: `tenant_id=eq.${tenant?.id}` },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, user?.id, isCoach]);

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

  useEffect(() => {
    const s = slots.find(x => x.id === selectedSlot);
    if (s && !academiaConfirmada) setAcademiaConfirmada(s.local_nome || "");
  }, [selectedSlot]);

  const confirmar = async () => {
    if (!selectedSlot || !user?.id || !tenant?.id) return false;
    if (!academiaConfirmada.trim()) {
      toast({ title: "Confirme em qual academia você vai treinar", variant: "destructive" });
      return false;
    }
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
      .insert({
        aluno_id: user.id,
        tenant_id: tenant.id,
        slot_id: selectedSlot,
        academia_confirmada: academiaConfirmada.trim(),
      })
      .select("id, slot_id")
      .single();
    setConfirming(false);
    if (error) {
      toast({ title: "Erro ao agendar", description: error.message, variant: "destructive" });
      return false;
    }
    toast({ title: "✅ Agendamento confirmado!", description: `${academiaConfirmada} • Lembrete 1h antes.` });
    setChatOpen(false);
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-white/50 text-xs tracking-widest animate-pulse">CARREGANDO AGENDA...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* HEADER / HERO */}
      <div className="relative w-full h-[45vh] min-h-[300px] overflow-hidden">
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
            <h1 className="font-display text-4xl sm:text-5xl leading-none mb-3">
              {isCoach ? "PAINEL DE AULAS" : "AGENDAMENTO"}<br />PRESENCIAL
            </h1>
            <p className="text-sm text-white/70 mb-5 max-w-md font-light">
              {isCoach 
                ? "Acompanhe seus horários agendados e gerencie sua disponibilidade." 
                : "Treine ao lado do seu Coach. Escolha o dia, o horário e prepare-se para uma sessão de alto nível."
              }
            </p>
            
            {isCoach ? (
              <Button
                asChild
                className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl tracking-widest shadow-[0_10px_30px_-5px_hsl(var(--primary)/0.5)] transition-all active:scale-95"
              >
                <Link to={`/${slug}/admin/agenda-presencial`}>
                  <Settings className="h-4 w-4" /> CONFIGURAR DISPONIBILIDADE
                </Link>
              </Button>
            ) : (
              <Button
                onClick={openSchedulingChat}
                className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl tracking-widest shadow-[0_10px_30px_-5px_hsl(var(--primary)/0.5)] transition-all active:scale-95"
              >
                <MessageCircle className="h-4 w-4" /> MARCAR AGORA
              </Button>
            )}
          </motion.div>
        </div>
      </div>

      <div className="px-5 pt-8 space-y-10">
        {/* CARROSSEL DE DIAS */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="font-display text-2xl uppercase tracking-wider">{isCoach ? "VISÃO POR DIA" : "ESCOLHA O DIA"}</h2>
            <span className="text-[10px] tracking-[0.3em] text-white/40">{dias.length} DIAS</span>
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
                    className={`relative shrink-0 w-[100px] h-[140px] rounded-md overflow-hidden flex flex-col items-center justify-center transition-all duration-300
                      ${ativo
                        ? "border-[3px] border-primary shadow-[0_0_30px_-2px_hsl(var(--primary)/0.7)] bg-gradient-to-b from-primary/30 to-black"
                        : "border border-white/10 bg-white/5 hover:bg-white/10"
                      }`}
                  >
                    <span className={`text-[10px] tracking-[0.3em] mb-1 ${ativo ? "text-primary" : "text-white/50"}`}>
                      {d.weekday}
                    </span>
                    <span className="font-display text-4xl leading-none">{d.day}</span>
                    <span className={`text-[10px] tracking-[0.3em] mt-1 ${ativo ? "text-white" : "text-white/50"}`}>
                      {d.month}
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* LISTAGEM DE SLOTS E RESERVAS */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-2xl uppercase tracking-wider">
              {isCoach ? "LISTA DE AGENDAMENTOS" : "HORÁRIOS DISPONÍVEIS"}
            </h2>
            <Clock className="h-4 w-4 text-primary" />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={selectedDate}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {horariosDoDia.length === 0 ? (
                <div className="text-center py-10 text-white/30 text-xs tracking-[0.2em]">NENHUM HORÁRIO PARA ESTE DIA</div>
              ) : (
                horariosDoDia.map(h => {
                  const reservasParaEsteSlot = allReservas.filter(r => r.slot_id === h.id);
                  const meu = meusAgendamentos.some(m => m.slot_id === h.id);
                  const cheio = h.reservados >= h.capacidade;

                  if (isCoach) {
                    return (
                      <div key={h.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="bg-white/10 px-4 py-3 flex items-center justify-between border-b border-white/10">
                          <div className="flex items-center gap-3">
                            <Clock className="h-4 w-4 text-primary" />
                            <span className="font-display text-xl">{fmtHora(h.hora_inicio)} – {fmtHora(h.hora_fim)}</span>
                            {h.tipo_aula && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold border border-primary/30 uppercase tracking-tighter">
                                {h.tipo_aula}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-white/40 tracking-widest uppercase">
                            {h.reservados} / {h.capacidade} VAGAS
                          </span>
                        </div>
                        
                        <div className="p-4 space-y-3">
                          {reservasParaEsteSlot.length === 0 ? (
                            <p className="text-xs text-white/30 italic">Nenhum aluno agendado ainda.</p>
                          ) : (
                            reservasParaEsteSlot.map(r => (
                              <div key={r.id} className="flex items-center gap-3 bg-white/5 p-3 rounded-lg border border-white/5">
                                <Avatar className="h-10 w-10 border-2 border-primary/30">
                                  <AvatarImage src={r.aluno?.avatar_url || ""} />
                                  <AvatarFallback className="bg-primary/20 text-primary">
                                    <User className="h-5 w-5" />
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate">{r.aluno?.nome_completo || "Aluno"}</p>
                                  {r.academia_confirmada && (
                                    <p className="text-[10px] text-white/50 flex items-center gap-1">
                                      <MapPin className="h-3 w-3" /> {r.academia_confirmada}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-bold">
                                    Confirmado
                                  </span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Student View
                  return (
                    <motion.button
                      key={h.id}
                      onClick={() => !cheio && setSelectedSlot(h.id)}
                      disabled={cheio && !meu}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all
                        ${meu 
                          ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]" 
                          : h.id === selectedSlot
                            ? "bg-primary/20 border-primary shadow-[0_0_20px_-5px_hsl(var(--primary)/0.5)]"
                            : cheio
                              ? "opacity-40 bg-white/5 border-white/10 cursor-not-allowed"
                              : "bg-white/5 border-white/10 hover:border-primary/50"
                        }`}
                    >
                      <div className="flex items-center gap-4 text-left">
                        <div className={`p-3 rounded-lg ${meu ? "bg-emerald-500/20" : "bg-white/10"}`}>
                          <Clock className={`h-5 w-5 ${meu ? "text-emerald-400" : "text-primary"}`} />
                        </div>
                        <div>
                          <div className="font-display text-2xl tracking-tight">
                            {fmtHora(h.hora_inicio)}
                          </div>
                          <div className="text-[10px] text-white/50 uppercase tracking-widest mt-0.5 flex items-center gap-2">
                            {h.tipo_aula || "Sessão Presencial"}
                            {cheio && !meu && <span className="text-red-400 font-bold ml-1">• ESGOTADO</span>}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {meu ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase">VOCÊ VAI!</span>
                            <CalendarCheck className="h-5 w-5 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-white/30 tracking-widest uppercase">
                              {h.capacidade - h.reservados} VAGAS LIVRES
                            </span>
                            {h.id === selectedSlot ? (
                              <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                <ChevronRight className="h-4 w-4 text-white" />
                              </div>
                            ) : (
                              <div className="h-2 w-2 rounded-full bg-white/20" />
                            )}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })
              )}
            </motion.div>
          </AnimatePresence>
        </section>

        {/* DETALHES DO LOCAL SELECIONADO (PARA O ALUNO) */}
        {!isCoach && slotInfo && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="font-display text-2xl px-1">DETALHES DA SESSÃO</h2>
            <div className="relative rounded-xl overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/10 to-black p-5 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.4)]">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.3em] text-primary mb-1 uppercase font-bold">Local confirmando pelo coach</div>
                  <div className="font-display text-2xl leading-tight">{slotInfo.local_nome}</div>
                  {slotInfo.local_endereco && (
                    <div className="text-sm text-white/70 mt-2 font-light">{slotInfo.local_endereco}</div>
                  )}
                </div>
              </div>
              
              <div className="mt-6 flex flex-col gap-2">
                <Button 
                  onClick={openSchedulingChat}
                  disabled={jaAgendado || (slotInfo.reservados >= slotInfo.capacidade)}
                  className="w-full h-12 font-bold tracking-widest uppercase rounded-xl"
                >
                  {jaAgendado ? "VOCÊ JÁ ESTÁ AGENDADO" : "CONFIRMAR MEU LUGAR"}
                </Button>
                
                {slotInfo.local_endereco && (
                  <Button variant="outline" asChild className="w-full bg-white/5 border-white/10 h-10 text-xs tracking-widest uppercase rounded-xl">
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(slotInfo.local_endereco)}`} target="_blank" rel="noopener">
                      <Navigation className="h-3 w-3 mr-2 text-primary" /> VER NO MAPA
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </div>

      {/* DIALOG DE AGENDAMENTO (CHAT STYLE) */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-md border-primary/30 bg-black text-white rounded-2xl p-0 overflow-hidden shadow-[0_0_60px_-10px_hsl(var(--primary)/0.8)]">
          <DialogHeader className="px-5 pt-5 pb-3 text-left border-b border-white/10 bg-gradient-to-r from-primary/25 to-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(var(--primary-rgb),0.6)]">
                <Bot className="h-5 w-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-sm font-display tracking-widest uppercase">Alpha Assistant</DialogTitle>
                <DialogDescription className="text-[10px] text-white/50 uppercase tracking-tighter">Confirmando sua vaga presencial</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-white/10 p-4 rounded-2xl rounded-tl-none text-sm max-w-[85%]">
                <p>Excelente escolha! Vou confirmar seu agendamento para <strong>{selectedDate && new Date(selectedDate + "T12:00:00").toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</strong> às <strong>{slotInfo && fmtHora(slotInfo.hora_inicio)}</strong>.</p>
                <p className="mt-2">Onde você vai treinar hoje?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold px-1">Seu local de treino</label>
                <input
                  type="text"
                  value={academiaConfirmada}
                  onChange={(e) => setAcademiaConfirmada(e.target.value)}
                  placeholder="Ex: Nome da sua academia..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-0">
            <Button
              onClick={confirmar}
              disabled={confirming || !academiaConfirmada.trim()}
              className="w-full h-12 font-bold tracking-widest uppercase rounded-xl shadow-[0_10px_20px_-5px_hsl(var(--primary)/0.4)]"
            >
              {confirming ? "CONFIRMANDO..." : "CONCLUIR AGENDAMENTO"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Scheduling;