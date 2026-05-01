import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, 
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
  Upload,
  CheckCircle2,
  XCircle,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import { DEMO_ATHLETES } from "@/lib/demoAthletes";

const AdminFaturamento = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isSaqueDialogOpen, setIsSaqueDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<null | "dashboard" | "transacoes" | "relatorios" | "ajuda" | "taxas" | "bancarios">(null);
  const [activeReport, setActiveReport] = useState<null | "mensal" | "anual" | "ir" | "extrato">(null);
  const [studentsView, setStudentsView] = useState<null | "ativos" | "desistentes">(null);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [amount, setAmount] = useState("");

  // Fictional financial data based on demo athletes (for preview/demo only)
  const PLAN_VALUE = 19700; // R$ 197,00 em centavos
  const COMMISSION_RATE = 0.10;
  const activeStudents = DEMO_ATHLETES.length; // 4 demo
  const totalGross = activeStudents * PLAN_VALUE;
  const totalCommission = totalGross * COMMISSION_RATE;
  const totalNet = totalGross - totalCommission;
  const formatBRL = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profissionais")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      setProfile(data);
    }
  };

  const handleUploadIdentity = async () => {
    if (!file) {
      toast({
        title: "Erro",
        description: "Selecione uma foto da sua identidade.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("identidades")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("profissionais")
        .update({
          foto_identidade_url: filePath,
          status_identidade: "em_analise"
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Sucesso!",
        description: "Sua identidade foi enviada para análise.",
      });
      
      setIsVerifyDialogOpen(false);
      fetchProfile();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaqueRequest = async () => {
    if (profile?.status_identidade !== "aprovado") {
      setIsVerifyDialogOpen(true);
      return;
    }

    if (!pixKey || !amount) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos para o saque.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Solicitação enviada",
      description: "Seu pedido de saque está em processamento.",
    });
    setIsSaqueDialogOpen(false);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", badge: null, onClick: () => setActivePanel("dashboard") },
    { icon: ArrowLeftRight, label: "Transações", badge: null, onClick: () => setActivePanel("transacoes") },
    { 
      icon: HandCoins, 
      label: "Saques", 
      badge: null, 
      onClick: () => setIsSaqueDialogOpen(true) 
    },
    { icon: FileText, label: "Relatórios", badge: null, onClick: () => setActivePanel("relatorios") },
    { icon: HelpCircle, label: "Central de ajuda", badge: null, onClick: () => setActivePanel("ajuda") },
    { icon: Percent, label: "Taxas e prazos", badge: null, onClick: () => setActivePanel("taxas") },
    { 
      icon: Landmark, 
      label: "Dados bancários", 
      badge: "Pendente", 
      badgeColor: "bg-red-600/20 text-red-500 border-red-600/30",
      onClick: () => setActivePanel("bancarios")
    },
    { 
      icon: UserCheck, 
      label: "Identidade", 
      badge: profile?.status_identidade === "aprovado" ? "Verificado" : profile?.status_identidade === "em_analise" ? "Em análise" : "Pendente",
      badgeColor: profile?.status_identidade === "aprovado" ? "bg-white/20 text-white border-white/30" : "bg-red-600/20 text-red-500 border-red-600/30",
      onClick: () => (profile?.status_identidade === "pendente" || !profile?.status_identidade) && setIsVerifyDialogOpen(true)
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white">
      {/* Netflix-style Header Banner */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-black/60 to-black z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent opacity-50" />
        
        <header className="relative z-10 px-5 pt-6 flex items-center justify-between max-w-4xl mx-auto w-full">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-red-600 font-black text-2xl tracking-tighter uppercase italic">ALPHA <span className="text-white">FINANCE</span></div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 border border-white/20" />
        </header>

        <main className="relative z-10 px-5 pt-12 max-w-4xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-bold italic">Saldo Disponível</p>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white">
              {formatBRL(totalNet)}
            </h1>
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="bg-red-600/20 text-red-600 border-red-600/40 uppercase text-[10px] tracking-widest font-bold px-3 py-1 rounded-none border-l-4">
                PLATAFORMA ATIVA
              </Badge>
              <p className="text-xs text-white/40">{formatBRL(totalCommission)} retidos (10%)</p>
            </div>
          </motion.div>
          
          <div className="flex gap-3 mt-8">
            <Button 
              onClick={() => setIsSaqueDialogOpen(true)}
              className="bg-red-600 text-white hover:bg-red-700 font-bold px-8 py-6 h-auto rounded-none flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
              <HandCoins className="h-5 w-5" />
              Solicitar Saque
            </Button>
            <Button 
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold px-8 py-6 h-auto rounded-none flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
              <ArrowLeftRight className="h-5 w-5" />
              Transações
            </Button>
          </div>
        </main>
      </div>

      <main className="px-5 pb-12 space-y-10 max-w-4xl mx-auto -mt-4 relative z-10">
        {profile?.status_identidade !== "aprovado" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-600/10 border-l-4 border-red-600 p-5 flex gap-4 items-center"
          >
            <AlertCircle className="h-8 w-8 text-red-600 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-sm uppercase tracking-wider text-white">Verificação de Identidade</p>
              <p className="text-xs text-white/60 leading-relaxed">
                {profile?.status_identidade === "em_analise" 
                  ? "Seus documentos estão em análise. Aguarde até 24h."
                  : "Para o seu 1º saque, é necessário enviar uma foto da sua identidade."}
              </p>
            </div>
          </motion.div>
        )}

        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-white/90 border-l-4 border-red-600 pl-3">Gestão e Serviços</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {menuItems.map((item, idx) => (
              <motion.button
                key={idx}
                whileHover={{ y: -5, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                onClick={item.onClick}
                className="flex flex-col items-start gap-4 p-5 bg-white/5 border border-white/5 hover:border-red-600/30 transition-all group text-left relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-none bg-black flex items-center justify-center border border-white/10 group-hover:border-red-600/50 transition-colors">
                  <item.icon className="h-6 w-6 text-red-600" />
                </div>
                <div className="space-y-1 z-10">
                  <p className="font-bold text-sm text-white/90 uppercase tracking-tight">{item.label}</p>
                  {item.badge && (
                    <Badge variant="outline" className={`${item.badgeColor} text-[8px] uppercase tracking-widest px-1.5 h-4 border-none p-0 font-black`}>
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-white/90 border-l-4 border-red-600 pl-3">Análise de Performance</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            <button onClick={() => setStudentsView("ativos")} className="min-w-[280px] text-left bg-white/5 border border-white/10 rounded-none p-6 relative group overflow-hidden hover:border-red-600/50 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="h-24 w-24 text-white" />
              </div>
              <p className="text-xs uppercase tracking-widest text-white/60 font-bold mb-4 italic">Alunos Ativos</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white">{activeStudents}</span>
                <span className="text-white/40 text-sm font-bold flex items-center"><TrendingUp className="h-3 w-3 mr-1" />Demo</span>
              </div>
              <div className="mt-6 h-1 w-full bg-white/10 rounded-none overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "80%" }}
                  className="h-full bg-red-600" 
                />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-red-600 font-black mt-3">Ver lista →</p>
            </button>

            <button onClick={() => setStudentsView("desistentes")} className="min-w-[280px] text-left bg-white/5 border border-white/10 rounded-none p-6 relative group overflow-hidden hover:border-red-600/50 transition-colors">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingDown className="h-24 w-24 text-red-600" />
              </div>
              <p className="text-xs uppercase tracking-widest text-white/60 font-bold mb-4 italic">Desistentes</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white">0</span>
                <span className="text-red-600 text-sm font-bold flex items-center"><TrendingDown className="h-3 w-3 mr-1" />-0%</span>
              </div>
              <div className="mt-6 h-1 w-full bg-white/10 rounded-none overflow-hidden">
                <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: "10%" }}
                   className="h-full bg-red-600" 
                />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-red-600 font-black mt-3">Ver lista →</p>
            </button>
          </div>
        </section>
      </main>

      {/* Verification Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="bg-black border-white/10 text-white sm:max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2 italic">
              <UserCheck className="h-6 w-6 text-red-600" />
              Validar Identidade
            </DialogTitle>
            <DialogDescription className="text-white/60 pt-2 text-xs uppercase tracking-wider">
              Segurança em conformidade com as normas financeiras.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div 
              className={`border-2 border-dashed rounded-none p-8 flex flex-col items-center justify-center gap-4 transition-all ${file ? 'border-red-600/50 bg-red-600/5' : 'border-white/10 hover:border-red-600/50 hover:bg-white/5'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
              }}
            >
              <div className={`w-16 h-16 flex items-center justify-center ${file ? 'bg-red-600/20 text-red-600' : 'bg-white/5 text-white/20'}`}>
                {file ? <CheckCircle2 className="h-8 w-8" /> : <Camera className="h-8 w-8" />}
              </div>
              <div className="text-center">
                <p className="font-bold text-sm uppercase tracking-tight">{file ? file.name : "Toque para enviar foto"}</p>
                <p className="text-[10px] text-white/40 mt-1 uppercase">RG, CNH ou Passaporte</p>
              </div>
              <Input 
                type="file" 
                className="hidden" 
                id="id-upload" 
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button 
                variant="outline" 
                size="sm" 
                className="border-white/20 bg-transparent hover:bg-white/10 font-black rounded-none uppercase text-[10px] tracking-widest"
                onClick={() => document.getElementById('id-upload')?.click()}
              >
                Escolher Arquivo
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button 
              className="bg-red-600 text-white hover:bg-red-700 font-black px-12 py-6 h-auto rounded-none uppercase tracking-widest w-full" 
              onClick={handleUploadIdentity}
              disabled={isUploading || !file}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar Agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={isSaqueDialogOpen} onOpenChange={setIsSaqueDialogOpen}>
        <DialogContent className="bg-black border-white/10 text-white sm:max-w-md rounded-none">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2 text-red-600 italic">
              <HandCoins className="h-6 w-6" />
              Solicitar Saque
            </DialogTitle>
            <DialogDescription className="text-white/60 pt-2 text-xs uppercase tracking-wider">
              Transferência via PIX (Pagamento Instantâneo)
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Quanto deseja sacar?</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-white/20 text-xl">R$</span>
                  <Input 
                    id="amount" 
                    placeholder="0,00" 
                    className="bg-white/5 border-white/10 pl-12 h-16 text-3xl font-black rounded-none border-l-4 border-l-red-600 focus-visible:ring-red-600"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix" className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Sua Chave PIX</Label>
                <Input 
                  id="pix" 
                  placeholder="CPF, E-mail ou Celular" 
                  className="bg-white/5 border-white/10 h-12 font-bold rounded-none focus-visible:ring-red-600"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:justify-center">
            <Button 
              className="bg-white text-black hover:bg-white/90 font-black px-12 py-6 h-auto rounded-none uppercase tracking-widest w-full" 
              onClick={handleSaqueRequest}
            >
              Confirmar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel Dialogs (Dashboard / Transações / Relatórios / Ajuda / Taxas / Bancários) */}
      <Dialog open={!!activePanel} onOpenChange={(o) => !o && setActivePanel(null)}>
        <DialogContent className="bg-black border-white/10 text-white sm:max-w-2xl rounded-none max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
              {activePanel === "dashboard" && <><LayoutDashboard className="h-6 w-6 text-red-600" /> Dashboard</>}
              {activePanel === "transacoes" && <><ArrowLeftRight className="h-6 w-6 text-red-600" /> Transações</>}
              {activePanel === "relatorios" && <><FileText className="h-6 w-6 text-red-600" /> Relatórios</>}
              {activePanel === "ajuda" && <><HelpCircle className="h-6 w-6 text-red-600" /> Central de Ajuda</>}
              {activePanel === "taxas" && <><Percent className="h-6 w-6 text-red-600" /> Taxas e Prazos</>}
              {activePanel === "bancarios" && <><Landmark className="h-6 w-6 text-red-600" /> Dados Bancários</>}
            </DialogTitle>
          </DialogHeader>

          {/* DASHBOARD */}
          {activePanel === "dashboard" && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 border-l-4 border-red-600 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Faturamento Bruto</p>
                  <p className="text-2xl font-black mt-1">{formatBRL(totalGross)}</p>
                </div>
                <div className="bg-white/5 border-l-4 border-white/30 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Comissão (10%)</p>
                  <p className="text-2xl font-black mt-1 text-red-600">-{formatBRL(totalCommission)}</p>
                </div>
                <div className="bg-white/5 border-l-4 border-red-600 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Líquido</p>
                  <p className="text-2xl font-black mt-1">{formatBRL(totalNet)}</p>
                </div>
              </div>
              <div className="bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40 font-bold mb-3">Resumo</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-white/60">Alunos ativos</span><span className="font-black">{activeStudents}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Ticket médio</span><span className="font-black">{formatBRL(PLAN_VALUE)}</span></div>
                  <div className="flex justify-between"><span className="text-white/60">Próximo repasse</span><span className="font-black">D+30</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TRANSAÇÕES */}
          {activePanel === "transacoes" && (
            <div className="py-4 space-y-2">
              {DEMO_ATHLETES.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 bg-white/5 border-l-2 border-red-600 p-3">
                  <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center font-black text-red-600">
                    {a.nome_completo[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{a.nome_completo}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Pagamento Mensalidade · {new Date(Date.now() - i * 86400000 * 3).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-500">+{formatBRL(PLAN_VALUE - PLAN_VALUE * COMMISSION_RATE)}</p>
                    <p className="text-[9px] uppercase tracking-widest text-white/40">Líquido</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RELATÓRIOS */}
          {activePanel === "relatorios" && (
            <div className="py-4 space-y-3">
              {([
                { key: "mensal", label: "Relatório Mensal" },
                { key: "anual", label: "Relatório Anual" },
                { key: "ir", label: "Imposto de Renda" },
                { key: "extrato", label: "Extrato Detalhado" },
              ] as const).map((r) => (
                <button key={r.key} onClick={() => setActiveReport(r.key)} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 p-4 transition-colors group">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-red-600" />
                    <span className="font-bold text-sm uppercase tracking-tight">{r.label}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-white/40 group-hover:text-red-600" />
                </button>
              ))}
            </div>
          )}

          {/* AJUDA */}
          {activePanel === "ajuda" && (
            <div className="py-4 space-y-3">
              {[
                { q: "Quando recebo meus saques?", a: "Saques solicitados são processados em até 2 dias úteis, após confirmação da identidade." },
                { q: "Qual é a taxa da plataforma?", a: "10% sobre cada plano vendido. Não há taxa de saque." },
                { q: "Período de teste gratuito", a: "Os primeiros 30 dias após o cadastro do aluno são livres de comissão." },
                { q: "Como funciona o bloqueio?", a: "Caso a assinatura do aluno expire ou seja cancelada, o acesso é bloqueado automaticamente." },
              ].map((item) => (
                <div key={item.q} className="bg-white/5 border-l-2 border-red-600 p-4">
                  <p className="font-black text-sm uppercase tracking-tight mb-1">{item.q}</p>
                  <p className="text-xs text-white/60 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          )}

          {/* TAXAS */}
          {activePanel === "taxas" && (
            <div className="py-4 space-y-3">
              <div className="bg-white/5 p-5 border-l-4 border-red-600">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Comissão da Plataforma</p>
                <p className="text-4xl font-black mt-2">10%</p>
                <p className="text-xs text-white/60 mt-1">Sobre cada mensalidade após o trial de 30 dias.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Trial Gratuito</p>
                  <p className="text-2xl font-black mt-1">30 dias</p>
                </div>
                <div className="bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Prazo Saque</p>
                  <p className="text-2xl font-black mt-1">D+2</p>
                </div>
                <div className="bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Taxa Saque</p>
                  <p className="text-2xl font-black mt-1 text-emerald-500">Grátis</p>
                </div>
                <div className="bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Repasse</p>
                  <p className="text-2xl font-black mt-1">D+30</p>
                </div>
              </div>
            </div>
          )}

          {/* DADOS BANCÁRIOS */}
          {activePanel === "bancarios" && (
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Banco</Label>
                <Input placeholder="Selecione seu banco" className="bg-white/5 border-white/10 h-12 rounded-none focus-visible:ring-red-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Agência</Label>
                  <Input placeholder="0000" className="bg-white/5 border-white/10 h-12 rounded-none focus-visible:ring-red-600" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">Conta</Label>
                  <Input placeholder="00000-0" className="bg-white/5 border-white/10 h-12 rounded-none focus-visible:ring-red-600" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-black">CPF do Titular</Label>
                <Input placeholder="000.000.000-00" className="bg-white/5 border-white/10 h-12 rounded-none focus-visible:ring-red-600" />
              </div>
              <Button className="w-full bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest rounded-none py-6 h-auto">
                Salvar Dados Bancários
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* REPORT DETAIL DIALOG */}
      <Dialog open={!!activeReport} onOpenChange={(o) => !o && setActiveReport(null)}>
        <DialogContent className="bg-black border-white/10 text-white sm:max-w-2xl rounded-none max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
              <FileText className="h-6 w-6 text-red-600" />
              {activeReport === "mensal" && "Relatório Mensal"}
              {activeReport === "anual" && "Relatório Anual"}
              {activeReport === "ir" && "Imposto de Renda"}
              {activeReport === "extrato" && "Extrato Detalhado"}
            </DialogTitle>
            <DialogDescription className="text-white/60 pt-2 text-xs uppercase tracking-wider">
              Período de referência · {new Date().toLocaleDateString("pt-BR")}
            </DialogDescription>
          </DialogHeader>

          {activeReport === "mensal" && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/5 border-l-4 border-red-600 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Bruto do Mês</p>
                  <p className="text-2xl font-black mt-1">{formatBRL(totalGross)}</p>
                </div>
                <div className="bg-white/5 border-l-4 border-white/30 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Comissão</p>
                  <p className="text-2xl font-black mt-1 text-red-600">-{formatBRL(totalCommission)}</p>
                </div>
                <div className="bg-white/5 border-l-4 border-red-600 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Líquido</p>
                  <p className="text-2xl font-black mt-1">{formatBRL(totalNet)}</p>
                </div>
              </div>
              <div className="bg-white/5 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/60">Novos alunos</span><span className="font-black">{activeStudents}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Cancelamentos</span><span className="font-black">0</span></div>
                <div className="flex justify-between"><span className="text-white/60">Reembolsos</span><span className="font-black">{formatBRL(0)}</span></div>
                <div className="flex justify-between"><span className="text-white/60">Mensalidades pagas</span><span className="font-black">{activeStudents}</span></div>
              </div>
              <Button className="w-full bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest rounded-none py-6 h-auto">Baixar PDF</Button>
            </div>
          )}

          {activeReport === "anual" && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 border-l-4 border-red-600 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Faturamento Anual</p>
                  <p className="text-2xl font-black mt-1">{formatBRL(totalGross * 12)}</p>
                </div>
                <div className="bg-white/5 border-l-4 border-red-600 p-4">
                  <p className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Líquido Anual</p>
                  <p className="text-2xl font-black mt-1">{formatBRL(totalNet * 12)}</p>
                </div>
              </div>
              <div className="bg-white/5 p-4">
                <p className="text-xs uppercase tracking-widest text-white/40 font-bold mb-3">Por mês</p>
                <div className="space-y-1">
                  {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m) => (
                    <div key={m} className="flex justify-between text-sm border-b border-white/5 py-1">
                      <span className="text-white/60">{m}</span>
                      <span className="font-bold">{formatBRL(totalNet)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button className="w-full bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest rounded-none py-6 h-auto">Baixar PDF</Button>
            </div>
          )}

          {activeReport === "ir" && (
            <div className="py-4 space-y-4">
              <div className="bg-white/5 border-l-4 border-red-600 p-5">
                <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">Rendimentos Tributáveis ({new Date().getFullYear()})</p>
                <p className="text-4xl font-black mt-2">{formatBRL(totalNet * 12)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">CNPJ Pagadora</p>
                  <p className="font-black mt-1">00.000.000/0001-00</p>
                </div>
                <div className="bg-white/5 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">IRRF Retido</p>
                  <p className="font-black mt-1">{formatBRL(0)}</p>
                </div>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">Informe estes valores na ficha “Rendimentos Recebidos de Pessoa Jurídica” da sua declaração anual.</p>
              <Button className="w-full bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest rounded-none py-6 h-auto">Baixar Informe de Rendimentos</Button>
            </div>
          )}

          {activeReport === "extrato" && (
            <div className="py-4 space-y-2">
              {DEMO_ATHLETES.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3 bg-white/5 border-l-2 border-red-600 p-3">
                  <div className="w-10 h-10 rounded-full bg-red-600/20 flex items-center justify-center font-black text-red-600">{a.nome_completo[0]}</div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{a.nome_completo}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Crédito Mensalidade · {new Date(Date.now() - i * 86400000 * 3).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-500">+{formatBRL(PLAN_VALUE)}</p>
                    <p className="text-[9px] uppercase tracking-widest text-red-600">-{formatBRL(PLAN_VALUE * COMMISSION_RATE)} taxa</p>
                  </div>
                </div>
              ))}
              <div className="flex justify-between bg-white/5 border-l-4 border-red-600 p-4 mt-3">
                <span className="font-black uppercase tracking-widest text-sm">Saldo Final</span>
                <span className="font-black text-xl">{formatBRL(totalNet)}</span>
              </div>
              <Button className="w-full bg-red-600 hover:bg-red-700 font-black uppercase tracking-widest rounded-none py-6 h-auto mt-2">Exportar CSV</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* STUDENTS LIST DIALOG */}
      <Dialog open={!!studentsView} onOpenChange={(o) => !o && setStudentsView(null)}>
        <DialogContent className="bg-black border-white/10 text-white sm:max-w-2xl rounded-none max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter italic flex items-center gap-2">
              {studentsView === "ativos" ? (
                <><TrendingUp className="h-6 w-6 text-red-600" /> Alunos Ativos</>
              ) : (
                <><TrendingDown className="h-6 w-6 text-red-600" /> Desistentes</>
              )}
            </DialogTitle>
            <DialogDescription className="text-white/60 pt-2 text-xs uppercase tracking-wider">
              {studentsView === "ativos"
                ? `${activeStudents} aluno(s) com assinatura ativa`
                : "Nenhum desistente no período"}
            </DialogDescription>
          </DialogHeader>

          {studentsView === "ativos" && (
            <div className="py-4 space-y-2">
              {DEMO_ATHLETES.map((a) => (
                <div key={a.id} className="flex items-center gap-3 bg-white/5 border-l-2 border-emerald-500 p-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center font-black text-emerald-500">
                    {a.nome_completo[0]}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{a.nome_completo}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">{a.email}</p>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 uppercase text-[9px] font-black tracking-widest rounded-none">
                    Ativo
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {studentsView === "desistentes" && (
            <div className="py-10 text-center space-y-3">
              <div className="w-16 h-16 mx-auto rounded-full bg-white/5 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-white/30" />
              </div>
              <p className="font-black uppercase tracking-widest text-sm text-white/60">Nenhum desistente</p>
              <p className="text-xs text-white/40 max-w-sm mx-auto">Quando um aluno cancelar a assinatura ou tiver o acesso bloqueado, ele aparecerá aqui.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFaturamento;