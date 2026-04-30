import { useBranding } from "@/contexts/BrandingProvider";
import { Logo } from "@/components/Logo";
import { Settings, Play } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import heroDefault from "@/assets/hero-default.jpg";
import cardTreino from "@/assets/card-treino.jpg";
import cardDieta from "@/assets/card-dieta.jpg";
import cardEvolucao from "@/assets/card-evolucao.jpg";
import cardClinica from "@/assets/card-clinica.jpg";
import { TenantSymbol } from "@/components/TenantSymbol";

interface VlogPost {
  id: string;
  url: string;
  title: string | null;
  thumbnail_url: string | null;
  platform: string;
}

const sections = [
  { title: "Meu Treino", to: "treino", img: cardTreino },
  { title: "Minha Dieta", to: "dieta", img: cardDieta },
  { title: "Minha Evolução", to: "evolucao", img: cardEvolucao },
  { title: "Clínica", to: "clinica", img: cardClinica },
];

const TiltCard = ({ children, to }: { children: React.ReactNode; to: string }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const point = "touches" in e ? e.touches[0] : (e as React.MouseEvent);
    const x = (point.clientX - rect.left) / rect.width;
    const y = (point.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * 18;
    const ry = (x - 0.5) * 18;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.04)`;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
  };
  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "perspective(800px) rotateX(0) rotateY(0) scale(1)";
  };
  return (
    <Link
      ref={ref}
      to={to}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onTouchMove={handleMove}
      onTouchEnd={reset}
      className="flex-shrink-0 w-44 h-60 rounded-xl border border-border relative overflow-hidden cursor-pointer transition-transform duration-200 ease-out will-change-transform hover:border-accent/60 hover:shadow-[0_20px_50px_-10px_hsl(var(--accent)/0.4)]"
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </Link>
  );
};

const AlunoHome = () => {
  const { tenant } = useBranding();
  const { slug } = useParams();
  const [vlogs, setVlogs] = useState<VlogPost[]>([]);

  const featured = vlogs[0];
  const ytId = featured ? (featured.url.match(/(?:youtu\.be\/|v=|\/shorts\/|\/embed\/)([A-Za-z0-9_-]{6,})/)?.[1] ?? null) : null;
  const heroImg = featured?.thumbnail_url || tenant?.hero_url || heroDefault;
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!tenant?.id) return;
    void supabase
      .from("vlog_posts")
      .select("id, url, title, thumbnail_url, platform")
      .eq("tenant_id", tenant.id)
      .eq("visivel", true)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setVlogs((data as VlogPost[]) || []));
  }, [tenant?.id]);

  const handlePlay = () => {
    if (!featured) return;
    if (ytId) {
      setPlaying(true);
    } else {
      window.open(featured.url, "_blank", "noopener");
    }
  };

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
            <TenantSymbol size={28} />
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
        <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4 pt-2">
          {sections.map((s) => (
            <TiltCard key={s.title} to={`/${slug}/app/${s.to}`}>
              <img
                src={s.img}
                alt={s.title}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
              <div
                className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity"
                style={{
                  background:
                    "radial-gradient(circle at var(--mx,50%) var(--my,50%), hsl(var(--accent)/0.25), transparent 60%)",
                }}
              />
              <div className="absolute top-3 left-3 w-8 h-8 rounded-md bg-background/70 backdrop-blur flex items-center justify-center">
                <TenantSymbol size={20} />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-display text-base leading-tight">{s.title.toUpperCase()}</p>
              </div>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Vlogs */}
      <section className="px-5 mt-8">
        <h2 className="font-display text-lg mb-4 flex items-center gap-2">
          <span className="text-accent">▶</span> VLOGS DO COACH
        </h2>
        {vlogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum vlog publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {vlogs.map((v) => (
              <a
                key={v.id}
                href={v.url}
                target="_blank"
                rel="noreferrer"
                className="aspect-video rounded-xl bg-gradient-card border border-border relative overflow-hidden cursor-pointer group"
              >
                <img
                  src={v.thumbnail_url || hero}
                  alt={v.title || ""}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-accent/90 flex items-center justify-center">
                    <Play className="h-5 w-5 text-accent-foreground fill-current" />
                  </div>
                </div>
                {v.title && (
                  <p className="absolute bottom-2 left-2 right-2 text-xs font-semibold line-clamp-2">{v.title}</p>
                )}
                <div className="absolute top-2 right-2 bg-background/70 backdrop-blur rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                  {v.platform}
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

    </>
  );
};

export default AlunoHome;
