import { useBranding } from "@/contexts/BrandingProvider";
import { Logo } from "@/components/Logo";
import { Play, Volume2, VolumeX, Stethoscope, ChevronRight, User, Users, CalendarCheck, HelpCircle } from "lucide-react";
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
import EnablePushBanner from "@/components/EnablePushBanner";

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
    let isMounted = true;
    const checkRole = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "admin",
        });
        if (isMounted && !error) {
          setIsAdmin(Boolean(data));
        }
      } catch (err) {
        console.error("[AlunoHome] Error checking admin role:", err);
      }
    };
    checkRole();
    return () => { isMounted = false; };
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
      <section className="relative h-[70vh] min-h-[400px] w-full overflow-hidden flex flex-col justify-end pb-[10%] px-5">
        {/* Background Hero (contido na seção) */}
        <div className="hero-mask">
          {(ytAutoSrc || tenantHeroVideoId || tenantHeroDirectUrl || featuredDirectUrl) ? (
            ytAutoSrc || tenantHeroVideoId ? (
              <iframe
                key={`${ytId || tenantHeroVideoId}-${muted}-${expanded}`}
                src={ytAutoSrc || `https://www.youtube.com/embed/${tenantHeroVideoId}?autoplay=1&mute=1&loop=1&playlist=${tenantHeroVideoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                className="w-full h-full pointer-events-none scale-135"
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

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-transparent" />

        <div className="absolute inset-x-0 top-0 h-6 bg-background/10" />
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-5 z-10">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.nome} className="h-12 w-auto object-contain" />
            ) : (
              <Logo withText={false} />
            )}
            {tenant ? (
              <span className="font-display text-xl tracking-wider uppercase">
                {tenant.nome}
              </span>
            ) : (
              <span className="font-display text-xl tracking-wider">
                ALPHA<span className="text-primary">COACH</span>
              </span>
            )}
          </div>
        </div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">ORIGINAL</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{tenant?.nome || "ALPHA COACH"}</span>
          </div>
          <h1 className="font-display text-4xl leading-none drop-shadow-lg">
            {(featured?.title || tenant?.tagline || "TREINE COMO UM CAMPEÃO").toUpperCase()}
          </h1>
          <div className="flex items-center gap-3 text-xs mb-4">
            <span className="text-[hsl(142_70%_55%)] font-semibold">98% compatível</span>
            <span className="text-muted-foreground">{new Date().getFullYear()}</span>
            <span className="border border-muted-foreground/50 px-1 text-[10px] text-muted-foreground">16+</span>
          </div>
          <Button
            onClick={handlePlay}
            disabled={!featured && !tenant?.hero_url}
            className="inline-flex items-center gap-2 font-bold px-8 py-4 rounded-md tracking-widest shadow-xl transition-all active:scale-95 bg-white text-black hover:bg-white/90"
          >
            <Play className="h-5 w-5 fill-current" /> ASSISTIR
          </Button>
        </div>
      </section>

      {/* Seção de Atalhos Rápidos */}
      <section className="relative z-20 px-5 pt-8 pb-1 space-y-3 bg-background">
        <EnablePushBanner />

        <div className="grid grid-cols-2 gap-3">
          <Link 
            to={`/${tenantSlug}/app/comunidade`}
            className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-primary/50 transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-lg bg-card/50 border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm text-foreground/80 leading-tight uppercase group-hover:text-primary transition-colors truncate">Comunidade</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 truncate">Feed de notícias</p>
            </div>
          </Link>

          <Link 
            to={`/${tenantSlug}/app/presencial`}
            className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 hover:border-primary/50 transition-all active:scale-[0.98] group"
          >
            <div className="w-10 h-10 rounded-lg bg-card/50 border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
              <CalendarCheck className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-sm text-foreground/80 leading-tight uppercase group-hover:text-primary transition-colors truncate">Presencial</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 truncate">Marcar aulas</p>
            </div>
          </Link>
        </div>

        <Link 
          to={`/${tenantSlug}/app/parceiros`}
          className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 hover:border-primary/50 transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-lg bg-card/50 border border-border flex items-center justify-center group-hover:bg-primary/10 group-hover:border-primary/30 transition-all">
            <TenantSymbol size={28} />
          </div>
          <div>
            <p className="font-display text-lg text-foreground/80 leading-tight uppercase group-hover:text-primary transition-colors">Links Úteis</p>
            <p className="text-xs text-muted-foreground">Parceiros & cupons exclusivos</p>
          </div>
        </Link>
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
        <div className="grid grid-cols-2 gap-3">
          {vlogs.slice(1).map((v) => (
            <div
              key={v.id}
              onClick={() => setPlaying(v)}
              className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/50 transition-all group"
            >
              <div className="relative aspect-video">
                <img
                  src={buildThumb(v)}
                  alt={v.title || ""}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                  {v.title || "Vídeo do Coach"}
                </p>
              </div>
            </div>
          ))}
        </div>
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