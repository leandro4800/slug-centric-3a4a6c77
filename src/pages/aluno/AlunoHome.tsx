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
      .select("id, url, title, thumbnail_url, platform")
      .eq("tenant_id", tenant.id)
      .eq("visivel", true)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setVlogs((data as VlogPost[]) || []));
  }, [tenant?.id]);

  const featured = vlogs[0];
  const ytId = featured ? extractYouTubeId(featured.url) : (isDirectVideo(tenant?.hero_url) || extractYouTubeId(tenant?.hero_url) ? null : extractYouTubeId(tenant?.hero_url));
  
  // Se não houver vlog, mas houver um vídeo de hero do tenant
  const tenantHeroVideoId = !featured ? extractYouTubeId(tenant?.hero_url) : null;
  const tenantHeroDirectUrl = !featured && isDirectVideo(tenant?.hero_url) ? tenant?.hero_url : null;

  const heroImg = featured?.thumbnail_url || tenant?.hero_url || heroDefault;

  const buildEmbed = (v: VlogPost): string | null => {
    const u = v.url;
    const yt = extractYouTubeId(u);
    if (yt) return `https://www.youtube.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    if (u.includes("instagram.com")) {
      // converte para embed oficial do Instagram (não exige login para reels/posts públicos)
      const clean = u.split("?")[0].replace(/\/$/, "");
      return `${clean}/embed`;
    }
    if (u.includes("tiktok.com")) {
      const m = u.match(/\/video\/(\d+)/);
      if (m) return `https://www.tiktok.com/embed/v2/${m[1]}`;
    }
    return null;
  };

  const handlePlay = () => {
    if (!featured) return;
    if (ytId) {
      setExpanded(true);
      setMuted(false);
    } else {
      setPlaying(featured);
    }
  };

  // Auto-play silencioso de fundo (YouTube)
  const ytAutoSrc = ytId
    ? `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muted ? 1 : 0}&controls=${expanded ? 1 : 0}&loop=1&playlist=${ytId}&playsinline=1&rel=0&modestbranding=1&showinfo=0&iv_load_policy=3${expanded ? "" : "&disablekb=1"}`
    : null;

  return (
    <>
      {/* Hero */}
      <section className="relative h-[55vh] min-h-[420px] w-full overflow-hidden bg-background">
        {ytAutoSrc || tenantHeroVideoId || tenantHeroDirectUrl ? (
          <>
            {ytAutoSrc || tenantHeroVideoId ? (
              <iframe
                key={`${ytId || tenantHeroVideoId}-${muted}-${expanded}`}
                src={ytAutoSrc || `https://www.youtube.com/embed/${tenantHeroVideoId}?autoplay=1&mute=1&loop=1&playlist=${tenantHeroVideoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                title={featured?.title || tenant?.nome || "Hero Video"}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={expanded ? { pointerEvents: "auto" } : undefined}
              />
            ) : (
              <video
                src={tenantHeroDirectUrl!}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
            {/* máscara para esconder UI do YT quando não-expandido */}
            {!expanded && (
              <div className="absolute inset-0 pointer-events-none" />
            )}
          </>
        ) : (
          <img src={heroImg} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {!expanded && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black pointer-events-none" />
        )}
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
            {expanded && (
              <button
                onClick={() => { setExpanded(false); setMuted(true); }}
                className="px-3 h-9 rounded-full bg-background/80 border border-border text-xs font-semibold backdrop-blur"
              >
                Fechar
              </button>
            )}
            
            {/* Ícone de Perfil para todos os alunos */}
            <Link to={`/${slug}/app/perfil`} className="w-10 h-10 rounded-full bg-card/70 border border-border flex items-center justify-center backdrop-blur">
              <User className="h-4 w-4 text-foreground" />
            </Link>

            {/* Ícone de Engrenagem apenas para admins */}
            {isAdmin && (
              <Link to={`/${slug}/app/controle`} className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center backdrop-blur">
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
        {!expanded && (
          <div className="absolute bottom-8 left-0 right-0 px-5 z-10">
            <p className="text-xs uppercase tracking-widest text-primary mb-2">{tenant?.nome || "AlphaCoach"}</p>
            <h1 className="font-display text-5xl text-foreground mb-5 leading-none drop-shadow-lg">
              {featured?.title || tenant?.tagline || "TREINE COMO UM CAMPEÃO"}
            </h1>
            <Button
              onClick={handlePlay}
              disabled={!featured}
              className="inline-flex items-center gap-2 font-bold px-6 py-3 rounded-none tracking-widest"
              title={featured ? "Reproduzir último vlog" : "Sem vlog publicado"}
            >
              <Play className="h-4 w-4 fill-current" /> REPRODUZIR
            </Button>
          </div>
        )}
      </section>

      {/* Dr. IA Prompt */}
      <section className="px-5 -mt-2 space-y-3">
        <Link 
          to={`/${slug}/app/dr-ia`}
          className="bg-card/60 border border-primary/20 rounded-2xl p-4 flex items-center gap-4 hover:bg-primary/5 transition-colors group"
        >
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Stethoscope className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-display text-lg text-primary leading-tight uppercase">Dr. IA</p>
            <p className="text-xs text-muted-foreground">Seu médico esportivo de bolso</p>
          </div>
          <ChevronRight className="h-5 w-5 text-primary/50" />
        </Link>

        <div className="bg-card/40 border border-border rounded-2xl p-4 flex items-center gap-4">
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
          <div className="grid grid-cols-2 gap-3">
            {vlogs.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setPlaying(v)}
                className="aspect-video rounded-xl bg-gradient-card border border-border relative overflow-hidden cursor-pointer group text-left"
              >
                <img
                  src={v.thumbnail_url || tenant?.hero_url || heroDefault}
                  alt={v.title || ""}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/10 to-transparent" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center">
                    <Play className="h-5 w-5 text-primary-foreground fill-current" />
                  </div>
                </div>
                {v.title && (
                  <p className="absolute bottom-2 left-2 right-2 text-xs font-semibold line-clamp-2">{v.title}</p>
                )}
                <div className="absolute top-2 right-2 bg-background/70 backdrop-blur rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider">
                  {v.platform}
                </div>
              </button>
            ))}
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
              const embed = buildEmbed(playing);
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