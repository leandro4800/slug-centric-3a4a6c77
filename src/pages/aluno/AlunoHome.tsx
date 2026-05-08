import { useBranding } from "@/contexts/BrandingProvider";
import { Logo } from "@/components/Logo";
import { Play, Volume2, VolumeX, Stethoscope, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
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
      className="flex-shrink-0 w-44 h-60 rounded-xl border border-border relative overflow-hidden cursor-pointer transition-transform duration-200 ease-out will-change-transform hover:border-primary/60 hover:shadow-[0_20px_50px_-10px_hsl(var(--primary)/0.4)]"
      style={{ transformStyle: "preserve-3d" }}
    >
      {children}
    </Link>
  );
};

const AlunoHome = () => {
  const { tenant } = useBranding();
  const { user } = useAuth();
  const { slug } = useParams();
  const tenantSlug = tenant?.slug || slug;
  const [vlogs, setVlogs] = useState<VlogPost[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState<VlogPost | null>(null);

  useEffect(() => {
    const checkRole = async () => {
      if (!user) return;
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(Boolean(data));
    };
    checkRole();
  }, [user]);

  useEffect(() => {
    if (!tenant?.id) return;
    void supabase
      .from("vlog_posts")
      .select("id, url, title, thumbnail_url, platform, destaque")
      .eq("tenant_id", tenant.id)
      .eq("visivel", true)
      .order("destaque", { ascending: false })
      .order("posted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setVlogs((data as VlogPost[]) || []));
  }, [tenant?.id]);

  const featured = vlogs[0];
  const ytId = featured ? extractYouTubeId(featured.url) : extractYouTubeId(tenant?.hero_url);
  
  // Vídeo direto do featured (mp4 etc) ou fallback para hero do tenant
  const featuredDirectUrl = featured && isDirectVideo(featured.url) ? featured.url : null;
  const tenantHeroVideoId = !featured ? extractYouTubeId(tenant?.hero_url) : null;
  const tenantHeroDirectUrl = !featured && isDirectVideo(tenant?.hero_url) ? tenant?.hero_url : null;

  const heroImg = featured?.thumbnail_url || tenant?.hero_url || heroDefault;

  const buildEmbed = (v: VlogPost, opts: { muted?: boolean; controls?: boolean } = {}): string | null => {
    const muted = opts.muted ?? true;
    const controls = opts.controls ?? false;
    const u = v.url;
    const yt = extractYouTubeId(u);
    if (yt) return `https://www.youtube.com/embed/${yt}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${yt}&controls=${controls ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`;
    if (u.includes("instagram.com")) {
      let clean = u.split("?")[0].split("#")[0];
      clean = clean.replace("/reels/", "/reel/");
      if (!clean.endsWith("/")) clean += "/";
      return `${clean}embed/captioned/`;
    }
    if (u.includes("tiktok.com")) {
      const m = u.match(/\/video\/(\d+)/);
      if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
    }
    return null;
  };

  const buildThumb = (v: VlogPost): string => {
    if (v.thumbnail_url) return v.thumbnail_url;
    const yt = extractYouTubeId(v.url);
    if (yt) return `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`;
    // fallback genérico via screenshot
    return `https://api.microlink.io/?url=${encodeURIComponent(v.url)}&screenshot=true&meta=false&embed=screenshot.url`;
  };

  const handlePlay = () => {
    if (featured) {
      setPlaying(featured);
      return;
    }
    
    if (tenant?.hero_url) {
      setPlaying({
        id: "hero",
        url: tenant.hero_url,
        title: tenant.tagline || tenant.nome || "Apresentação",
        thumbnail_url: null,
        platform: "hero"
      });
    }
  };

  // Auto-play silencioso de fundo (YouTube)
  const ytAutoSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muted ? 1 : 0}&controls=${expanded ? 1 : 0}&loop=1&playlist=${ytId}&playsinline=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3${expanded ? "" : "&disablekb=1"}`
    : null;

  return (
    <>
      {/* Hero Content Section */}
      <section className="relative h-[55vh] min-h-[420px] w-full overflow-hidden flex flex-col justify-end pb-8 px-5">
        {/* Background Hero (contido na seção) */}
        <div className="hero-mask">
          {(ytAutoSrc || tenantHeroVideoId || tenantHeroDirectUrl || featuredDirectUrl) ? (
            ytAutoSrc || tenantHeroVideoId ? (
              <iframe
                key={`${ytId || tenantHeroVideoId}-${muted}-${expanded}`}
                src={ytAutoSrc || `https://www.youtube.com/embed/${tenantHeroVideoId}?autoplay=1&mute=1&loop=1&playlist=${tenantHeroVideoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                className="w-full h-full pointer-events-none"
              />
            ) : (
              <video
                src={(featuredDirectUrl || tenantHeroDirectUrl)!}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            )
          ) : (
            <img src={heroImg} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black pointer-events-none" />

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-10">
          <Logo size={32} withText={false} />
          <div className="flex items-center gap-2">
            {ytAutoSrc && !expanded && (
              <button
                onClick={() => setMuted((m) => !m)}
                className="w-10 h-10 rounded-full bg-background/70 border border-border flex items-center justify-center backdrop-blur"
                title={muted ? "Ativar som" : "Silenciar"}
                aria-label={muted ? "Ativar som" : "Silenciar"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4 text-primary" />}
              </button>
            )}
            
            <Link to={`/${tenantSlug}/app/perfil`} className="w-10 h-10 rounded-full bg-card/70 border border-border flex items-center justify-center backdrop-blur">
              <User className="h-4 w-4 text-foreground" />
            </Link>

            {isAdmin && (
              <Link to={`/${tenantSlug}/app/controle`} className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center backdrop-blur">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-settings text-primary"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2a2 2 0 0 1-2 2a2 2 0 0 0-2 2a2 2 0 0 1-2 2a2 2 0 0 0-2 2v.44a2 2 0 0 0 2 2a2 2 0 0 1 2 2a2 2 0 0 0 2 2a2 2 0 0 1 2 2a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2a2 2 0 0 1 2-2a2 2 0 0 0 2-2a2 2 0 0 1 2-2a2 2 0 0 0 2-2v-.44a2 2 0 0 0-2-2a2 2 0 0 1-2-2a2 2 0 0 0-2-2a2 2 0 0 1-2-2a2 2 0 0 0-2-2Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Link>
            )}
          </div>
        </div>
        
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-widest text-primary mb-2">{tenant?.nome || "Alpha Coach"}</p>
          <h1 className="font-display text-5xl text-foreground mb-5 leading-none drop-shadow-lg">
            {tenant?.tagline || "TREINE COMO UM CAMPEÃO"}
          </h1>
          <Button
            onClick={handlePlay}
            disabled={!featured && !tenant?.hero_url}
            className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-xl tracking-widest shadow-[0_10px_30px_-5px_hsl(var(--primary)/0.5)] transition-all active:scale-95"
          >
            <Play className="h-4 w-4 fill-current" /> REPRODUZIR
          </Button>
        </div>
      </section>

      <section className="relative z-20 px-5 pt-8 pb-1 space-y-3 bg-background">
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-card/50 border border-border flex items-center justify-center">
            <TenantSymbol size={28} />
          </div>
          <div>
            <p className="font-display text-lg text-foreground/80 leading-tight uppercase">Links Úteis</p>
            <p className="text-xs text-muted-foreground">Parceiros & cupons exclusivos</p>
          </div>
        </div>
      </section>

      {/* Minha prescrição */}
      <section className="px-5 mt-8">
        <h2 className="font-display text-lg mb-4 flex items-center gap-2">
          <span className="text-primary">▶</span> MINHA PRESCRIÇÃO
        </h2>
        <div className="flex gap-4 overflow-x-auto scrollbar-hide -mx-5 px-5 pb-4 pt-2">
          {sections.map((s) => (
            <TiltCard key={s.title} to={`/${tenantSlug}/app/${s.to}`}>
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
                    "radial-gradient(circle at var(--mx,50%) var(--my,50%), hsl(var(--primary)/0.25), transparent 60%)",
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
          <span className="text-primary">▶</span> VLOGS DO COACH
        </h2>
        {vlogs.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum vlog publicado ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vlogs.map((v) => {
              const embed = buildEmbed(v);
              const isReel = v.url.includes("instagram.com") || v.url.includes("tiktok.com");
              return (
                <div
                  key={v.id}
                  className={`rounded-xl bg-black border border-border relative overflow-hidden ${isReel ? "aspect-[9/16] max-h-[560px] mx-auto w-full" : "aspect-video"}`}
                >
                  {embed ? (
                    <iframe
                      src={embed}
                      title={v.title || "Vlog"}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      scrolling="no"
                      className="absolute inset-0 w-full h-full"
                    />
                  ) : isDirectVideo(v.url) ? (
                    <button
                      type="button"
                      onClick={() => setPlaying(v)}
                      className="absolute inset-0 w-full h-full group"
                      aria-label={v.title ? `Reproduzir ${v.title}` : "Reproduzir vlog"}
                    >
                      <video
                        src={`${v.url}#t=0.1`}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/30 transition-colors pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-[0_8px_24px_-4px_hsl(var(--primary)/0.6)] group-hover:scale-110 transition-transform">
                          <Play className="h-6 w-6 text-primary-foreground fill-current" />
                        </div>
                      </div>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPlaying(v)}
                      className="absolute inset-0 w-full h-full"
                    >
                      <img
                        src={v.thumbnail_url || tenant?.hero_url || heroDefault}
                        alt={v.title || ""}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                          <Play className="h-5 w-5 text-primary-foreground fill-current" />
                        </div>
                      </div>
                    </button>
                  )}
                  <div className="pointer-events-none absolute top-2 right-2 bg-background/70 backdrop-blur rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider z-10">
                    {v.platform}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* In-app player modal */}
      {playing && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4"
          onClick={() => setPlaying(null)}
        >
          <button
            onClick={() => setPlaying(null)}
            className="absolute top-4 right-4 px-4 h-9 rounded-full bg-background/80 border border-border text-xs font-semibold backdrop-blur z-10"
          >
            Fechar
          </button>
          <div
            className="relative w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const embed = buildEmbed(playing, { muted: false, controls: true });
              if (embed) {
                return (
                  <iframe
                    src={embed}
                    title={playing.title || "Vlog"}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    className="w-full h-full"
                  />
                );
              }
              if (isDirectVideo(playing.url)) {
                return <video src={playing.url} controls autoPlay className="w-full h-full" />;
              }
              return (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                  <p className="text-sm text-muted-foreground">Não foi possível embutir esse vídeo.</p>
                  <a href={playing.url} target="_blank" rel="noreferrer" className="text-primary underline text-sm">
                    Abrir em nova aba
                  </a>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );
};

export default AlunoHome;