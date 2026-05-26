import { useState, useEffect } from "react";
import { Lock, Rocket, ChevronRight, Link as LinkIcon, Smartphone, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";

export const SubscriptionLockScreen = () => {
  const { slug } = useParams();
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesLink = async () => {
      try {
        // Find the coach (tenant owner)
        const { data: tenant } = await supabase
          .from("tenants")
          .select("owner_user_id")
          .eq("slug", slug)
          .maybeSingle();

        if (tenant) {
          const { data: salesLink } = await supabase
            .from("coach_sales_links")
            .select("checkout_url, landing_page_url")
            .eq("user_id", tenant.owner_user_id)
            .maybeSingle();
          
          setCheckoutUrl(salesLink?.checkout_url || salesLink?.landing_page_url || null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchSalesLink();
  }, [slug]);

  const handleRedirect = () => {
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      window.location.href = `/${slug}/site`;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
      {/* Background Aesthetics */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-gradient-radial from-primary/10 via-transparent to-transparent opacity-50" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 mb-4 animate-bounce">
            <Lock className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-4xl font-['Anton'] uppercase italic tracking-tighter leading-none">
            ÁREA <span className="text-primary">RESTRITA</span>
          </h2>
          <p className="text-white/60 text-sm uppercase tracking-[0.2em] font-bold">Conteúdo Exclusivo Pro</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Rocket className="h-32 w-32 -rotate-12" />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-bold italic uppercase tracking-tight">Liberar Acesso Imediato</h3>
            <p className="text-sm text-white/50 leading-relaxed">
              Você está tentando acessar uma área exclusiva do seu coach. Para continuar, você precisa de um plano ativo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-10">
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Treino App</span>
            </div>
            <div className="bg-black/40 p-3 rounded-2xl border border-white/5 flex flex-col items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Dieta Online</span>
            </div>
          </div>

          <Button 
            onClick={handleRedirect}
            className="w-full h-16 rounded-2xl bg-primary text-black hover:bg-primary/90 font-['Anton'] text-2xl uppercase italic tracking-wider gap-3 shadow-[0_0_30px_rgba(229,9,20,0.3)] group transition-all hover:scale-[1.02]"
          >
            QUERO MEU ACESSO AGORA
            <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Button>

          <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">
            Pagamento Seguro via {checkoutUrl?.includes('kiwify') ? 'Kiwify' : checkoutUrl?.includes('hotmart') ? 'Hotmart' : 'Plataforma Alpha'}
          </p>
        </div>

        <button 
          onClick={() => window.location.href = `/${slug}/site`}
          className="text-white/40 text-[10px] font-bold uppercase tracking-[0.3em] hover:text-white transition-colors"
        >
          Voltar para o site do Coach
        </button>
      </div>
    </div>
  );
};
