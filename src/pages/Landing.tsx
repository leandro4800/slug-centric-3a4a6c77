import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Play, CheckCircle2, Mail, Lock, X, Video, Wallet, Palette, TrendingUp, Smartphone, Users, UserRound, MapPin, Search as SearchIcon, KeyRound, Dumbbell, Apple, Sword, Zap } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { motion, AnimatePresence } from "framer-motion";
import useEmblaCarousel from 'embla-carousel-react';

interface CoachData {
  name: string;
  specialty: string;
  bio: string;
  video: string;
  tag: string;
  cidade: string;
  estado: string;
  slug: string;
}

const defaultCoaches: CoachData[] = [
  {
    name: "PIKACHU TEAM",
    specialty: "HIPERTROFIA & ESTÉTICA",
    bio: "Treinos cinematográficos pra quem quer crescer.",
    video: "https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474299562_rgnobx_Treino_de_b_ceps____....._reels__gym__workout__academia__treino.mp4",
    tag: "VERIFICADO",
    cidade: "Serra",
    estado: "ES",
    slug: "pikachu-team"
  },
  {
    name: "TEAM JACKSON",
    specialty: "HIPERTROFIA & EMAGRECIMENTO",
    bio: "Performance e estética com método Team Jackson.",
    video: "https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777468713644_di4x57_WhatsApp_Video_2026-04-24_at_22.37.07__1_.mp4",
    tag: "VERIFICADO",
    cidade: "Serra",
    estado: "ES",
    slug: "team-jackson"
  },
  {
    name: "BADBOY TEAM",
    specialty: "ESTÉTICA & PERFORMANCE",
    bio: "Metodologia Badboy para resultados extremos.",
    video: "https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474964273_njic9i_Testado_e_aprovado__oficialjeffersonbadboy____ARNOLD_SPORTS_SOUTH_AMERICA_2026.mp4",
    tag: "VERIFICADO",
    cidade: "São Paulo",
    estado: "SP",
    slug: "badboy-team"
  },
  {
    name: "NUTRI SAMILA DIAS",
    specialty: "NUTRIÇÃO ESPORTIVA",
    bio: "Especialista em emagrecimento e saúde.",
    video: "https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474463996_dxa3r7_Make_notes_look_202604250428.mp4",
    tag: "VERIFICADO",
    cidade: "Serra",
    estado: "ES",
    slug: "samila-dias"
  },
];

const useCases = [
  {
    title: "COACHES DE ELITE",
    subtitle: "Sua Consultoria Digital",
    description: "Sua marca, seus treinos, seus resultados no modo cinema. A plataforma número 1 para coaches que buscam escala.",
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop",
    color: "#E00000",
    icon: Dumbbell
  },
  {
    title: "NUTRICIONISTAS",
    subtitle: "Nutrição Inteligente",
    description: "Prescreva dietas personalizadas com auxílio de IA e acompanhe a evolução dos seus pacientes em tempo real.",
    image: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=1453&auto=format&fit=crop",
    color: "#00F0FF",
    icon: Apple
  },
  {
    title: "CENTROS DE LUTAS",
    subtitle: "CT & Artes Marciais",
    description: "Do tatame para o digital. Gerencie turmas, treinos e graduações com um aplicativo exclusivo para o seu CT.",
    image: "https://images.unsplash.com/photo-1552072805-2a9039d00e57?q=80&w=1374&auto=format&fit=crop",
    color: "#BAA174",
    icon: Sword
  },
  {
    title: "BOX DE CROSSFIT",
    subtitle: "Comunidade & WODs",
    description: "WODs dinâmicos, rankings de PR e uma comunidade engajada. Tudo o que o seu Box precisa para decolar.",
    image: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1470&auto=format&fit=crop",
    color: "#D4FF00",
    icon: Zap
  }
];

const BRAND_COLORS = [
  { name: "Alpha Red", hex: "#E00000" },
  { name: "Legacy Blue", hex: "#202C39" },
  { name: "Champ Gold", hex: "#BAA174" },
  { name: "Forest Pro", hex: "#22302A" },
  { name: "Deep Purple", hex: "#3A2B38" },
  { name: "Stealth", hex: "#1F1F1F" },
  { name: "Neon Lime", hex: "#D4FF00" },
  { name: "Electric Cyan", hex: "#00F0FF" },
];

interface DemoAppScreenProps {
  mode?: "home" | "treino" | "dieta";
  brandName?: string;
  brandColor?: string;
}

const DemoAppScreen = ({ mode = "home", brandName = "Seu Coach Team", brandColor = "#E00000" }: DemoAppScreenProps) => (
  <div
    className="h-full w-full overflow-hidden bg-black text-white font-sans flex flex-col"
    style={{ ["--primary" as any]: brandColor }}
  >
    <div className="h-10 w-full flex items-center justify-between px-6 pt-4">
      <span className="text-[10px] font-bold">9:41</span>
      <div className="flex gap-1">
        <div className="w-3 h-3 rounded-full border border-white/30" />
        <div className="w-4 h-3 rounded-[2px] border border-white/30" />
      </div>
    </div>
    {mode === "home" && (
      <div className="flex-1 flex flex-col overflow-y-auto scrollbar-hide">
        <div className="relative h-64 shrink-0 overflow-hidden">
          <video src="https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474299562_rgnobx_Treino_de_b_ceps____....._reels__gym__workout__academia__treino.mp4" autoPlay muted loop playsInline className="h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
          <div className="absolute left-6 right-6 bottom-6">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: brandColor }}>{brandName}</p>
            <h3 className="text-3xl font-black uppercase leading-none mb-2">BEM-VINDO, CHAMP</h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Hoje é dia de braço e foco total.</p>
          </div>
        </div>
      </div>
    )}
  </div>
);

const renderScreenMedia = (url: string) => {
  if (!url) return <div className="h-full w-full bg-secondary flex items-center justify-center text-zinc-700 text-[10px] uppercase font-black">Sem mídia</div>;
  const isVideo = url.toLowerCase().match(/\.(mp4|webm|ogg|mov)$/) || url.includes('video') || url.includes('.mp4');
  if (isVideo) {
    return <video src={url} autoPlay muted loop playsInline className="h-full w-full object-cover" />;
  }
  return <img src={url} alt="App Screen" className="h-full w-full object-cover" />;
};

const Landing = () => {
  const { user, isLoading: authLoading } = useAuth();
  const [mode, setMode] = useState<"choice" | "aluno" | "coach" | null>(null);
  const [showSimulador, setShowSimulador] = useState(false);
  const [simuladorMode, setSimuladorMode] = useState<"home" | "treino" | "dieta">("home");
  const [email, setEmail] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState(80);
  const [price, setPrice] = useState(400);
  const [brandName, setBrandName] = useState("Seu Coach Team");
  const [brandColor, setBrandColor] = useState("#E00000");
  const [screen1, setScreen1] = useState("https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474299562_rgnobx_Treino_de_b_ceps____....._reels__gym__workout__academia__treino.mp4");
  const [screen2, setScreen2] = useState("https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777468713644_di4x57_WhatsApp_Video_2026-04-24_at_22.37.07__1_.mp4");
  const [screen3, setScreen3] = useState("https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474964273_njic9i_Testado_e_aprovado__oficialjeffersonbadboy____ARNOLD_SPORTS_SOUTH_AMERICA_2026.mp4");
  const [screen4, setScreen4] = useState("https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474463996_dxa3r7_Make_notes_look_202604250428.mp4");
  const [coaches, setCoaches] = useState<CoachData[]>(defaultCoaches);
  const [hasCoachLink, setHasCoachLink] = useState<boolean | null>(null);
  const [coachLink, setCoachLink] = useState("");
  const [searchCoach, setSearchCoach] = useState("");
  const [searchRegion, setSearchRegion] = useState("");

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, duration: 40 });
  useEffect(() => {
    if (emblaApi) {
      const intervalId = setInterval(() => {
        emblaApi.scrollNext();
      }, 5000);
      return () => clearInterval(intervalId);
    }
  }, [emblaApi]);

  const { toast } = useToast();
  const navigate = useNavigate();
  const stateMap: Record<string, string> = { "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM", "bahia": "BA", "ceara": "CE", "distrito federal": "DF", "espirito santo": "ES", "goias": "GO", "maranhao": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", "minas gerais": "MG", "para": "PA", "paraiba": "PB", "parana": "PR", "pernambuco": "PE", "piaui": "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", "rondonia": "RO", "roraima": "RR", "santa catarina": "SC", "sao paulo": "SP", "sergipe": "SE", "tocantins": "TO" };

  const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  useEffect(() => {
    const loadCoaches = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("nome, tagline, bio, hero_url, foto_url, especialidades, cidade, estado, slug")
        .eq("status", "approved")
        .limit(8);
      if (data && data.length > 0) {
        const mapped = data.map(d => ({ name: d.nome, specialty: (d.especialidades && d.especialidades.length > 0) ? d.especialidades[0] : (d.tagline || ""), bio: d.bio || "", video: d.hero_url || d.foto_url || "", tag: "VERIFICADO", cidade: d.cidade || "", estado: d.estado || "", slug: d.slug }));
        setCoaches(mapped);
      }
    };
    void loadCoaches();
  }, []);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      localStorage.setItem("simulator_email", normalizedEmail);
      setIsUnlocked(true);
      setShowSimulador(true);
      toast({ title: "Acesso Liberado!", description: "Agora você pode simular a experiência do seu app." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoachLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (coachLink) {
        const slug = coachLink.split("/").pop();
        if (slug) navigate(`/${slug}/site`);
    }
  };

  const handleSearchCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCoach) {
        const featuredSection = document.getElementById('coaches-featured');
        if (featuredSection) featuredSection.scrollIntoView({ behavior: 'smooth' });
        else navigate(`/marketplace?q=${encodeURIComponent(searchCoach)}`);
    }
  };

  const handleSearchRegion = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchRegion) {
        const featuredSection = document.getElementById('coaches-featured');
        if (featuredSection) featuredSection.scrollIntoView({ behavior: 'smooth' });
        else navigate(`/marketplace?region=${encodeURIComponent(searchRegion)}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm border-b border-white/10">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-gray-300">
          <a href="#coaches" className="hover:text-primary transition-colors">Coaches</a>
          <button onClick={() => setShowSimulador(true)} className="hover:text-primary transition-colors">Simulador</button>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" className="text-white hover:bg-white/10 font-bold uppercase tracking-wider">
              {user ? "Acessar App" : "Entrar"}
            </Button>
          </Link>
          <Button 
            onClick={() => setShowSimulador(true)}
            className="px-6 font-black uppercase tracking-widest hidden sm:flex"
          >
            {user ? "Dashboard" : "Testar Agora"}
          </Button>
        </div>
      </header>

      <section className="relative min-h-[90vh] md:min-h-screen flex items-center pt-20 overflow-hidden">
        {!mode ? (
          <div className="absolute inset-0 z-0">
            <div className="embla overflow-hidden h-full" ref={emblaRef}>
              <div className="embla__container flex h-full">
                {useCases.map((useCase, index) => (
                  <div key={index} className="embla__slide relative flex-[0_0_100%] h-full">
                    <img src={useCase.image} alt={useCase.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                    <div className="absolute inset-0 flex items-center px-6 md:px-24">
                      <div className="max-w-2xl">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={`title-${index}`} transition={{ duration: 0.5 }}>
                          <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] border rounded-md" style={{ borderColor: `${useCase.color}50`, backgroundColor: `${useCase.color}10`, color: useCase.color }}>
                            <useCase.icon className="w-4 h-4" />
                            {useCase.subtitle}
                          </div>
                          <h2 className="text-5xl md:text-8xl font-black leading-[0.8] mb-6 tracking-tighter uppercase text-white">
                            {useCase.title.split(' ').map((word, i) => (
                              <span key={i} className={i === 0 ? "block" : "block text-primary"}>{word} </span>
                            ))}
                          </h2>
                          <p className="text-xl text-gray-300 font-medium max-w-lg mb-8 leading-relaxed">{useCase.description}</p>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {useCases.map((_, i) => (
                <div key={i} className={`h-1.5 transition-all duration-300 rounded-full ${i === (emblaApi?.selectedScrollSnap() || 0) ? "w-8 bg-primary" : "w-2 bg-white/20"}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 z-0">
            <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1470&auto=format&fit=crop" alt="Background" className="w-full h-full object-cover opacity-30 grayscale" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-background to-background" />
          </div>
        )}

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
            <div className="max-w-4xl mx-auto mt-[40vh] md:mt-[30vh]">
              {!mode && (
                <div className="grid md:grid-cols-2 gap-8">
                  <button onClick={() => setMode("aluno")} className="group relative p-8 bg-black/60 backdrop-blur-md border border-white/10 rounded-none hover:border-primary transition-all text-left overflow-hidden shadow-2xl">
                    <Users className="mb-4 text-primary h-12 w-12" />
                    <h3 className="text-3xl font-black uppercase mb-2 tracking-tighter">Sou Aluno</h3>
                    <p className="text-gray-400 mb-6 font-medium text-sm">Quero treinar, evoluir e encontrar os melhores coaches.</p>
                    <div className="flex items-center text-primary font-bold uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">
                      Acessar agora <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </button>
                  <button onClick={() => setMode("coach")} className="group relative p-8 bg-black/60 backdrop-blur-md border border-white/10 rounded-none hover:border-primary transition-all text-left overflow-hidden shadow-2xl">
                    <Smartphone className="mb-4 text-primary h-12 w-12" />
                    <h3 className="text-3xl font-black uppercase mb-2 tracking-tighter">Sou Coach</h3>
                    <p className="text-gray-400 mb-6 font-medium text-sm">Quero digitalizar minha consultoria e escalar meus resultados.</p>
                    <div className="flex items-center text-primary font-bold uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">
                      Criar meu App <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </button>
                </div>
              )}
            </div>
        </div>
      </section>
      <div className="h-20 bg-background" />
    </div>
  );
};

export default Landing;
