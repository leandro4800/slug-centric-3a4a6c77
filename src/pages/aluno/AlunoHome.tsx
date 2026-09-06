import { useBranding } from "@/contexts/BrandingProvider";
import { Logo } from "@/components/Logo";
import { Play, Volume2, VolumeX, ChevronRight, User, Users, CalendarCheck, HelpCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { extractYouTubeId, isDirectVideo } from "@/lib/utils";
import { buildYouTubeEmbedUrl, YOUTUBE_IFRAME_ALLOW, YOUTUBE_IFRAME_REFERRER_POLICY } from "@/lib/youtube-embed";
import { buildYouTubeThumbnailUrl, isVlogVideoPageUrl } from "@/lib/vlog-url";
import { VlogPlayerModal } from "@/components/aluno/VlogPlayerModal";
import { normalizeVideoUrl } from "@/lib/video-embed";
import { DEFAULT_COACH_VIDEO } from "@/lib/default-coach-video";
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
  // { title: "Clínica", to: "clinica", img: cardClinica },
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
  const { user, hasRole } = useAuth();
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
      // Coach do próprio tenant ou super-admin já libera imediatamente
      if (hasRole("admin") || (tenant?.id && hasRole("coach", tenant.id))) {
        if (isMounted) setIsAdmin(true);
        return;
      }
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
  }, [user, tenant?.id, hasRole]);

  useEffect(() => {
    if (!tenant?.id) return;

    const loadVlogs = () => {
      void supabase
        .from("vlog_posts")
        .select("id, url, title, thumbnail_url, platform, destaque")
        .eq("tenant_id", tenant.id)
        .eq("visivel", true)
        .order("destaque", { ascending: false })
        .order("posted_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(6)
        .then(({ data }) => {
          const rows = ((data as VlogPost[]) || []).filter((v) => Boolean(v.url?.trim()));
          setVlogs(rows);
        });
    };

    loadVlogs();

    const channel = supabase
      .channel(`vlog-posts-${tenant.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "vlog_posts",
          filter: `tenant_id=eq.${tenant.id}`,
        },
        () => loadVlogs(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenant?.id]);

  const normalizePlayableVlog = (v: VlogPost): VlogPost => {
    const normalizedUrl = normalizeVideoUrl(v.url);
    const yt = extractYouTubeId(normalizedUrl) || extractYouTubeId(v.thumbnail_url);
    if (!yt) return { ...v, url: normalizedUrl || v.url };
    return {
      ...v,
      url: `https://www.youtube.com/watch?v=${yt}`,
      thumbnail_url:
        v.thumbnail_url && !isVlogVideoPageUrl(v.thumbnail_url)
          ? v.thumbnail_url
          : buildYouTubeThumbnailUrl(yt),
    };
  };

  const featuredRaw = vlogs.find((v) => Boolean(v.url?.trim())) ?? null;
  const featured = featuredRaw ? normalizePlayableVlog(featuredRaw) : undefined;
  const featuredUrl = featured?.url ? normalizeVideoUrl(featured.url) : null;

  // Vídeo do coach: vlog em destaque (YouTube/mp4) ou hero_url se for vídeo.
  // Imagem de capa NÃO conta — aí entra o videopadrao.
  const featuredYtId = featuredUrl ? extractYouTubeId(featuredUrl) : null;
  const featuredDirectUrl = featuredUrl && isDirectVideo(featuredUrl) ? featuredUrl : null;
  const heroYtId = !featuredYtId && !featuredDirectUrl ? extractYouTubeId(tenant?.hero_url) : null;
  const heroDirectUrl =
    !featuredYtId && !featuredDirectUrl && isDirectVideo(tenant?.hero_url) ? tenant!.hero_url! : null;

  const coachVideoYtId = featuredYtId || heroYtId;
  const coachVideoDirectUrl = featuredDirectUrl || heroDirectUrl;
  const hasCoachVideo = !!(coachVideoYtId || coachVideoDirectUrl);

  const ytId = coachVideoYtId;
  const heroVideoSrc = coachVideoDirectUrl || (!hasCoachVideo ? DEFAULT_COACH_VIDEO : null);

  const heroImg = featured
    ? (!isVlogVideoPageUrl(featured.thumbnail_url) && featured.thumbnail_url) ||
      (featuredYtId ? buildYouTubeThumbnailUrl(featuredYtId) : tenant?.hero_url || heroDefault)
    : tenant?.hero_url || heroDefault;

  const buildThumb = (v: VlogPost): string => {
    if (v.thumbnail_url && !isVlogVideoPageUrl(v.thumbnail_url)) return v.thumbnail_url;
    const normalized = normalizeVideoUrl(v.url);
    const yt = extractYouTubeId(normalized) || extractYouTubeId(v.thumbnail_url);
    if (yt) return buildYouTubeThumbnailUrl(yt);
    if (!normalized?.trim()) return heroDefault;
    return `https://api.microlink.io/?url=${encodeURIComponent(normalized)}&screenshot=true&meta=false&embed=screenshot.url`;
  };

  const handlePlay = () => {
    if (featured && featuredUrl && (featuredYtId || isDirectVideo(featuredUrl))) {
      setPlaying({ ...featured, url: featuredUrl });
      return;
    }

    if (heroYtId) {
      setPlaying({
        id: "hero",
        url: normalizeVideoUrl(tenant!.hero_url!),
        title: tenant?.tagline || tenant?.nome || "Apresentação",
        thumbnail_url: null,
        platform: "hero",
      });
      return;
    }

    if (heroDirectUrl) {
      setPlaying({
        id: "hero",
        url: heroDirectUrl,
        title: tenant?.tagline || tenant?.nome || "Apresentação",
        thumbnail_url: null,
        platform: "hero",
      });
      return;
    }

    setPlaying({
      id: "hero-default",
      url: DEFAULT_COACH_VIDEO,
      title: tenant?.tagline || tenant?.nome || "Apresentação",
      thumbnail_url: null,
      platform: "hero",
    });
  };

  // Auto-play silencioso de fundo (YouTube) — só se o coach tiver vídeo YouTube
  const ytAutoSrc = coachVideoYtId
    ? buildYouTubeEmbedUrl(coachVideoYtId, {
        autoplay: true,
        mute: muted,
        controls: expanded,
        loop: true,
        playsinline: true,
        rel: false,
        modestbranding: true,
        showinfo: false,
        iv_load_policy: 3,
        disablekb: !expanded,
      })
    : null;
  const heroEmbedSrc = ytAutoSrc;

  return (
    <>
      {/* Hero Content Section */}
      <section className="relative h-[70vh] min-h-[400px] w-full overflow-hidden flex flex-col justify-end pb-[10%] px-5">
        {/* Background Hero (contido na seção) */}
        <div className="hero-mask">
          {heroEmbedSrc ? (
            <iframe
              key={`${ytId}-${muted}-${expanded}`}
              src={heroEmbedSrc}
              referrerPolicy={YOUTUBE_IFRAME_REFERRER_POLICY}
              allow={YOUTUBE_IFRAME_ALLOW}
              className="w-full h-full pointer-events-none scale-135"
            />
          ) : heroVideoSrc ? (
            <video
              src={heroVideoSrc}
              autoPlay
              muted
              loop
              playsInline
              poster={hasCoachVideo ? undefined : heroImg}
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={heroImg} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />

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
                ALPHA<span className="text-primary">COACH</span> PRO
              </span>
            )}
          </div>
        </div>
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded">ORIGINAL</span>
            <span className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{tenant?.nome || "ALPHACOACH PRO"}</span>
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
            disabled={false}
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

      {/* Meu planejamento */}
      <section className="px-5 mt-8">
        <h2 className="font-display text-lg mb-4 flex items-center gap-2">
          <span className="text-primary">▶</span> MEU PLANEJAMENTO
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
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg flex items-center gap-2">
            <span className="text-primary">▶</span> VLOGS DO COACH
          </h2>
          {isAdmin && (
            <Link
              to={`/${tenantSlug}/admin/vlogs`}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-glow hover:opacity-90 transition"
            >
              <Plus className="h-3.5 w-3.5" /> Postar novo
            </Link>
          )}
        </div>
        {isAdmin && vlogs.length === 0 && (
          <Link
            to={`/${tenantSlug}/admin/vlogs`}
            className="block bg-card border border-dashed border-primary/40 rounded-xl p-6 text-center hover:border-primary transition-all mb-3"
          >
            <Plus className="h-6 w-6 text-primary mx-auto mb-2" />
            <p className="font-display text-sm uppercase tracking-wider">Publicar seu primeiro vlog</p>
            <p className="text-[11px] text-muted-foreground mt-1">Link YouTube, TikTok, Instagram ou upload direto</p>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-3">
          {vlogs
            .filter((v) => v.id !== featured?.id && v.url?.trim())
            .map((v) => (
            <div
              key={v.id}
              onClick={() => setPlaying(normalizePlayableVlog(v))}
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

      {playing && (
        <VlogPlayerModal
          url={playing.url}
          title={playing.title}
          thumbnailUrl={playing.thumbnail_url || buildThumb(playing)}
          onClose={() => setPlaying(null)}
        />
      )}
    </>
  );
};

export default AlunoHome;