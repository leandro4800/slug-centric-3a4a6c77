import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Play, CheckCircle2, Mail, Lock, X, Video, Wallet, Palette, TrendingUp, Smartphone, Users, UserRound, MapPin, Search as SearchIcon, KeyRound, Dumbbell, Apple, Sword, Zap, FileText, Ruler, Camera, LineChart, MessagesSquare, Sparkles } from "lucide-react";
import cardTreinoImg from "@/assets/card-treino.jpg";
import cardDietaImg from "@/assets/card-dieta.jpg";
import cardEvolucaoImg from "@/assets/card-evolucao.jpg";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { PRIVACY_POLICY_URL } from "@/lib/app-url";
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
    video: "/videos/pikachu-team.mp4",
    tag: "VERIFICADO",
    cidade: "Serra",
    estado: "ES",
    slug: "pikachu-team"
  },
  {
    name: "TEAM JACKSON",
    specialty: "HIPERTROFIA & EMAGRECIMENTO",
    bio: "Performance e estética com método Team Jackson.",
    video: "https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/branding/ca38c1a1-06b8-4549-9bfa-f06603ac08e9/login-1778201125522.mov",
    tag: "VERIFICADO",
    cidade: "Serra",
    estado: "ES",
    slug: "team-jackson"
  },
  {
    name: "BADBOY TEAM",
    specialty: "ESTÉTICA & PERFORMANCE",
    bio: "Metodologia Badboy para resultados extremos.",
    video: "https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/branding/8c64bb80-9bed-45ff-bc0a-f4d1a2841d1c/login-1778205723254.mp4",
    tag: "VERIFICADO",
    cidade: "São Paulo",
    estado: "SP",
    slug: "badboy-team"
  },
  {
    name: "NUTRI SAMILA DIAS",
    specialty: "NUTRIÇÃO ESPORTIVA",
    bio: "Especialista em emagrecimento e saúde.",
    video: "https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/vlog_videos/5996d70b-9293-4c49-b143-42a4b60af267/1777921328726-83d10724.mp4",
    tag: "VERIFICADO",
    cidade: "Serra",
    estado: "ES",
    slug: "samila-dias"
  }
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
    image: "https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1779211949278_n2q6qo_Screenshot_30.png",
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
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <img
          src="https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1779216281370_7dlm0f_Screenshot_31.png"
          alt="App Alpha Coach"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/10" />
        <div className="absolute left-6 right-6 bottom-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1" style={{ color: brandColor }}>{brandName}</p>
          <h3 className="text-3xl font-black uppercase leading-none mb-2">BEM-VINDO, CHAMP</h3>
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Hoje é dia de braço e foco total.</p>
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

const filterEmptyCoaches = (coaches: CoachData[]) => {
  return coaches.filter(coach => coach.name && (coach.video || coach.bio));
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
  const [screen1, setScreen1] = useState("https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/branding/6c4ff89c-3d9f-4225-ae95-5bf1dbf35886/login-1779888616746.mp4");
  const [screen2, setScreen2] = useState("https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/branding/ca38c1a1-06b8-4549-9bfa-f06603ac08e9/login-1778201125522.mov");
  const [screen3, setScreen3] = useState("https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/branding/8c64bb80-9bed-45ff-bc0a-f4d1a2841d1c/login-1778205723254.mp4");
  const [screen4, setScreen4] = useState("https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/vlog_videos/5996d70b-9293-4c49-b143-42a4b60af267/1777921328726-83d10724.mp4");
  const [coaches, setCoaches] = useState<CoachData[]>(defaultCoaches);
  const [hasCoachLink, setHasCoachLink] = useState<boolean | null>(null);
  const [coachLink, setCoachLink] = useState("");
  const [searchCoach, setSearchCoach] = useState("");
  const [searchRegion, setSearchRegion] = useState("");
  const [trialTarget, setTrialTarget] = useState<string>("/seja-coach");

  useEffect(() => {
    if (!user) { setTrialTarget("/seja-coach"); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tenants")
        .select("status")
        .eq("owner_user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      // Coach já dono de painel: vai direto para o admin do site (NUNCA para o app)
      if (data) setTrialTarget("/site/admin/dashboard");
      else setTrialTarget("/seja-coach");
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

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
        .select("nome, tagline, bio, hero_url, foto_url, logo_url, especialidades, cidade, estado, slug, login_video_url")
        .eq("status", "approved");
      
      if (data) {
        // Slugs to exclude to avoid duplicates or problematic cards
        const excludedSlugs = ["alpha-coach", "nutrisamiladias", "alphateam", "metodojackson", "badboyteam"];
        
        const mapped = data
          .filter(d => !excludedSlugs.includes(d.slug))
          .map(d => ({ 
            name: d.nome, 
            specialty: (d.especialidades && d.especialidades.length > 0) ? d.especialidades[0] : (d.tagline || ""), 
            bio: d.bio || "", 
            video: d.hero_url || d.foto_url || d.login_video_url || d.logo_url || "", 
            tag: "VERIFICADO", 
            cidade: d.cidade || "", 
            estado: d.estado || "", 
            slug: d.slug 
          }));
        
        // Combine with defaultCoaches, ensuring no duplicates by name
        const combined = [...defaultCoaches];
        mapped.forEach(m => {
          const isDuplicate = combined.some(c => 
            c.name.toLowerCase().includes(m.name.toLowerCase()) || 
            m.name.toLowerCase().includes(c.name.toLowerCase())
          );
          if (!isDuplicate) {
            combined.push(m);
          }
        });
        
        setCoaches(combined);
      } else {
        setCoaches(defaultCoaches);
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

  const [coachModalOpen, setCoachModalOpen] = useState(false);
  const [coachSlugError, setCoachSlugError] = useState("");
  const [coachLookupLoading, setCoachLookupLoading] = useState(false);

  const handleCoachLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCoachSlugError("");
    const raw = coachLink.trim();
    if (!raw) {
      setCoachSlugError("Informe o link ou slug do seu coach.");
      return;
    }
    // Aceita URL completa ou slug puro
    let slug = raw;
    try {
      if (raw.includes("/")) {
        const cleaned = raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
        const parts = cleaned.split("/").filter(Boolean);
        slug = parts[parts.length - 1] === "site" ? parts[parts.length - 2] : parts[parts.length - 1];
      }
    } catch {}
    slug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!slug) {
      setCoachSlugError("Slug inválido.");
      return;
    }
    setCoachLookupLoading(true);
    try {
      const { data } = await supabase
        .from("tenants")
        .select("slug")
        .eq("slug", slug)
        .eq("status", "approved")
        .maybeSingle();
      if (!data) {
        setCoachSlugError("Coach não encontrado. Verifique o link e tente novamente.");
        return;
      }
      setCoachModalOpen(false);
      navigate(`/${data.slug}`);
    } finally {
      setCoachLookupLoading(false);
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
          <Link to={trialTarget} className="hidden md:inline-flex">
            <Button
              variant="outline"
              className="border-primary/40 bg-primary/10 text-white hover:bg-primary/20 font-bold uppercase tracking-wider"
            >
              <UserRound className="mr-2 h-4 w-4" /> {user ? "Meu painel" : "Testar por R$ 1"}
            </Button>
          </Link>
          <Link to={trialTarget}>
            <Button className="px-6 font-black uppercase tracking-widest">
              {user ? "Acessar painel" : "Começar 30 dias Grátis"}
            </Button>
          </Link>
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
                          <Button onClick={() => navigate(trialTarget)} size="lg" className="h-16 px-10 text-lg font-black uppercase tracking-widest">
                            {user ? "Acessar meu painel" : "Começar 30 Dias Grátis"}
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

      {/* Features — Tudo o que o coach entrega dentro do app */}
      <section id="recursos" className="py-24 bg-background relative overflow-hidden border-t border-white/5">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-primary/5 rounded-full blur-[140px]" />
        <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <div className="inline-block px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.3em] border border-primary/30 bg-primary/10 text-primary rounded-full">
              Recursos da Plataforma
            </div>
            <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-6 leading-none">
              TUDO O QUE VOCÊ PRECISA <span className="text-primary">EM UM SÓ APP</span>
            </h2>
            <p className="text-lg md:text-xl text-gray-400 font-medium leading-relaxed">
              Da planilha ao Instagram, da avaliação física à comunidade — o Alpha Coach entrega o pacote completo de ferramentas premium que fazem você atender como uma equipe inteira sozinho.
            </p>
          </div>

          {/* Feature grid — bento style */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
            {/* Planilhas de treino em PDF */}
            <div className="md:col-span-4 relative group rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 min-h-[380px]">
              <img src={cardTreinoImg} alt="Planilhas de treino em PDF premium" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-tr from-black via-black/70 to-transparent" />
              <div className="relative p-8 md:p-10 h-full flex flex-col justify-end">
                <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center mb-4">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Planilhas em PDF</p>
                <h3 className="text-3xl md:text-4xl font-black uppercase leading-none mb-3">TREINO CINEMATOGRÁFICO EM PDF</h3>
                <p className="text-gray-300 max-w-lg leading-relaxed">
                  Gere planilhas de treino premium em segundos — modelo escuro estilo Netflix ou claro clean, com as cores da sua marca, link direto para o vídeo de cada exercício no YouTube e observações inteligentes para o aluno.
                </p>
              </div>
            </div>

            {/* Avaliação física / 7 dobras */}
            <div className="md:col-span-2 relative group rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-900 to-black min-h-[380px] p-8 flex flex-col justify-between">
              <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center">
                <Ruler className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Avaliação Física</p>
                <h3 className="text-2xl md:text-3xl font-black uppercase leading-none mb-3">7 DOBRAS COM IA</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Protocolo Jackson & Pollock em PDF profissional. Importe a foto do avaliador físico e a IA preenche os campos automaticamente.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> IA Integrada
              </div>
            </div>

            {/* Templates Instagram */}
            <div className="md:col-span-2 relative group rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-primary/20 via-zinc-900 to-black min-h-[380px] p-8 flex flex-col justify-between">
              <div className="w-12 h-12 bg-primary/25 border border-primary/40 rounded-xl flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Marketing</p>
                <h3 className="text-2xl md:text-3xl font-black uppercase leading-none mb-3">STORIES PRONTOS PRO INSTAGRAM</h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Templates personalizados com sua marca, evolução de alunos e frases de impacto. É só baixar e postar.
                </p>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/70">
                <Sparkles className="w-3.5 h-3.5 text-primary" /> Gerador Automático
              </div>
            </div>

            {/* Evolução do aluno */}
            <div className="md:col-span-4 relative group rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 min-h-[380px]">
              <img src={cardEvolucaoImg} alt="Acompanhamento de evolução" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-700" />
              <div className="absolute inset-0 bg-gradient-to-tl from-black via-black/70 to-transparent" />
              <div className="relative p-8 md:p-10 h-full flex flex-col justify-end">
                <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center mb-4">
                  <LineChart className="w-6 h-6 text-primary" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Evolução</p>
                <h3 className="text-3xl md:text-4xl font-black uppercase leading-none mb-3">ACOMPANHAMENTO DE PROGRESSO</h3>
                <p className="text-gray-300 max-w-lg leading-relaxed">
                  Check-ins com fotos, gráficos de evolução, comparativo antes/depois, histórico de cargas e avaliações — o aluno vê o resultado em tempo real e você retém mais tempo.
                </p>
              </div>
            </div>

            {/* Vídeos próprios */}
            <div className="md:col-span-3 relative group rounded-2xl overflow-hidden border border-white/10 bg-black min-h-[320px]">
              <video src="https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/branding/ca38c1a1-06b8-4549-9bfa-f06603ac08e9/login-1778201125522.mov" autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
              <div className="relative p-8 md:p-10 h-full flex flex-col justify-end">
                <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center mb-4">
                  <Video className="w-6 h-6 text-primary" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Vlogs & Vídeos</p>
                <h3 className="text-2xl md:text-3xl font-black uppercase leading-none mb-3">SEUS PRÓPRIOS VÍDEOS DE TREINO</h3>
                <p className="text-gray-300 max-w-md leading-relaxed">
                  Poste seus vlogs, vídeos de execução e conteúdo exclusivo direto na home do app do aluno.
                </p>
              </div>
            </div>

            {/* App personalizado */}
            <div className="md:col-span-3 relative group rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-900 via-black to-primary/10 min-h-[320px]">
              <img src="https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1779216281370_7dlm0f_Screenshot_31.png" alt="App personalizado" className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-70 group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
              <div className="relative p-8 md:p-10 h-full flex flex-col justify-end max-w-md">
                <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Branding Total</p>
                <h3 className="text-2xl md:text-3xl font-black uppercase leading-none mb-3">APP 100% PERSONALIZADO</h3>
                <p className="text-gray-300 leading-relaxed">
                  Sua logo, suas cores, seu nome. O aluno abre o app e vê a SUA marca — não a nossa.
                </p>
              </div>
            </div>

            {/* Dieta / Nutrição */}
            <div className="md:col-span-2 relative group rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 min-h-[300px]">
              <img src={cardDietaImg} alt="Dietas personalizadas" className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
              <div className="relative p-8 h-full flex flex-col justify-end">
                <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center mb-3">
                  <Apple className="w-6 h-6 text-primary" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Nutrição</p>
                <h3 className="text-xl md:text-2xl font-black uppercase leading-none mb-2">DIETA COM MACROS TABELA TACO</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Prescreva, importe PDFs e a IA calcula os macros com precisão TACO.
                </p>
              </div>
            </div>

            {/* Comunidade */}
            <div className="md:col-span-2 relative group rounded-2xl overflow-hidden border border-white/10 bg-gradient-to-br from-zinc-900 to-black min-h-[300px] p-8 flex flex-col justify-between">
              <div className="w-12 h-12 bg-primary/15 border border-primary/30 rounded-xl flex items-center justify-center">
                <MessagesSquare className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">Comunidade</p>
                <h3 className="text-xl md:text-2xl font-black uppercase leading-none mb-2">FEED SOCIAL EXCLUSIVO</h3>
                <p className="text-gray-400 leading-relaxed text-sm">
                  Seus alunos postam evolução, interagem entre si e criam uma tribo em torno da sua marca. Engajamento vira retenção.
                </p>
              </div>
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-primary to-red-800" />
                <div className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-amber-500 to-red-600" />
                <div className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-zinc-600 to-zinc-900" />
                <div className="w-8 h-8 rounded-full border-2 border-black bg-primary/30 flex items-center justify-center text-[10px] font-black">+</div>
              </div>
            </div>

            {/* IA & Automação */}
            <div className="md:col-span-2 relative group rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/20 via-black to-black min-h-[300px] p-8 flex flex-col justify-between">
              <div className="w-12 h-12 bg-primary/30 border border-primary/50 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-2">IA Alpha</p>
                <h3 className="text-xl md:text-2xl font-black uppercase leading-none mb-2">CADASTRO E MONTAGEM POR IA</h3>
                <p className="text-gray-300 leading-relaxed text-sm">
                  Foto ou texto viram cadastro completo. Treino e dieta gerados em segundos com a metodologia Alpha Coach.
                </p>
              </div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/60">
                Exclusivo Alpha Pro
              </div>
            </div>
          </div>

          <div className="text-center mt-16">
            <Button onClick={() => navigate(trialTarget)} size="lg" className="h-16 px-12 text-lg font-black uppercase tracking-widest">
              {user ? "Acessar meu painel" : "Testar tudo grátis por 30 dias"}
            </Button>
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
            {filterEmptyCoaches(coaches).map((coach, i) => (
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
                    <Link to={`/${coach.slug}`} className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:text-primary transition-colors opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
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
            <a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Privacidade</a>
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
