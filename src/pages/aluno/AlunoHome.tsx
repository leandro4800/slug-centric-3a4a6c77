import { useBranding } from "@/contexts/BrandingProvider";
import { Logo } from "@/components/Logo";
import { Settings, Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import heroDefault from "@/assets/hero-default.jpg";
import { TenantSymbol } from "@/components/TenantSymbol";

const sections = [
  { title: "Meu Treino", emoji: "🏋️" },
  { title: "Minha Dieta", emoji: "🥗" },
  { title: "Minha Evolução", emoji: "📈" },
];

const AlunoHome = () => {
  const { tenant } = useBranding();
  const { slug } = useParams();
  const hero = tenant?.hero_url || heroDefault;

  return (
    <>
      {/* Hero */}
      <section className="relative h-[55vh] min-h-[420px] w-full overflow-hidden">
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/40 to-background" />
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5">
          <Logo size={32} withText={false} />
          <Link to={`/${slug}/app/controle`} className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Settings className="h-4 w-4 text-accent" />
          </Link>
        </div>
        <div className="absolute bottom-8 left-0 right-0 px-5">
          <p className="text-xs uppercase tracking-widest text-primary mb-2">{tenant?.nome || "AlphaCoach"}</p>
          <h1 className="font-display text-5xl text-foreground mb-5 leading-none">
            {tenant?.tagline || "TREINE COMO UM CAMPEÃO"}
          </h1>
          <button className="inline-flex items-center gap-2 bg-accent text-accent-foreground font-semibold px-6 py-3 rounded-md hover:opacity-90 transition">
            <Play className="h-4 w-4 fill-current" /> REPRODUZIR
          </button>
        </div>
      </section>

      {/* Links úteis */}
      <section className="px-5 -mt-2">
        <div className="bg-card/60 border border-accent/40 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center">
            <Zap className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="font-display text-lg text-accent">LINKS ÚTEIS</p>
            <p className="text-xs text-muted-foreground">Parceiros & cupons exclusivos</p>
          </div>
        </div>
      </section>

      {/* Minha prescrição */}
      <section className="px-5 mt-8">
        <h2 className="font-display text-lg mb-4 flex items-center gap-2">
          <span className="text-accent">▶</span> MINHA PRESCRIÇÃO
        </h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-2">
          {sections.map((s) => (
            <div
              key={s.title}
              className="flex-shrink-0 w-40 h-56 rounded-xl bg-gradient-card border border-border relative overflow-hidden hover:border-primary/50 transition-all cursor-pointer group"
            >
              <div className="absolute top-3 left-3 w-8 h-8 rounded-md bg-background/70 flex items-center justify-center">
                <Zap className="h-4 w-4 text-accent fill-accent" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-30 group-hover:scale-110 transition-transform">
                {s.emoji}
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-background to-transparent">
                <p className="font-display text-base">{s.title.toUpperCase()}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Vlogs */}
      <section className="px-5 mt-8">
        <h2 className="font-display text-lg mb-4 flex items-center gap-2">
          <span className="text-accent">▶</span> VLOGS DO COACH
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="aspect-video rounded-xl bg-gradient-card border border-border relative overflow-hidden cursor-pointer group">
              <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-80 transition" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center">
                  <Play className="h-5 w-5 text-accent-foreground fill-current" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </>
  );
};

export default AlunoHome;
