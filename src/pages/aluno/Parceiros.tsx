import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink, Ticket, Star } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Parceiro {
  id: string;
  nome: string;
  cupom: string | null;
  url: string | null;
  logo_url: string | null;
}

const Parceiros = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [loading, setLoading] = useState(true);

  const loadParceiros = async () => {
    if (!tenant?.id) return;
    try {
      const { data, error } = await supabase
        .from("parceiros" as any)
        .select("id, nome, cupom, url, logo_url")
        .eq("tenant_id", tenant.id)
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setParceiros((data as unknown as Parceiro[]) || []);
    } catch (error: any) {
      console.error("Erro ao carregar parceiros:", error);
      toast.error("Erro ao carregar parceiros");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadParceiros();
  }, [tenant?.id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Cupom copiado!");
  };

  return (
    <div className="px-5 pt-6 pb-32 bg-background min-h-screen">
      <button
        onClick={() => navigate(`/${slug}/app`)}
        className="flex items-center gap-2 text-primary text-sm font-semibold uppercase tracking-widest hover:brightness-125 transition-all mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <div className="flex items-center gap-2 text-primary/80">
        <Star className="h-4 w-4 fill-primary/20" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Vantagens Exclusivas</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-foreground leading-tight uppercase">
        Parceiros <span className="text-primary">Elite</span>
      </h1>
      <p className="text-muted-foreground text-sm mt-2 mb-8">
        Confira as marcas que apoiam o {tenant?.nome || "nosso time"} e aproveite benefícios exclusivos.
      </p>

      <div className="grid gap-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 w-full bg-card/40 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : parceiros.length === 0 ? (
          <div className="text-center py-20 px-10 border border-white/5 bg-card/20 rounded-2xl">
            <p className="text-muted-foreground">Nenhum parceiro cadastrado no momento.</p>
          </div>
        ) : (
          parceiros.map((p) => (
            <div
              key={p.id}
              className="group bg-card/40 border border-white/10 rounded-2xl p-4 transition-all hover:border-primary/50"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-xs font-bold border border-white/10 uppercase overflow-hidden shrink-0">
                  {p.logo_url ? (
                    <img src={p.logo_url} alt={p.nome} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">{p.nome.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-xl text-foreground group-hover:text-primary transition-colors truncate">
                    {p.nome}
                  </h3>
                  
                  {p.cupom && (
                    <button
                      onClick={() => copyToClipboard(p.cupom!)}
                      className="mt-2 flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-all active:scale-95"
                    >
                      <Ticket className="h-3.5 w-3.5 text-primary" />
                      <span className="text-[10px] text-primary uppercase font-bold tracking-widest">
                        CUPOM: {p.cupom}
                      </span>
                    </button>
                  )}
                </div>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-primary/20 hover:border-primary/40 transition-all"
                  >
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Parceiros;
