import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Wallet,
  AlertCircle,
  LayoutDashboard,
  ArrowLeftRight,
  HandCoins,
  FileText,
  HelpCircle,
  Percent,
  Landmark,
  UserCheck,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Camera,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";

const COMMISSION_RATE = 0.10;

type Tenant = { id: string; slug: string; nome: string; owner_user_id: string | null };
type Aula = {
  id: string;
  nome: string;
  email: string;
  valor_centavos: number;
  status: string;
  created_at: string;
};
type Assinatura = {
  id: string;
  aluno_id: string;
  status: string;
  current_period_end: string | null;
  created_at: string;
  cancelada_em: string | null;
  plano: { nome: string; preco_centavos: number } | null;
  aluno: { nome_completo: string | null; email: string | null } | null;
};

const AdminFaturamento = () => {
  const { slug } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);

  const [isSaqueDialogOpen, setIsSaqueDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<
    null | "dashboard" | "transacoes" | "relatorios" | "ajuda" | "taxas" | "bancarios"
  >(null);
  const [activeReport, setActiveReport] = useState<null | "mensal" | "anual" | "ir" | "extrato">(null);
  const [studentsView, setStudentsView] = useState<null | "ativos" | "desistentes">(null);
  const [pixKey, setPixKey] = useState("");
  const [amount, setAmount] = useState("");
  const [identidadeStatus, setIdentidadeStatus] = useState<"pendente" | "em_analise" | "aprovado">("pendente");

  useEffect(() => {
    if (slug) loadAll(slug);
  }, [slug]);

  const loadAll = async (tenantSlug: string) => {
    setLoading(true);
    try {
      const { data: t, error: tErr } = await supabase
        .from("tenants")
        .select("id, slug, nome, owner_user_id")
        .eq("slug", tenantSlug)
        .maybeSingle();
      if (tErr) throw tErr;
      if (!t) {
        toast({ title: "Tenant não encontrado", variant: "destructive" });
        setLoading(false);
        return;
      }
      setTenant(t as Tenant);

      const [{ data: au }, { data: ass }] = await Promise.all([
        supabase
          .from("aulas_avulsas")
          .select("id, nome, email, valor_centavos, status, created_at")
          .eq("tenant_id", t.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("assinaturas")
          .select(
            "id, aluno_id, status, current_period_end, created_at, cancelada_em, plano:planos(nome, preco_centavos), aluno:perfis!assinaturas_aluno_id_fkey(nome_completo, email)"
          )
          .eq("tenant_id", t.id)
          .order("created_at", { ascending: false }),
      ]);

      setAulas((au || []) as Aula[]);
      // perfis FK can fail if not set up — fallback to a manual join below
      let assList = (ass || []) as any[];
      if (!assList.length) {
        const { data: ass2 } = await supabase
          .from("assinaturas")
          .select("id, aluno_id, status, current_period_end, created_at, cancelada_em, plano_id")
          .eq("tenant_id", t.id)
          .order("created_at", { ascending: false });
        if (ass2 && ass2.length) {
          const planoIds = [...new Set(ass2.map((a: any) => a.plano_id).filter(Boolean))];
          const alunoIds = [...new Set(ass2.map((a: any) => a.aluno_id).filter(Boolean))];
          const [{ data: planos }, { data: perfis }] = await Promise.all([
            supabase.from("planos").select("id, nome, preco_centavos").in("id", planoIds),
            supabase.from("perfis").select("id, nome_completo, email").in("id", alunoIds),
          ]);
          assList = ass2.map((a: any) => ({
            ...a,
            plano: planos?.find((p: any) => p.id === a.plano_id) || null,
            aluno: perfis?.find((p: any) => p.id === a.aluno_id) || null,
          }));
        }
      }
      setAssinaturas(assList as Assinatura[]);
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro carregando dados", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatBRL = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // --- Real metrics from this tenant ---
  const aulasPagas = aulas.filter((a) => a.status === "paid" || a.status === "pago");
  const assinaturasAtivas = assinaturas.filter((a) => a.status === "active" || a.status === "trialing");
  const desistentes = assinaturas.filter(
    (a) => a.status === "canceled" || a.status === "cancelada" || a.cancelada_em
  );

  const receitaAulas = aulasPagas.reduce((s, a) => s + (a.valor_centavos || 0), 0);
  const receitaAssinaturas = assinaturasAtivas.reduce(
    (s, a) => s + (a.plano?.preco_centavos || 0),
    0
  );
  const totalGross = receitaAulas + receitaAssinaturas;
  const totalCommission = Math.round(totalGross * COMMISSION_RATE);
  const totalNet = totalGross - totalCommission;
  const activeStudents = assinaturasAtivas.length;
  const ticketMedio =
    assinaturasAtivas.length > 0 ? Math.round(receitaAssinaturas / assinaturasAtivas.length) : 0;

  const transacoesReais = [
    ...aulasPagas.map((a) => ({
      id: `aula-${a.id}`,
      nome: a.nome,
      tipo: "Aula Avulsa",
      valor: a.valor_centavos,
      data: a.created_at,
    })),
    ...assinaturasAtivas.map((a) => ({
      id: `ass-${a.id}`,
      nome: a.aluno?.nome_completo || a.aluno?.email || "Aluno",
      tipo: `Assinatura · ${a.plano?.nome || "Plano"}`,
      valor: a.plano?.preco_centavos || 0,
      data: a.created_at,
    })),
  ].sort((x, y) => +new Date(y.data) - +new Date(x.data));

  const handleSaqueRequest = () => {
    if (identidadeStatus !== "aprovado") {
      setIsVerifyDialogOpen(true);
      return;
    }
    if (!pixKey || !amount) {
      toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" });
      return;
    }
    toast({ title: "Solicitação enviada", description: "Seu pedido de saque está em processamento." });
    setIsSaqueDialogOpen(false);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", badge: null as string | null, onClick: () => setActivePanel("dashboard") },
    { icon: ArrowLeftRight, label: "Transações", badge: null, onClick: () => setActivePanel("transacoes") },
    { icon: HandCoins, label: "Saques", badge: null, onClick: () => setIsSaqueDialogOpen(true) },
    { icon: FileText, label: "Relatórios", badge: null, onClick: () => setActivePanel("relatorios") },
    { icon: HelpCircle, label: "Central de ajuda", badge: null, onClick: () => setActivePanel("ajuda") },
    { icon: Percent, label: "Taxas e prazos", badge: null, onClick: () => setActivePanel("taxas") },
    {
      icon: Landmark,
      label: "Dados bancários",
      badge: "Pendente",
      badgeColor: "bg-primary/20 text-primary border-primary/30",
      onClick: () => setActivePanel("bancarios"),
    },
    {
      icon: UserCheck,
      label: "Identidade",
      badge:
        identidadeStatus === "aprovado"
          ? "Verificado"
          : identidadeStatus === "em_analise"
          ? "Em análise"
          : "Pendente",
      badgeColor:
        identidadeStatus === "aprovado"
          ? "bg-white/20 text-white border-white/30"
          : "bg-primary/20 text-primary border-primary/30",
      onClick: () => identidadeStatus === "pendente" && setIsVerifyDialogOpen(true),
    },
  ];

  return (
    <div className="relative min-h-screen bg-black text-white font-sans selection:bg-primary selection:text-white">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-black via-black/90 to-black" />
      <div className="relative z-10">
        <div className="relative w-full pb-8">
          <header className="relative z-10 px-5 pt-6 flex items-center justify-between max-w-4xl mx-auto w-full">
            <AdminBackButton className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/20 transition-all hover:scale-105 flex items-center justify-center" />
            <div className="text-primary font-bold text-2xl tracking-tight uppercase italic">
              {tenant?.nome || "FATURAMENTO"}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-glow border border-white/20" />
          </header>

          <main className="relative z-10 px-5 pt-8 max-w-4xl mx-auto w-full">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-bold italic">Saldo Disponível</p>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mt-1">
                {loading ? <Loader2 className="h-12 w-12 animate-spin text-primary" /> : formatBRL(totalNet)}
              </h1>
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/40 uppercase text-[10px] tracking-widest font-bold px-3 py-1 rounded-none border-l-4">
                  {tenant?.slug?.toUpperCase() || "TENANT"}
                </Badge>
                <p className="text-sm text-white/70 font-medium">
                  {formatBRL(totalCommission)} retidos (10%)
                </p>
              </div>
            </motion.div>

            <div className="flex gap-3 mt-8">
              <Button
                onClick={() => setIsSaqueDialogOpen(true)}
                className="font-bold px-8 py-6 h-auto flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
              >
                <HandCoins className="h-5 w-5" />
                Solicitar Saque
              </Button>
              <Button
                variant="outline"
                onClick={() => setActivePanel("transacoes")}
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold px-8 py-6 h-auto rounded-none flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
              >
                <ArrowLeftRight className="h-5 w-5" />
                Transações
              </Button>
            </div>
          </main>
        </div>

        <main className="px-5 pb-12 space-y-10 max-w-4xl mx-auto -mt-4 relative z-10">
          {identidadeStatus !== "aprovado" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-primary/20 border-l-4 border-primary p-6 flex gap-4 items-center"
            >
              <AlertCircle className="h-8 w-8 text-primary shrink-0" />
              <div className="space-y-1">
                <p className="font-bold text-base uppercase tracking-wider text-white">Verificação de Identidade</p>
                <p className="text-sm text-white/80 leading-relaxed font-medium">
                  Para o seu 1º saque, é necessário enviar uma foto da sua identidade.
                </p>
              </div>
            </motion.div>
          )}

          <section className="space-y-4">
            <h2 className="text-xl font-bold uppercase tracking-wide text-primary border-l-4 border-primary pl-3">
              Gestão e Serviços
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {menuItems.map((item, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ y: -5, backgroundColor: "rgba(255, 255, 255, 0.12)" }}
                  onClick={item.onClick}
                  className="flex flex-col items-start gap-4 p-5 bg-white/10 border border-white/10 hover:border-primary/50 transition-all group text-left relative overflow-hidden"
                >
                  <div className="w-12 h-12 rounded-none bg-black flex items-center justify-center border border-white/20 group-hover:border-primary transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1 z-10">
                    <p className="font-bold text-sm text-white uppercase tracking-tight">{item.label}</p>
                    {item.badge && (
                      <Badge
                        variant="outline"
                        className={`${(item as any).badgeColor || ""} text-[10px] uppercase tracking-widest px-2 h-5 border-none p-0 font-bold`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </section>

          <section className="space-y-4 pt-4">
            <h2 className="text-xl font-bold uppercase tracking-wide text-primary border-l-4 border-primary pl-3">
              Análise de Performance
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              <button
                onClick={() => setStudentsView("ativos")}
                className="min-w-[280px] text-left bg-white/10 border border-white/20 rounded-none p-6 relative group overflow-hidden hover:border-primary transition-colors"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingUp className="h-24 w-24 text-white" />
                </div>
                <p className="text-xs uppercase tracking-widest text-white/80 font-bold mb-4 italic">Alunos Ativos</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-white">{activeStudents}</span>
                </div>
                <p className="text-[11px] uppercase tracking-widest text-primary font-bold mt-4">Ver lista →</p>
              </button>

              <button
                onClick={() => setStudentsView("desistentes")}
                className="min-w-[280px] text-left bg-white/10 border border-white/20 rounded-none p-6 relative group overflow-hidden hover:border-primary transition-colors"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <TrendingDown className="h-24 w-24 text-primary" />
                </div>
                <p className="text-xs uppercase tracking-widest text-white/80 font-bold mb-4 italic">Desistentes</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-white">{desistentes.length}</span>
                </div>
                <p className="text-[11px] uppercase tracking-widest text-primary font-bold mt-4">Ver lista →</p>
              </button>

              <div className="min-w-[280px] bg-white/10 border border-white/20 rounded-none p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Wallet className="h-24 w-24 text-primary" />
                </div>
                <p className="text-xs uppercase tracking-widest text-white/80 font-bold mb-4 italic">Aulas Avulsas Pagas</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-6xl font-bold text-white">{aulasPagas.length}</span>
                </div>
                <p className="text-[11px] uppercase tracking-widest text-primary font-bold mt-4">
                  {formatBRL(receitaAulas)}
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* Identity dialog */}
        <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
          <DialogContent className="bg-black border-white/10 text-white sm:max-w-md rounded-none">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2 italic">
                <UserCheck className="h-6 w-6 text-primary" /> Validar Identidade
              </DialogTitle>
              <DialogDescription className="text-white/60 pt-2 text-xs uppercase tracking-wider">
                Necessário para liberar o primeiro saque.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="border-2 border-dashed border-white/10 p-8 flex flex-col items-center gap-4">
                <Camera className="h-8 w-8 text-white/30" />
                <p className="text-xs uppercase tracking-widest text-white/60 text-center">
                  Em breve: upload de RG/CNH para o seu tenant
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setIsVerifyDialogOpen(false)} className="w-full rounded-none uppercase tracking-widest font-bold py-6 h-auto">
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdraw Dialog */}
        <Dialog open={isSaqueDialogOpen} onOpenChange={setIsSaqueDialogOpen}>
          <DialogContent className="bg-black border-white/10 text-white sm:max-w-md rounded-none">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight flex items-center gap-2 text-primary italic">
                <HandCoins className="h-6 w-6" /> Solicitar Saque
              </DialogTitle>
              <DialogDescription className="text-white/60 pt-2 text-xs uppercase tracking-wider">
                Saldo disponível: {formatBRL(totalNet)}
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">Quanto deseja sacar?</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-white/20 text-xl">R$</span>
                  <Input
                    placeholder="0,00"
                    className="bg-white/5 border-white/10 pl-12 h-16 text-3xl font-bold rounded-none border-l-4 border-l-primary focus-visible:ring-primary"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">Sua Chave PIX</Label>
                <Input
                  placeholder="CPF, E-mail ou Celular"
                  className="bg-white/5 border-white/10 h-12 font-bold rounded-none focus-visible:ring-primary"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleSaqueRequest} className="bg-white text-black hover:bg-white/90 font-bold w-full py-6 h-auto rounded-none uppercase tracking-widest">
                Confirmar Solicitação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Panel Dialogs */}
        <Dialog open={!!activePanel} onOpenChange={(o) => !o && setActivePanel(null)}>
          <DialogContent className="bg-black border-white/10 text-white sm:max-w-2xl rounded-none max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight italic flex items-center gap-2">
                {activePanel === "dashboard" && (<><LayoutDashboard className="h-6 w-6 text-primary" /> Dashboard</>)}
                {activePanel === "transacoes" && (<><ArrowLeftRight className="h-6 w-6 text-primary" /> Transações</>)}
                {activePanel === "relatorios" && (<><FileText className="h-6 w-6 text-primary" /> Relatórios</>)}
                {activePanel === "ajuda" && (<><HelpCircle className="h-6 w-6 text-primary" /> Central de Ajuda</>)}
                {activePanel === "taxas" && (<><Percent className="h-6 w-6 text-primary" /> Taxas e Prazos</>)}
                {activePanel === "bancarios" && (<><Landmark className="h-6 w-6 text-primary" /> Dados Bancários</>)}
              </DialogTitle>
            </DialogHeader>

            {activePanel === "dashboard" && (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 border-l-4 border-primary p-4">
                    <p className="text-[9px] uppercase tracking-widest text-white/60 font-bold">Faturamento Bruto</p>
                    <p className="text-2xl font-bold mt-1">{formatBRL(totalGross)}</p>
                  </div>
                  <div className="bg-white/5 border-l-4 border-white/30 p-4">
                    <p className="text-[9px] uppercase tracking-widest text-white/60 font-bold">Comissão (10%)</p>
                    <p className="text-2xl font-bold mt-1 text-primary">-{formatBRL(totalCommission)}</p>
                  </div>
                  <div className="bg-white/5 border-l-4 border-primary p-4">
                    <p className="text-[9px] uppercase tracking-widest text-white/60 font-bold">Líquido</p>
                    <p className="text-2xl font-bold mt-1">{formatBRL(totalNet)}</p>
                  </div>
                </div>
                <div className="bg-white/5 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/60">Alunos ativos</span><span className="font-bold">{activeStudents}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Aulas avulsas pagas</span><span className="font-bold">{aulasPagas.length}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Receita assinaturas</span><span className="font-bold">{formatBRL(receitaAssinaturas)}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Receita aulas avulsas</span><span className="font-bold">{formatBRL(receitaAulas)}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Ticket médio</span><span className="font-bold">{formatBRL(ticketMedio)}</span></div>
                </div>
              </div>
            )}

            {activePanel === "transacoes" && (
              <div className="py-4 space-y-2">
                {transacoesReais.length === 0 && (
                  <div className="py-10 text-center text-white/60 text-sm">Nenhuma transação registrada ainda.</div>
                )}
                {transacoesReais.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-white/5 border-l-2 border-primary p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {t.nome[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{t.nome}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/60 truncate">
                        {t.tipo} · {new Date(t.data).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-500">+{formatBRL(t.valor - Math.round(t.valor * COMMISSION_RATE))}</p>
                      <p className="text-[9px] uppercase tracking-widest text-white/60">Líquido</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activePanel === "relatorios" && (
              <div className="py-4 space-y-3">
                {([
                  { key: "mensal", label: "Relatório Mensal" },
                  { key: "anual", label: "Relatório Anual" },
                  { key: "ir", label: "Imposto de Renda" },
                  { key: "extrato", label: "Extrato Detalhado" },
                ] as const).map((r) => (
                  <button
                    key={r.key}
                    onClick={() => setActiveReport(r.key)}
                    className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 p-4 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-bold text-sm uppercase tracking-tight">{r.label}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/60 group-hover:text-primary" />
                  </button>
                ))}
              </div>
            )}

            {activePanel === "ajuda" && (
              <div className="py-4 space-y-3">
                {[
                  { q: "Quando recebo meus saques?", a: "Saques solicitados são processados em até 2 dias úteis, após confirmação da identidade." },
                  { q: "Qual é a taxa da plataforma?", a: "10% sobre cada plano vendido. Não há taxa de saque." },
                  { q: "Período de teste gratuito", a: "Os primeiros 30 dias após o cadastro do aluno são livres de comissão." },
                  { q: "Como funciona o bloqueio?", a: "Caso a assinatura do aluno expire ou seja cancelada, o acesso é bloqueado automaticamente." },
                ].map((item) => (
                  <div key={item.q} className="bg-white/5 border-l-2 border-primary p-4">
                    <p className="font-bold text-sm uppercase tracking-tight mb-1">{item.q}</p>
                    <p className="text-xs text-white/60 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            )}

            {activePanel === "taxas" && (
              <div className="py-4 space-y-3">
                <div className="bg-white/5 p-5 border-l-4 border-primary">
                  <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Comissão da Plataforma</p>
                  <p className="text-4xl font-bold mt-2">10%</p>
                  <p className="text-xs text-white/60 mt-1">Sobre cada mensalidade após o trial de 30 dias.</p>
                </div>
              </div>
            )}

            {activePanel === "bancarios" && (
              <div className="py-4 space-y-4">
                <p className="text-xs text-white/60">
                  Em breve: cadastro de conta bancária por tenant. Por enquanto, repasses são processados via Stripe Connect.
                </p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Reports */}
        <Dialog open={!!activeReport} onOpenChange={(o) => !o && setActiveReport(null)}>
          <DialogContent className="bg-black border-white/10 text-white sm:max-w-2xl rounded-none max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight italic flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                {activeReport === "mensal" && "Relatório Mensal"}
                {activeReport === "anual" && "Relatório Anual"}
                {activeReport === "ir" && "Imposto de Renda"}
                {activeReport === "extrato" && "Extrato Detalhado"}
              </DialogTitle>
              <DialogDescription className="text-white/60 pt-2 text-xs uppercase tracking-wider">
                {tenant?.nome} · {new Date().toLocaleDateString("pt-BR")}
              </DialogDescription>
            </DialogHeader>

            {(activeReport === "mensal" || activeReport === "anual") && (
              <div className="py-4 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 border-l-4 border-primary p-4">
                    <p className="text-[9px] uppercase tracking-widest text-white/60 font-bold">Bruto</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatBRL(activeReport === "anual" ? totalGross * 12 : totalGross)}
                    </p>
                  </div>
                  <div className="bg-white/5 border-l-4 border-white/30 p-4">
                    <p className="text-[9px] uppercase tracking-widest text-white/60 font-bold">Comissão</p>
                    <p className="text-2xl font-bold mt-1 text-primary">
                      -{formatBRL(activeReport === "anual" ? totalCommission * 12 : totalCommission)}
                    </p>
                  </div>
                  <div className="bg-white/5 border-l-4 border-primary p-4">
                    <p className="text-[9px] uppercase tracking-widest text-white/60 font-bold">Líquido</p>
                    <p className="text-2xl font-bold mt-1">
                      {formatBRL(activeReport === "anual" ? totalNet * 12 : totalNet)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeReport === "ir" && (
              <div className="py-4 space-y-4">
                <div className="bg-white/5 border-l-4 border-primary p-5">
                  <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold">
                    Rendimentos Tributáveis ({new Date().getFullYear()})
                  </p>
                  <p className="text-4xl font-bold mt-2">{formatBRL(totalNet * 12)}</p>
                </div>
              </div>
            )}

            {activeReport === "extrato" && (
              <div className="py-4 space-y-2">
                {transacoesReais.length === 0 && (
                  <div className="py-10 text-center text-white/60 text-sm">Sem movimentações.</div>
                )}
                {transacoesReais.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-white/5 border-l-2 border-primary p-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      {t.nome[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{t.nome}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/60 truncate">
                        {t.tipo} · {new Date(t.data).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-500">+{formatBRL(t.valor)}</p>
                      <p className="text-[9px] uppercase tracking-widest text-primary">
                        -{formatBRL(Math.round(t.valor * COMMISSION_RATE))} taxa
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Students Dialog */}
        <Dialog open={!!studentsView} onOpenChange={(o) => !o && setStudentsView(null)}>
          <DialogContent className="bg-black border-white/10 text-white sm:max-w-2xl rounded-none max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold uppercase tracking-tight italic flex items-center gap-2">
                {studentsView === "ativos" ? (
                  <><TrendingUp className="h-6 w-6 text-primary" /> Alunos Ativos</>
                ) : (
                  <><TrendingDown className="h-6 w-6 text-primary" /> Desistentes</>
                )}
              </DialogTitle>
              <DialogDescription className="text-white/60 pt-2 text-xs uppercase tracking-wider">
                {studentsView === "ativos"
                  ? `${activeStudents} aluno(s) com assinatura ativa`
                  : `${desistentes.length} desistente(s)`}
              </DialogDescription>
            </DialogHeader>

            {studentsView === "ativos" && (
              <div className="py-4 space-y-2">
                {assinaturasAtivas.length === 0 && (
                  <div className="py-10 text-center text-white/60 text-sm">Sem alunos ativos no momento.</div>
                )}
                {assinaturasAtivas.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 bg-white/5 border-l-2 border-emerald-500 p-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-500">
                      {(a.aluno?.nome_completo || a.aluno?.email || "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{a.aluno?.nome_completo || a.aluno?.email || "Aluno"}</p>
                      <p className="text-[10px] uppercase tracking-widest text-white/60 truncate">
                        {a.plano?.nome || "—"}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 uppercase text-[9px] font-bold tracking-widest rounded-none">
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {studentsView === "desistentes" && (
              <div className="py-4 space-y-2">
                {desistentes.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
                      <XCircle className="h-8 w-8 text-white/30" />
                    </div>
                    <p className="font-bold uppercase tracking-widest text-sm text-white/60">Nenhum desistente</p>
                  </div>
                ) : (
                  desistentes.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 bg-white/5 border-l-2 border-primary p-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {(a.aluno?.nome_completo || a.aluno?.email || "?")[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{a.aluno?.nome_completo || a.aluno?.email}</p>
                        <p className="text-[10px] uppercase tracking-widest text-white/60">
                          Cancelada em {a.cancelada_em ? new Date(a.cancelada_em).toLocaleDateString("pt-BR") : "—"}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminFaturamento;
