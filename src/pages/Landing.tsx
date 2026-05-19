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
          <a href="#solucoes" className="hover:text-primary transition-colors">Soluções</a>
          <a href="#coaches" className="hover:text-primary transition-colors">Elite Team</a>
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
            {user ? "Dashboard" : "Criar meu App"}
          </Button>
        </div>
      </header>

      {/* Hero Section com Carrossel de Públicos */}
      <section id="solucoes" className="relative h-[100vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="embla overflow-hidden h-full" ref={emblaRef}>
            <div className="embla__container flex h-full">
              {useCases.map((useCase, index) => (
                <div key={index} className="embla__slide relative flex-[0_0_100%] h-full">
                  <img src={useCase.image} alt={useCase.title} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 flex items-center px-6 md:px-24">
                    <div className="max-w-3xl">
                      <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} key={`title-${index}`} transition={{ duration: 0.8, ease: "easeOut" }}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.3em] border rounded-full" style={{ borderColor: `${useCase.color}50`, backgroundColor: `${useCase.color}10`, color: useCase.color }}>
                          <useCase.icon className="w-4 h-4" />
                          {useCase.subtitle}
                        </div>
                        <h2 className="text-6xl md:text-9xl font-black leading-[0.85] mb-8 tracking-tighter uppercase text-white">
                          {useCase.title.split(' ').map((word, i) => (
                            <span key={i} className={i === 0 ? "block" : "block text-primary"}>{word} </span>
                          ))}
                        </h2>
                        <p className="text-xl md:text-2xl text-gray-300 font-medium max-w-xl mb-10 leading-relaxed drop-shadow-lg">{useCase.description}</p>
                        
                        <div className="flex flex-wrap gap-4">
                          <Button onClick={() => setShowSimulador(true)} size="lg" className="h-16 px-10 text-lg font-black uppercase tracking-widest">
                            30 Dias Grátis
                          </Button>
                          <Button variant="outline" onClick={() => {
                            document.getElementById('coaches')?.scrollIntoView({ behavior: 'smooth' });
                          }} size="lg" className="h-16 px-10 text-lg font-black uppercase tracking-widest border-white/20 bg-white/5 backdrop-blur-md">
                            Ver Elite Team
                          </Button>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute bottom-12 left-6 md:left-24 flex gap-3 z-20">
            {useCases.map((_, i) => (
              <div key={i} className={`h-1.5 transition-all duration-500 rounded-full ${i === (emblaApi?.selectedScrollSnap() || 0) ? "w-12 bg-primary" : "w-4 bg-white/20"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* Seção Ganho para o Coach/Profissional */}
      <section className="py-24 bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -mr-64 -mt-64" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-block px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.3em] border border-primary/30 bg-primary/10 text-primary rounded-full">
                Business & Scale
              </div>
              <h2 className="text-5xl md:text-7xl font-black leading-none mb-8 tracking-tighter uppercase">
                SUA CARREIRA NO <span className="text-primary">PRÓXIMO NÍVEL</span>
              </h2>
              <div className="space-y-6">
                {[
                  { icon: Wallet, title: "Escala Financeira", desc: "Atenda 10x mais alunos sem perder a qualidade, automatizando processos e pagamentos." },
                  { icon: Palette, title: "Branding Cinematográfico", desc: "O seu app não é apenas uma ferramenta, é uma extensão de luxo da sua marca pessoal." },
                  { icon: TrendingUp, title: "Retenção de Alunos", desc: "A experiência imersiva e o acompanhamento de IA aumentam a fidelidade dos seus clientes." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-6 group">
                    <div className="shrink-0 w-14 h-14 bg-white/5 border border-white/10 flex items-center justify-center rounded-xl group-hover:border-primary/50 transition-colors">
                      <item.icon className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold uppercase mb-1">{item.title}</h4>
                      <p className="text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-black p-8 border border-white/10 rounded-2xl shadow-2xl">
              <div className="mb-10 text-center">
                <h3 className="text-2xl font-black uppercase mb-2">Simulador de Lucros</h3>
                <p className="text-gray-400 text-sm font-medium">Veja o quanto você pode faturar com o seu App.</p>
              </div>
              
              <div className="space-y-8">
                <div>
                  <div className="flex justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Número de Alunos</span>
                    <span className="text-lg font-black text-primary">{students}</span>
                  </div>
                  <input type="range" min="10" max="500" step="10" value={students} onChange={(e) => setStudents(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>

                <div>
                  <div className="flex justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Ticket Médio Mensal</span>
                    <span className="text-lg font-black text-primary">{formatBRL(price)}</span>
                  </div>
                  <input type="range" min="50" max="1000" step="10" value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary" />
                </div>

                <div className="pt-8 border-t border-white/10 space-y-4">
                  <div className="bg-black/40 p-6 rounded-xl border border-primary/20 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-1">Faturamento Bruto / Mês</p>
                      <h4 className="text-4xl font-black text-white">{formatBRL(students * price)}</h4>
                    </div>
                    <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                      <TrendingUp className="text-primary w-6 h-6" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-4 bg-zinc-800/50 rounded-lg border border-white/5">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase text-gray-400">Taxa Alpha Coach (10%)</span>
                      <span className="text-sm font-bold text-primary">-{formatBRL(students * price * 0.1)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-white/10 pt-2">
                      <span className="text-xs font-black uppercase text-white">Seu Lucro Líquido</span>
                      <span className="text-lg font-black text-green-500">{formatBRL(students * price * 0.9)}</span>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] animate-pulse">
                      Comece agora: 30 dias grátis para testar
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Elite Team Section - Vídeos e Coaches Reais */}
      <section id="coaches" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-4">ELITE <span className="text-primary">TEAM</span></h2>
            <p className="text-gray-400 font-medium uppercase tracking-[0.3em] text-sm">Os maiores profissionais já estão no Alpha Coach</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coaches.map((coach, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className="group relative bg-zinc-900 border border-white/5 overflow-hidden rounded-xl"
              >
                <div className="aspect-[9/16] relative overflow-hidden">
                  {renderScreenMedia(coach.video)}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                  
                  <div className="absolute top-4 left-4">
                    <div className="px-2 py-1 bg-primary text-[8px] font-black tracking-widest rounded-sm">
                      {coach.tag}
                    </div>
                  </div>

                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">{coach.specialty}</p>
                    <h3 className="text-2xl font-black uppercase leading-tight mb-2">{coach.name}</h3>
                    <div className="flex items-center gap-1 text-gray-400 text-[10px] font-bold uppercase">
                      <MapPin className="w-3 h-3" />
                      {coach.cidade}, {coach.estado}
                    </div>
                    <Link to={`/${coach.slug}/site`} className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-primary transition-colors opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                      Ver Perfil <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Simulador App Experience */}
      <section className="py-24 bg-zinc-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full scale-75" />
              <div className="relative mx-auto w-[300px] h-[600px] bg-zinc-900 rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden">
                <DemoAppScreen 
                  brandName={brandName}
                  brandColor={brandColor}
                  mode={simuladorMode}
                />
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-block px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.3em] border border-primary/30 bg-primary/10 text-primary rounded-full">
                App Experience
              </div>
              <h2 className="text-5xl md:text-7xl font-black leading-none mb-8 tracking-tighter uppercase">
                EXPERIMENTE <span className="text-primary">SEU APP</span>
              </h2>
              <p className="text-xl text-gray-400 mb-10 leading-relaxed font-medium">
                Personalize as cores, o nome e veja instantaneamente como o seu app de elite ficará para os seus alunos.
              </p>

              <div className="space-y-8 bg-zinc-900/50 p-8 rounded-2xl border border-white/5 backdrop-blur-md">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 block">Nome da sua Marca</label>
                  <Input 
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className="bg-black/50 border-white/10 h-14 text-lg font-bold uppercase"
                    placeholder="Ex: Team BadBoy"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 block">Identidade Visual</label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                    {BRAND_COLORS.map((color) => (
                      <button
                        key={color.hex}
                        onClick={() => setBrandColor(color.hex)}
                        className={`h-10 rounded-lg transition-all transform hover:scale-110 ${brandColor === color.hex ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110' : 'opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-6">
                  <Button onClick={() => setShowSimulador(true)} className="w-full h-16 text-lg font-black uppercase tracking-widest">
                    Criar meu App Agora
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Minimalista */}
      <footer className="py-12 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <Logo />
          <div className="flex gap-8 text-[10px] font-bold uppercase tracking-widest text-gray-500">
            <a href="#" className="hover:text-primary transition-colors">Termos</a>
            <a href="#" className="hover:text-primary transition-colors">Privacidade</a>
            <a href="#" className="hover:text-primary transition-colors">Suporte</a>
          </div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">
            © 2026 ALPHA COACH. TODOS OS DIREITOS RESERVADOS.
          </p>
        </div>
      </footer>

      {/* Modal Simulador (Simula o App em tela cheia se necessário) */}
      <AnimatePresence>
        {showSimulador && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
          >
            <button 
              onClick={() => setShowSimulador(false)}
              className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <div className="w-full max-w-sm aspect-[9/19.5] relative rounded-[3rem] border-[12px] border-zinc-800 shadow-2xl overflow-hidden bg-black">
              <DemoAppScreen 
                brandName={brandName}
                brandColor={brandColor}
                mode={simuladorMode}
              />
            </div>
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4">
              <Button 
                onClick={() => setMode("coach")}
                className="h-16 px-12 font-black uppercase tracking-widest text-lg"
              >
                Gostei, quero o meu!
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Landing;
