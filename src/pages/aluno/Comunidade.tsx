import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import heroDefault from "@/assets/hero-default.jpg";

const stories = [
  { initials: "SD", name: "Samila", color: "hsl(45 96% 56%)" },
  { initials: "EM", name: "Execution", color: "hsl(20 90% 55%)" },
  { initials: "DD", name: "Davi", color: "hsl(142 70% 50%)" },
  { initials: "SD", name: "Samila", color: "hsl(200 90% 55%)" },
  { initials: "JJ", name: "Jonas", color: "hsl(330 80% 60%)" },
];

const Comunidade = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const hero = tenant?.hero_url || heroDefault;

  return (
    <>
      <div className="px-5 pt-6">
        <Button
          variant="link"
          onClick={() => navigate(`/${slug}/app`)}
          className="text-primary p-0 h-auto"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <p className="text-[10px] text-primary uppercase tracking-[0.3em] font-bold mt-5">{tenant?.nome || "TIME"}</p>
        <h1 className="font-display text-4xl mt-1">COMUNIDADE ELITE</h1>
      </div>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 mt-5 pb-1">
        {stories.map((s, i) => (
          <div key={i} className="flex-shrink-0 text-center">
            <div
              className="w-16 h-16 rounded-full p-[2.5px]"
              style={{ background: s.color }}
            >
              <div className="w-full h-full rounded-full bg-background flex items-center justify-center font-display text-base">
                {s.initials}
              </div>
            </div>
            <p className="text-[10px] mt-1 text-muted-foreground">{s.name}</p>
          </div>
        ))}
      </div>

      <div className="px-5 mt-6">
        <div className="bg-card/40 border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 p-4">
            <img src={hero} alt="" className="w-10 h-10 rounded-full object-cover" />
            <div>
              <p className="font-semibold">Leandro Mineiro</p>
              <p className="text-xs text-muted-foreground">há 8 dias</p>
            </div>
          </div>
          <p className="px-4 pb-3 text-sm">Treino pegado 💪🏽</p>
          <div className="aspect-square bg-black">
            <img src={hero} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <Button className="fixed bottom-24 right-5 w-14 h-14 rounded-full p-0 shadow-glow" variant="default">
        <Plus className="h-6 w-6" />
      </Button>
    </>
  );
};

export default Comunidade;
