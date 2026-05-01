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
  TrendingDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const AdminFaturamento = () => {
  const navigate = useNavigate();
  const { slug } = useParams();

  const menuItems = [
    { icon: LayoutDashboard, label: "Dashboard", badge: null },
    { icon: ArrowLeftRight, label: "Transações", badge: null },
    { icon: HandCoins, label: "Saques", badge: null },
    { icon: FileText, label: "Relatórios", badge: null },
    { icon: HelpCircle, label: "Central de ajuda", badge: null },
    { icon: Percent, label: "Taxas e prazos", badge: null },
    { icon: Landmark, label: "Dados bancários", badge: "Pendente", badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
    { icon: UserCheck, label: "Identidade", badge: "Pendente", badgeColor: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-4 sticky top-0 bg-[#0A0A0A]/95 backdrop-blur z-10 border-b border-white/5">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-xl uppercase tracking-widest text-[#FFD700]">FINANCEIRO</h1>
      </header>

      <main className="px-5 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Financial Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-xl">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Saldo disponível</p>
            <p className="font-display text-2xl text-[#FFD700]">R$ 0,00</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-xl">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Saldo pendente</p>
            <p className="font-display text-2xl text-white/80">R$ 0,00</p>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-4 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-orange-500 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-200/90 leading-relaxed">
            Para realizar vendas e solicitar saques, é necessário completar o seu cadastro de identidade e dados bancários primeiro.
          </p>
        </div>

        {/* Menu List */}
        <div className="space-y-2">
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <item.icon className="h-5 w-5 text-[#FFD700]" />
              </div>
              <span className="flex-1 text-left font-medium text-sm">{item.label}</span>
              {item.badge && (
                <Badge variant="outline" className={`${item.badgeColor} text-[9px] uppercase tracking-tighter px-1.5 h-5`}>
                  {item.badge}
                </Badge>
              )}
              <ChevronRight className="h-4 w-4 text-white/20" />
            </button>
          ))}
        </div>

        {/* Metrics Section */}
        <section className="pt-4 space-y-4">
          <h2 className="font-display text-sm uppercase tracking-[0.2em] text-white/40 px-1">MÉTRICAS DE ALUNOS</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingUp className="h-12 w-12 text-emerald-500" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-emerald-500/60 mb-2">ATIVOS</p>
              <p className="font-display text-4xl text-emerald-400">0</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                <TrendingDown className="h-12 w-12 text-red-500" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-red-500/60 mb-2">DESISTENTES</p>
              <p className="font-display text-4xl text-red-400">0</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminFaturamento;
