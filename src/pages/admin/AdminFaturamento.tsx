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
import { motion, AnimatePresence } from "framer-motion";

const AdminFaturamento = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isSaqueDialogOpen, setIsSaqueDialogOpen] = useState(false);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pixKey, setPixKey] = useState("");
  const [amount, setAmount] = useState("");

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
        .single();
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

    // Process logic here
    toast({
      title: "Solicitação enviada",
      description: "Seu pedido de saque está em processamento.",
    });
    setIsSaqueDialogOpen(false);
  };

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", badge: null, onClick: () => {} },
    { icon: ArrowLeftRight, label: "Transações", badge: null, onClick: () => {} },
    { 
      icon: HandCoins, 
      label: "Saques", 
      badge: null, 
      onClick: () => setIsSaqueDialogOpen(true) 
    },
    { icon: FileText, label: "Relatórios", badge: null, onClick: () => {} },
    { icon: HelpCircle, label: "Central de ajuda", badge: null, onClick: () => {} },
    { icon: Percent, label: "Taxas e prazos", badge: null, onClick: () => {} },
    { 
      icon: Landmark, 
      label: "Dados bancários", 
      badge: "Pendente", 
      badgeColor: "bg-red-600/20 text-red-500 border-red-600/30" 
    },
    { 
      icon: UserCheck, 
      label: "Identidade", 
      badge: profile?.status_identidade === "aprovado" ? "Verificado" : profile?.status_identidade === "em_analise" ? "Em análise" : "Pendente",
      badgeColor: profile?.status_identidade === "aprovado" ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "bg-red-600/20 text-red-500 border-red-600/30",
      onClick: () => profile?.status_identidade === "pendente" && setIsVerifyDialogOpen(true)
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white">
      {/* Netflix-style Header Banner */}
      <div className="relative h-[40vh] w-full overflow-hidden">
        {/* Abstract Background for Netflix feel */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 via-black/60 to-black z-0" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-red-600/10 via-transparent to-transparent opacity-50" />
        
        <header className="relative z-10 px-5 pt-6 flex items-center justify-between max-w-4xl mx-auto w-full">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="text-red-600 font-black text-2xl tracking-tighter">PACHO <span className="text-white">FINANCE</span></div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-900 border border-white/20" />
        </header>

        <main className="relative z-10 px-5 pt-12 max-w-4xl mx-auto w-full">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-white/40 font-bold">Saldo Total Disponível</p>
            <h1 className="text-6xl md:text-7xl font-black tracking-tighter text-white">
              R$ 0,00
            </h1>
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="bg-red-600/10 text-red-500 border-red-600/30 uppercase text-[10px] tracking-widest font-bold px-3 py-1">
                Premium Coach
              </Badge>
              <p className="text-xs text-white/40">R$ 0,00 pendente</p>
            </div>
          </motion.div>
          
          <div className="flex gap-3 mt-8">
            <Button 
              onClick={() => setIsSaqueDialogOpen(true)}
              className="bg-white text-black hover:bg-white/90 font-bold px-8 py-6 h-auto rounded-md flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
              <HandCoins className="h-5 w-5 fill-current" />
              Solicitar Saque
            </Button>
            <Button 
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold px-8 py-6 h-auto rounded-md flex items-center gap-2 transition-transform hover:scale-105 active:scale-95"
            >
              <ArrowLeftRight className="h-5 w-5" />
              Histórico
            </Button>
          </div>
        </main>
      </div>

      <main className="px-5 pb-12 space-y-10 max-w-4xl mx-auto -mt-4 relative z-10">
        {/* Warning Alert if pending verification */}
        {profile?.status_identidade !== "aprovado" && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-red-600/10 border-l-4 border-red-600 p-5 flex gap-4 items-center rounded-r-xl"
          >
            <AlertCircle className="h-8 w-8 text-red-600 shrink-0" />
            <div className="space-y-1">
              <p className="font-bold text-sm uppercase tracking-wider">Verificação Necessária</p>
              <p className="text-xs text-white/60 leading-relaxed">
                {profile?.status_identidade === "em_analise" 
                  ? "Sua identidade está sendo analisada. Você poderá solicitar saques em breve."
                  : "Para o seu 1º saque, precisamos confirmar sua identidade. Clique em Saque para começar."}
              </p>
            </div>
          </motion.div>
        )}

        {/* Section: Navegação */}
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-white/90 border-l-4 border-red-600 pl-3">Menu Financeiro</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {menuItems.map((item, idx) => (
              <motion.button
                key={idx}
                whileHover={{ y: -5 }}
                onClick={item.onClick}
                className="flex flex-col items-start gap-4 p-5 rounded-lg bg-white/5 border border-white/5 hover:border-red-600/50 hover:bg-white/10 transition-all group text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-red-600/5 rounded-full -mr-12 -mt-12 group-hover:bg-red-600/10 transition-colors" />
                <div className="w-12 h-12 rounded-lg bg-black flex items-center justify-center border border-white/10 group-hover:border-red-600/50 transition-colors">
                  <item.icon className="h-6 w-6 text-red-600" />
                </div>
                <div className="space-y-1 z-10">
                  <p className="font-bold text-sm text-white/90">{item.label}</p>
                  {item.badge && (
                    <Badge variant="outline" className={`${item.badgeColor} text-[8px] uppercase tracking-widest px-1.5 h-4 border-none p-0`}>
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Section: Métricas (Netflix Cards) */}
        <section className="space-y-4 pt-4">
          <h2 className="text-xl font-black uppercase tracking-tight text-white/90 border-l-4 border-red-600 pl-3">Métricas de Alunos</h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            <div className="min-w-[280px] bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-6 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingUp className="h-24 w-24 text-emerald-500" />
              </div>
              <p className="text-xs uppercase tracking-widest text-emerald-500 font-bold mb-4">Alunos Ativos</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white">0</span>
                <span className="text-emerald-500 text-sm font-bold flex items-center"><TrendingUp className="h-3 w-3 mr-1" />+0%</span>
              </div>
              <div className="mt-6 h-1 w-full bg-emerald-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-0 transition-all duration-1000" />
              </div>
            </div>

            <div className="min-w-[280px] bg-red-950/20 border border-red-500/20 rounded-xl p-6 relative group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <TrendingDown className="h-24 w-24 text-red-500" />
              </div>
              <p className="text-xs uppercase tracking-widest text-red-500 font-bold mb-4">Alunos Desistentes</p>
              <div className="flex items-baseline gap-2">
                <span className="text-6xl font-black text-white">0</span>
                <span className="text-red-500 text-sm font-bold flex items-center"><TrendingDown className="h-3 w-3 mr-1" />-0%</span>
              </div>
              <div className="mt-6 h-1 w-full bg-red-500/10 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 w-0 transition-all duration-1000" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Verification Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
              <UserCheck className="h-6 w-6 text-red-600" />
              Confirmar Identidade
            </DialogTitle>
            <DialogDescription className="text-white/60 pt-2">
              Para liberar seu primeiro saque, precisamos de uma foto do seu documento de identidade (RG ou CNH).
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div 
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-4 transition-all ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 hover:border-red-600/50 hover:bg-white/5'}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
              }}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${file ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-600/10 text-red-600'}`}>
                {file ? <CheckCircle2 className="h-8 w-8" /> : <Camera className="h-8 w-8" />}
              </div>
              <div className="text-center">
                <p className="font-bold text-sm">{file ? file.name : "Clique ou arraste sua foto"}</p>
                <p className="text-xs text-white/40 mt-1">Formatos aceitos: JPG, PNG, PDF</p>
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
                className="border-white/20 bg-transparent hover:bg-white/10 font-bold"
                onClick={() => document.getElementById('id-upload')?.click()}
              >
                Selecionar Arquivo
              </Button>
            </div>
            
            <div className="bg-white/5 p-4 rounded-lg flex gap-3 items-start">
              <AlertCircle className="h-5 w-5 text-white/40 shrink-0" />
              <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed font-bold">
                Sua foto será analisada em até 24h úteis. Seus dados estão protegidos por criptografia de ponta a ponta.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsVerifyDialogOpen(false)} className="font-bold text-white hover:bg-white/5">Cancelar</Button>
            <Button 
              className="bg-red-600 text-white hover:bg-red-700 font-bold px-8" 
              onClick={handleUploadIdentity}
              disabled={isUploading || !file}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : "Enviar para Análise"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={isSaqueDialogOpen} onOpenChange={setIsSaqueDialogOpen}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-red-600">
              <HandCoins className="h-6 w-6" />
              Solicitar Saque
            </DialogTitle>
            <DialogDescription className="text-white/60 pt-2">
              O valor mínimo para saque é R$ 50,00.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-xs uppercase tracking-widest text-white/40 font-bold">Valor do Saque</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-white/40">R$</span>
                  <Input 
                    id="amount" 
                    placeholder="0,00" 
                    className="bg-white/5 border-white/10 pl-10 h-12 text-lg font-black"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pix" className="text-xs uppercase tracking-widest text-white/40 font-bold">Chave PIX (CPF ou Email)</Label>
                <Input 
                  id="pix" 
                  placeholder="Seu PIX para recebimento" 
                  className="bg-white/5 border-white/10 h-12 font-medium"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                />
              </div>
            </div>

            <div className="bg-emerald-500/10 p-4 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <Percent className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">Taxa de Saque</p>
              </div>
              <p className="font-black text-white">R$ 0,00</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setIsSaqueDialogOpen(false)} className="font-bold text-white hover:bg-white/5">Cancelar</Button>
            <Button 
              className="bg-white text-black hover:bg-white/90 font-bold px-8" 
              onClick={handleSaqueRequest}
            >
              Confirmar Saque
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminFaturamento;