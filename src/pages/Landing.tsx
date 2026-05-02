import { Link, useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Play, CheckCircle2, Mail, Lock, X, Video, Wallet, Palette, TrendingUp, Smartphone, Users, UserRound, MapPin, Search as SearchIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

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

const videoLibrary = [
  { title: "Agachamento livre", video: "/videos/alpha-treino.mp4" },
  { title: "Refeição pré-treino", video: "/videos/alpha-nutricao.mp4" },
  { title: "Evolução do aluno", video: "/videos/alpha-evolucao.mp4" },
  { title: "Análise postural", video: "/videos/alpha-postural.mp4" },
];

interface DemoAppScreenProps {
  mode?: "home" | "treino" | "stats";
  brandName?: string;
  brandColor?: string; // hex
}

const DemoAppScreen = ({ mode = "home", brandName = "Seu Coach Team", brandColor = "#E00000" }: DemoAppScreenProps) => (
  <div
    className="h-full w-full overflow-hidden bg-background text-foreground"
    style={{ ["--brand" as any]: brandColor }}
  >
    <div className="relative h-56 overflow-hidden bg-card">
      <video src="/videos/alpha-treino.mp4" autoPlay muted loop playsInline className="h-full w-full object-cover opacity-90" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      <div className="absolute left-5 right-5 bottom-5">
        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: brandColor }}>{brandName}</p>
        <h3 className="mt-1 text-3xl font-black uppercase leading-none">Plano Elite</h3>
      </div>
    </div>

    <div className="space-y-4 p-5">
      <div className="grid grid-cols-3 gap-2">
        {["Treino", "Dieta", "Check-in"].map((item) => (
          <div key={item} className="rounded-none border border-white/10 bg-card/50 p-3 text-center">
            <p className="text-[9px] font-black uppercase tracking-wide text-white">{item}</p>
          </div>
        ))}
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ borderColor: `${brandColor}55`, backgroundColor: `${brandColor}1A` }}
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-black uppercase">{mode === "stats" ? "Evolução" : "Treino de hoje"}</p>
          <span className="rounded px-2 py-1 text-[9px] font-black" style={{ backgroundColor: brandColor }}>AO VIVO</span>
        </div>
        <div className="space-y-2">
          {["Supino inclinado", "Remada curvada", "Agachamento livre"].map((item, i) => (
            <div key={item} className="flex items-center justify-between rounded-lg bg-background p-3">
              <span className="text-xs font-bold text-gray-200">{item}</span>
              <span className="text-[10px] font-black" style={{ color: brandColor }}>{i + 3}x12</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-none border border-white/10 bg-card/50 p-4">
          <p className="text-2xl font-black" style={{ color: brandColor }}>87%</p>
          <p className="text-[10px] uppercase text-gray-400">Adesão semanal</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-card p-4">
          <p className="text-2xl font-black" style={{ color: brandColor }}>+4kg</p>
          <p className="text-[10px] uppercase text-gray-400">Carga média</p>
        </div>
      </div>
    </div>
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

const BRAND_COLORS = [
  { name: "Bordeaux", hex: "#5E2129" },
  { name: "Heritage Blue", hex: "#202C39" },
  { name: "Old Gold", hex: "#BAA174" },
  { name: "Forest Green", hex: "#22302A" },
  { name: "Aubergine", hex: "#3A2B38" },
  { name: "Graphite", hex: "#1F1F1F" },
];

const Landing = () => {
  const [mode, setMode] = useState<"choice" | "aluno" | "coach" | null>(null);
  const [showSimulador, setShowSimulador] = useState(false);
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
  
  // Aluno state
  const [hasCoachLink, setHasCoachLink] = useState<boolean | null>(null);
  const [coachLink, setCoachLink] = useState("");
  const [searchCoach, setSearchCoach] = useState("");
  const [searchRegion, setSearchRegion] = useState("");

  const stateMap: Record<string, string> = {
    "acre": "AC", "alagoas": "AL", "amapa": "AP", "amazonas": "AM", "bahia": "BA", "ceara": "CE",
    "distrito federal": "DF", "espirito santo": "ES", "espírito santo": "ES", "goias": "GO", "goiás": "GO",
    "maranhao": "MA", "maranhão": "MA", "mato grosso": "MT", "mato grosso do sul": "MS", 
    "minas gerais": "MG", "para": "PA", "pará": "PA", "paraiba": "PB", "paraíba": "PB", 
    "parana": "PR", "paraná": "PR", "pernambuco": "PE", "piaui": "PI", "piauí": "PI", 
    "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", 
    "rondonia": "RO", "rondônia": "RO", "roraima": "RR", "santa catarina": "SC",
    "sao paulo": "SP", "são paulo": "SP", "sergipe": "SE", "tocantins": "TO"
  };
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const grossRevenue = students * price;
  const fee = grossRevenue * 0.1;
  const netRevenue = grossRevenue - fee;
  const yearlyNet = netRevenue * 12;

  const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  useEffect(() => {
    const loadCoaches = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("nome, tagline, bio, hero_url, foto_url, especialidades, cidade, estado, slug")
        .eq("status", "approved")
        .limit(8);
      
      if (data && data.length > 0) {
        const mapped = data.map(d => ({
          name: d.nome,
          specialty: (d.especialidades && d.especialidades.length > 0) ? d.especialidades[0] : (d.tagline || ""),
          bio: d.bio || "",
          video: d.hero_url || d.foto_url || "https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777474299562_rgnobx_Treino_de_b_ceps____....._reels__gym__workout__academia__treino.mp4",
          tag: "VERIFICADO",
          cidade: d.cidade || "",
          estado: d.estado || "",
          slug: d.slug
        }));
        setCoaches(mapped);
      }
    };

    void loadCoaches();

    const savedEmail = localStorage.getItem("simulator_email");
    if (savedEmail) {
      setIsUnlocked(true);
    }
  }, []);

  const filteredCoaches = coaches.filter(c => {
    const qLower = searchCoach.toLowerCase().trim();
    const regionLower = searchRegion.toLowerCase().trim();
    
    const queryMatch = !qLower || 
      c.name.toLowerCase().includes(qLower) ||
      c.specialty.toLowerCase().includes(qLower);
    
    let regionMatch = !regionLower;
    if (regionLower) {
      const stateAbbrFromFull = stateMap[regionLower];
      const terms = regionLower.split(/[\s,.-]+/).filter(t => t.length > 0);
      
      regionMatch = terms.every(term => {
        const termStateAbbr = stateMap[term] || term;
        return (
          c.cidade?.toLowerCase().includes(term) ||
          c.estado?.toLowerCase().includes(term) ||
          c.estado?.toLowerCase() === termStateAbbr.toLowerCase()
        );
      }) || (
        c.cidade?.toLowerCase().includes(regionLower) ||
        c.estado?.toLowerCase().includes(regionLower) ||
        c.estado?.toLowerCase() === stateAbbrFromFull?.toLowerCase()
      );
    }
    
    return queryMatch && regionMatch;
  });

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      toast({
        title: "E-mail inválido",
        description: "Por favor, insira um e-mail válido para continuar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { error } = await supabase.from("leads").insert([{ email: normalizedEmail }]);
      if (error && error.code !== "23505") {
        console.warn("Lead capture skipped:", error.message);
      }

      localStorage.setItem("simulator_email", normalizedEmail);
      setIsUnlocked(true);
      setShowSimulador(true);
      toast({
        title: "Acesso Liberado!",
        description: "Agora você pode simular a experiência do seu app.",
      });
    } catch (error) {
      console.error("Error saving lead:", error);
      localStorage.setItem("simulator_email", email.trim().toLowerCase());
      setIsUnlocked(true);
      setShowSimulador(true);
      toast({
        title: "Acesso liberado",
        description: "Não consegui salvar o lead agora, mas o simulador foi liberado.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoachLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (coachLink) {
      // If it's a full URL, try to extract the slug
      const slug = coachLink.split("/").pop();
      if (slug) {
        navigate(`/${slug}`);
      }
    }
  };

  const handleSearchCoach = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCoach) {
      const featuredSection = document.getElementById('coaches-featured');
      if (featuredSection) {
        featuredSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(`/marketplace?q=${encodeURIComponent(searchCoach)}`);
      }
    }
  };

  const handleSearchRegion = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchRegion) {
      const featuredSection = document.getElementById('coaches-featured');
      if (featuredSection) {
        featuredSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate(`/marketplace?region=${encodeURIComponent(searchRegion)}`);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm border-b border-white/10">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm font-bold uppercase tracking-widest text-gray-300">
          <a href="#coaches" className="hover:text-primary transition-colors">Coaches</a>
          <button onClick={() => setShowSimulador(true)} className="hover:text-primary transition-colors">Simulador</button>
          <a href="#" className="hover:text-primary transition-colors">Recursos</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" className="text-white hover:bg-white/10 hidden md:flex font-bold uppercase tracking-wider">Entrar</Button>
          </Link>
          <Button 
            onClick={() => setShowSimulador(true)}
            className="px-6 font-black uppercase tracking-widest"
          >
            TESTAR AGORA
          </Button>
        </div>
      </header>



      {/* Hero / Choice Section */}
      <section className="relative min-h-[90vh] md:min-h-screen flex items-center pt-20 overflow-hidden">
        {/* Mobile Background (Athletes) */}
        <div className="absolute inset-0 z-0 md:hidden">
          <img 
            src="https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777443275624_movv45_WhatsApp_Image_2026-04-24_at_13.32.23.jpeg" 
            alt="Atletas" 
            className="w-full h-[50vh] object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-background" />
        </div>

        {/* Desktop Background */}
        <div className="absolute inset-0 z-0 hidden md:block">
          <img 
            src="https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777443275624_movv45_WhatsApp_Image_2026-04-24_at_13.32.23.jpeg" 
            alt="Background" 
            className="w-full h-full object-cover opacity-90 scale-105 transition-all duration-[10000ms] animate-slow-zoom"
            style={{ 
              objectPosition: "calc(100% + 150px) center",
              filter: "brightness(1.1) contrast(1.1)"
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 via-40% to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full mt-[50vh] md:mt-[40vh]">
          {!mode ? (
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-7xl font-black leading-[0.9] mb-12 tracking-tighter uppercase">
                BEM-VINDO AO <br />
                <span className="text-primary text-glow-primary text-8xl md:text-9xl">ALPHA COACH</span>
              </h1>
              
              <div className="grid md:grid-cols-2 gap-8 mt-12">
                <button 
                  onClick={() => setMode("aluno")}
                  className="group relative p-8 bg-background/80 border border-white/10 rounded-none hover:border-primary transition-all text-left overflow-hidden shadow-card"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <UserRound size={120} />
                  </div>
                  <Users className="mb-4 text-primary h-12 w-12" />
                  <h3 className="text-3xl font-black uppercase mb-2 tracking-tighter">Sou Aluno</h3>
                  <p className="text-gray-400 mb-6 font-medium text-sm">Quero treinar, evoluir e encontrar os melhores coaches.</p>
                  <div className="flex items-center text-primary font-bold uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">
                    Acessar agora <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </button>

                <button 
                  onClick={() => setMode("coach")}
                  className="group relative p-8 bg-background/80 border border-white/10 rounded-sm hover:border-primary transition-all text-left overflow-hidden shadow-card"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={120} />
                  </div>
                  <Smartphone className="mb-4 text-primary h-12 w-12" />
                  <h3 className="text-3xl font-black uppercase mb-2 tracking-tighter">Sou Coach</h3>
                  <p className="text-gray-400 mb-6 font-medium text-sm">Quero digitalizar minha consultoria e escalar meus resultados.</p>
                  <div className="flex items-center text-primary font-bold uppercase tracking-widest text-xs group-hover:translate-x-2 transition-transform">
                    Criar meu App <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
                </button>
              </div>
            </div>
          ) : mode === "aluno" ? (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setMode(null)} className="text-primary font-bold uppercase tracking-wider mb-8 flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ArrowRight className="h-4 w-4 rotate-180" /> Voltar
              </button>
              
              <h2 className="text-4xl md:text-6xl font-black leading-[0.9] mb-8 tracking-tighter uppercase">
                ENCONTRE SEU <span className="text-primary">COACH</span>
              </h2>

              {hasCoachLink === null ? (
                <div className="space-y-6">
                  <p className="text-xl text-gray-400 mb-8 font-medium">Você já possui o link direto do seu coach?</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button onClick={() => setHasCoachLink(true)} size="lg" className="h-16 px-8 text-lg uppercase font-black">
                      Sim, eu tenho o link
                    </Button>
                    <Button onClick={() => setHasCoachLink(false)} size="lg" variant="outline" className="h-16 px-8 text-lg uppercase font-black border-white/20">
                      Não, quero procurar um
                    </Button>
                  </div>
                </div>
              ) : hasCoachLink === true ? (
                <form onSubmit={handleCoachLinkSubmit} className="space-y-6 animate-in zoom-in-95 duration-300">
                  <p className="text-xl text-gray-400 font-medium">Cole o link do seu coach abaixo para acessar diretamente:</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Input 
                      value={coachLink}
                      onChange={(e) => setCoachLink(e.target.value)}
                      placeholder="alphacoach.app/seucoach" 
                      className="h-16 bg-secondary/50 border-white/10 text-xl font-bold"
                      autoFocus
                    />
                    <Button type="submit" size="lg" className="h-16 px-8 font-black uppercase tracking-widest">
                      Acessar Coach
                    </Button>
                  </div>
                  <button onClick={() => setHasCoachLink(false)} className="text-sm text-gray-400 hover:text-white transition-colors uppercase font-bold tracking-widest">
                    Ainda não tenho um coach
                  </button>
                </form>
              ) : (
                <div className="space-y-10 animate-in zoom-in-95 duration-300">
                  <div className="space-y-4">
                    <p className="text-xl text-gray-400 font-medium uppercase tracking-widest text-xs font-black">Procurar por nome</p>
                    <form onSubmit={handleSearchCoach} className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input 
                          value={searchCoach}
                          onChange={(e) => setSearchCoach(e.target.value)}
                          placeholder="Nome do coach ou equipe..." 
                          className="h-16 pl-12 bg-secondary/50 border-white/10 text-xl font-bold"
                        />
                      </div>
                      <Button type="submit" size="lg" className="h-16 px-8 font-black uppercase tracking-widest">
                        Buscar
                      </Button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <p className="text-xl text-gray-400 font-medium uppercase tracking-widest text-xs font-black">Marketplace: Encontrar por região (Aulas avulsas)</p>
                    <form onSubmit={handleSearchRegion} className="flex flex-col sm:flex-row gap-4">
                      <div className="relative flex-1">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input 
                          value={searchRegion}
                          onChange={(e) => setSearchRegion(e.target.value)}
                          placeholder="Cidade ou estado..." 
                          className="h-16 pl-12 bg-secondary/50 border-white/10 text-xl font-bold"
                        />
                      </div>
                      <Button type="submit" size="lg" variant="outline" className="h-16 px-8 font-black uppercase tracking-widest border-primary/50 text-primary">
                        Ver no Mapa
                      </Button>
                    </form>
                  </div>
                  
                  <Link to="/marketplace">
                    <Button variant="link" className="text-white p-0 h-auto text-sm font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">
                      Ver todos os coaches em destaque <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
              <button onClick={() => setMode(null)} className="text-primary font-bold uppercase tracking-wider mb-8 flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ArrowRight className="h-4 w-4 rotate-180" /> Voltar
              </button>

              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 md:mb-8 text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/30 bg-primary/10 text-primary rounded-md">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Plataforma White-Label para Coaches
              </div>
              
              <h1 className="text-4xl md:text-7xl font-black leading-[0.9] mb-6 md:mb-8 tracking-tighter uppercase">
                SEU APP DE <br className="hidden md:block" />
                <span className="text-primary text-glow-primary">CONSULTORIA</span> <br className="hidden md:block" />
                EM MODO CINEMA.
              </h1>
              
              <p className="text-lg md:text-xl text-gray-400 max-w-xl mb-10 md:mb-12 leading-relaxed font-medium">
                Esqueça planilhas e WhatsApp. Tenha seu próprio aplicativo com treinos, 
                dieta, IA e pagamento automático — tudo com sua marca e seu domínio.
              </p>
              
              <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                <Link to="/seja-coach" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto px-8 h-16 font-black uppercase tracking-widest group">
                    <Play className="mr-2 h-4 w-4 fill-current" />
                    Quero minha franquia Alpha Coach
                  </Button>
                </Link>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full px-8 h-16 font-black tracking-widest group uppercase border-white/20">
                    Já sou coach — Entrar
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>





      {/* Features Section */}
      <section className="py-24 px-6 md:px-12 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-4">MUDE O JOGO DA SUA CONSULTORIA</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Tudo o que você precisa para escalar seu negócio e oferecer uma experiência de elite.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-card/50 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle2 className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4 uppercase">TREINOS CINEMATOGRÁFICOS</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Vídeos em 4K com execuções perfeitas, cronômetro inteligente e histórico de cargas automático.</p>
            </div>
            <div className="p-8 bg-card/50 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle2 className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4 uppercase">DIETA POR IA</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Cálculo de macros, sugestões de cardápios e lista de compras inteligente integrada ao perfil do aluno.</p>
            </div>
            <div className="p-8 bg-card/50 rounded-2xl border border-white/5 hover:border-primary/30 transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-6">
                <CheckCircle2 className="text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-4 uppercase">PAGAMENTO AUTOMÁTICO</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Receba pelo app via PIX ou Cartão com renovação recorrente. Gestão financeira completa e simples.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Coaches Section (BELOW FEATURES) */}
      <section id="coaches-featured" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
              COACHES EM DESTAQUE
            </h2>
            <div className="h-1 w-20 bg-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredCoaches.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-card/30 rounded-2xl border border-white/5">
              <p className="text-gray-500 font-bold uppercase tracking-widest">Nenhum coach encontrado nesta região.</p>
              <Button 
                variant="link" 
                onClick={() => {setSearchRegion(""); setSearchCoach("");}}
                className="text-primary mt-2"
              >
                Limpar filtros
              </Button>
            </div>
          ) : filteredCoaches.map((coach, i) => (
            <div 
              key={i} 
              className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-card border border-white/5 hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer"
            >
              {/* Video Background */}
              {coach.video.includes('instagram.com') ? (
                <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
                  <iframe
                    src={`https://www.social-embed.com/api/instagram/reel?url=${encodeURIComponent(coach.video)}&autoplay=true&muted=true&loop=true`}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                    frameBorder="0"
                  />
                </div>
              ) : (
                <video 
                  src={coach.video} 
                  autoPlay 
                  muted 
                  loop 
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                />
              )}
              
              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-background/40 group-hover:bg-transparent transition-colors duration-500" />
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <div className="px-2 py-0.5 bg-primary text-[9px] font-black rounded-sm flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {coach.tag}
                  </div>
                  {coach.cidade && (
                    <div className="px-2 py-0.5 bg-white/10 text-[9px] font-black rounded-sm flex items-center gap-1 uppercase">
                      <MapPin className="h-2.5 w-2.5 text-primary" />
                      {coach.cidade}, {coach.estado}
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-black uppercase mb-1 group-hover:text-primary transition-colors">
                  {coach.name}
                </h3>
                <p className="text-[10px] font-bold text-primary mb-3 tracking-widest uppercase">
                  {coach.specialty}
                </p>
                
                <div className="max-h-0 group-hover:max-h-20 overflow-hidden transition-all duration-500">
                  <p className="text-sm text-gray-300 line-clamp-2">
                    {coach.bio}
                  </p>
                  <Button variant="link" className="text-white p-0 h-auto mt-4 text-xs font-bold uppercase tracking-tighter">
                    Conhecer o app <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Antes vs Depois */}
      <section className="py-24 px-6 md:px-12 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-4">A VIRADA DE CHAVE</h2>
            <div className="h-1 w-20 bg-primary mx-auto" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-8 md:p-10 bg-background border border-white/5 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-950/30 rounded-full blur-3xl" />
              <div className="relative">
                <span className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2 block">Antes do Alpha Coach</span>
                <h3 className="text-2xl md:text-3xl font-black uppercase mb-8 text-gray-400">
                  Planilhas, PDF e caos no WhatsApp
                </h3>
                <ul className="space-y-4">
                  {[
                    "Aluno perdido no grupo do WhatsApp",
                    "Cobrar mensalidade no PIX um por um",
                    "Treino em PDF que ninguém abre",
                    "Vídeo de execução? Manda no privado.",
                    "Zero controle de evolução",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-500">
                      <X className="h-5 w-5 text-red-900 flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="p-8 md:p-10 bg-gradient-to-br from-primary/10 to-background border border-primary/30 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl" />
              <div className="relative">
                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">Com Alpha Coach</span>
                <h3 className="text-2xl md:text-3xl font-black uppercase mb-8 text-white">
                  Organização total. Interface de cinema.
                </h3>
                <ul className="space-y-4">
                  {[
                    "App próprio com sua marca e seu domínio",
                    "Pagamento automático via Stripe Connect",
                    "Treinos com vídeo HD em alta qualidade",
                    "Dr.IA pra responder dúvidas dos alunos 24h",
                    "Dashboard de evolução em tempo real",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-200">
                      <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Simulador de Lucros */}
      <section className="py-24 px-6 md:px-12 bg-background">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/30 bg-primary/10 text-primary rounded-md">
              <TrendingUp className="h-3 w-3" />
              Simulador de Lucros
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-4">
              VEJA QUANTO VOCÊ PODE <span className="text-primary text-glow-primary">FATURAR</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Deslize as barras e veja o quanto cai na sua conta — já com a taxa Alpha Coach descontada.
            </p>
          </div>

          <div className="bg-background border border-white/10 rounded-2xl p-6 md:p-10">
            <div className="space-y-8 mb-10">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-300">Alunos ativos</label>
                  <span className="text-2xl font-black text-primary">{students}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  value={students}
                  onChange={(e) => setStudents(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1 uppercase">
                  <span>1</span><span>1.000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold uppercase tracking-wider text-gray-300">Mensalidade</label>
                  <span className="text-2xl font-black text-primary">{formatBRL(price)}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="10"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1 uppercase">
                  <span>R$ 100</span><span>R$ 2.000</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="p-5 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Faturamento bruto / mês</p>
                <p className="text-2xl font-black text-white">{formatBRL(grossRevenue)}</p>
              </div>
              <div className="p-5 bg-white/5 rounded-xl border border-white/5">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Taxa Alpha Coach (10%)</p>
                <p className="text-2xl font-black text-gray-400">-{formatBRL(fee)}</p>
              </div>
              <div className="p-5 bg-primary/10 rounded-xl border border-primary/30">
                <p className="text-[10px] uppercase tracking-widest text-primary mb-2">Líquido na sua conta / mês</p>
                <p className="text-2xl font-black text-primary text-glow-primary">{formatBRL(netRevenue)}</p>
              </div>
            </div>

            <div className="text-center pt-4 border-t border-white/5">
              <p className="text-sm text-gray-400">
                Em 12 meses: <span className="text-white font-black text-lg ml-2">{formatBRL(yearlyNet)}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sua marca, suas regras */}
      <section className="py-24 px-6 md:px-12 bg-background">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/30 bg-primary/10 text-primary rounded-md">
              <Palette className="h-3 w-3" />
              White Label
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-4 leading-tight">
              SUA MARCA, <br />
              <span className="text-primary">SUAS REGRAS.</span>
            </h2>
            <p className="text-lg text-gray-400 mb-4">Esqueça apps genéricos.</p>
            <p className="text-gray-400 mb-10 leading-relaxed">
              Aqui o logo é seu, as cores são suas, o vídeo de fundo é seu — e o domínio também:{" "}
              <span className="text-primary font-mono font-bold">alpha-coach.app/seunome</span>
            </p>
            <ul className="space-y-4">
              {[
                "Subdomínio personalizado incluso",
                "Tema visual 100% editável (cores, fontes, vídeos)",
                "Splash screen e ícone com sua marca",
                "Página pública pra captar novos alunos",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="relative overflow-hidden bg-background border border-primary/30 rounded-2xl p-8 shadow-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_10%,hsl(var(--primary)/0.22),transparent_38%)]" />
              <div className="relative flex items-center gap-2 mb-6 pb-4 border-b border-white/10">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-white/70" />
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="ml-4 text-xs text-gray-500 font-mono">alpha-coach.app/seunome</span>
              </div>
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center font-black text-white">SC</div>
                  <div className="flex-1">
                    <p className="font-bold uppercase tracking-wide">Seu Coach Team</p>
                    <p className="text-xs text-gray-500">Powered by Alpha Coach</p>
                  </div>
                  <div className="px-2 py-1 bg-primary/20 text-primary text-[10px] font-bold rounded">PRO</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="aspect-square bg-card border border-primary/30 rounded-lg flex items-center justify-center shadow-lg">
                    <p className="text-[9px] font-bold text-center px-1">TREINOS</p>
                  </div>
                  <div className="aspect-square bg-card border border-white/10 rounded-lg flex items-center justify-center shadow-lg">
                    <p className="text-[9px] font-bold text-center px-1">DIETA</p>
                  </div>
                  <div className="aspect-square bg-card border border-primary/30 rounded-lg flex items-center justify-center shadow-lg">
                    <p className="text-[9px] font-bold text-center px-1">EVOLUÇÃO</p>
                  </div>
                </div>
                <div className="h-32 bg-card border border-white/10 rounded-lg flex flex-col items-center justify-center gap-2">
                  <Smartphone className="h-10 w-10 text-primary" />
                  <p className="text-xs text-gray-300 font-semibold">App próprio com sua marca</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div className="p-3 bg-background/40 border border-white/5 rounded-lg">
                    <p className="text-2xl font-black text-primary">+128</p>
                    <p className="text-[10px] text-gray-500 uppercase">Alunos ativos</p>
                  </div>
                  <div className="p-3 bg-background/40 border border-white/5 rounded-lg">
                    <p className="text-2xl font-black text-primary">R$ 24k</p>
                    <p className="text-[10px] text-gray-500 uppercase">Faturamento/mês</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/30 rounded-full blur-[100px]" />
          </div>
        </div>
      </section>

      {/* Telas Personalizadas Section */}
      <section className="py-24 px-6 md:px-12 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/30 bg-primary/10 text-primary rounded-md">
              <Video className="h-3 w-3" />
              App Personalizado
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-4">
              TENHA SEUS PRÓPRIOS <br />
              <span className="text-primary text-glow-primary">VÍDEOS PERSONALIZADOS.</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Configure as telas do seu aplicativo com seus próprios vídeos e imagens. 
              Visualize em tempo real como seu conteúdo exclusivo aparecerá para seus alunos.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-10 items-start">
            {/* Simulator Controls */}
            <div className="lg:col-span-1 space-y-4 bg-background/50 p-6 rounded-2xl border border-white/10 lg:sticky lg:top-24">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-white border-b border-white/10 pb-3 mb-4">Configuração</h3>
              
              <div className="space-y-4">
                {[
                  { id: 1, val: screen1, set: setScreen1 },
                  { id: 2, val: screen2, set: setScreen2 },
                  { id: 3, val: screen3, set: setScreen3 },
                  { id: 4, val: screen4, set: setScreen4 },
                ].map((s) => (
                  <div key={s.id}>
                    <label className="block text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-1.5">Tela 0{s.id}</label>
                    <Input 
                      value={s.val}
                      onChange={(e) => s.set(e.target.value)}
                      placeholder="URL da mídia..."
                      className="bg-secondary border-white/10 text-white focus:border-primary text-[10px] h-9"
                    />
                  </div>
                ))}

                <div className="pt-2">
                  <Button 
                    onClick={() => {
                      toast({
                        title: "App Atualizado",
                        description: "As 4 telas foram configuradas com sucesso.",
                      });
                    }}
                    className="w-full bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-wider h-10 text-[10px]"
                  >
                    ATUALIZAR APP
                  </Button>
                </div>
              </div>
            </div>

            {/* Device Previews - 4 Phones */}
            <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 justify-items-center">
              {[
                { url: screen1, label: "Treino" },
                { url: screen2, label: "Nutrição" },
                { url: screen3, label: "Check-in" },
                { url: screen4, label: "Comunidade" }
              ].map((screen, idx) => (
                <div key={idx} className="relative group w-full max-w-[240px]">
                  <div className="absolute -inset-1 bg-primary/20 rounded-[2.5rem] blur-lg opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                  <div className="relative aspect-[9/19] w-full bg-background rounded-[2.5rem] border-[5px] border-secondary shadow-2xl overflow-hidden ring-1 ring-white/10">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-4 bg-secondary rounded-b-lg z-20" />
                    
                    <div className="h-full w-full relative z-10 bg-secondary">
                      {renderScreenMedia(screen.url)}
                    </div>
                    
                    {/* UI Overlay */}
                    <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <div className="absolute bottom-6 left-0 right-0 px-5 z-30">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className="w-1 h-1 rounded-full bg-primary" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-white">{screen.label}</p>
                      </div>
                      <div className="h-0.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-1/3" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center">
                    <p className="text-[9px] font-bold text-gray-600 uppercase tracking-[0.3em]">Screen 0{idx + 1}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Paz de espírito financeira */}
      <section className="py-24 px-6 md:px-12 bg-background">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/30 bg-primary/10 text-primary rounded-md">
              <Wallet className="h-3 w-3" />
              Pagamentos
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase mb-4 leading-tight">
              PAZ DE ESPÍRITO <br />
              <span className="text-primary">FINANCEIRA.</span>
            </h2>
            <p className="text-lg text-white font-bold mb-4">Divisão automática de pagamentos.</p>
            <p className="text-gray-400 leading-relaxed">
              Você vende por R$ 200 e R$ 180 caem direto na sua conta. 
              Sem cobrar aluno por WhatsApp, sem conferir comprovante de PIX, sem atraso.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-6 bg-background border border-white/10 rounded-xl">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Aluno paga no app</p>
                <p className="text-3xl font-black text-white">R$ 200</p>
              </div>
              <Smartphone className="h-10 w-10 text-gray-700" />
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-primary rotate-90" />
            </div>

            <div className="flex items-center justify-between p-4 bg-background/50 border border-white/5 rounded-xl">
              <p className="text-[10px] uppercase tracking-widest text-gray-500">Taxa Alpha Coach</p>
              <p className="text-xl font-bold text-gray-500">- R$ 20</p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-primary rotate-90" />
            </div>

            <div className="flex items-center justify-between p-6 bg-gradient-to-br from-primary/20 to-background border border-primary/40 rounded-xl">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-primary mb-1">Cai na sua conta</p>
                <p className="text-3xl font-black text-primary text-glow-primary">R$ 180</p>
              </div>
              <Wallet className="h-10 w-10 text-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* App Preview / Simulador Section */}
      <section className="py-24 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6 md:px-12 grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-6xl font-black uppercase mb-8 leading-tight">
              A EXPERIÊNCIA <br />
              <span className="text-primary">CINEMATOGRÁFICA</span> <br />
              QUE SEUS ALUNOS MERECEM.
            </h2>
            <ul className="space-y-6 mb-10">
              {[
                "Interface estilo streaming super intuitiva",
                "Vídeos de execução em alta definição",
                "Acompanhamento de dieta e macros",
                "Chat direto e notificações push",
                "Gestão de evolução com fotos e medidas"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-400">
                  <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  <span className="text-lg">{item}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                onClick={() => setShowSimulador(true)}
                className="bg-white text-black hover:bg-gray-200 text-base px-10 h-14 rounded-md font-bold uppercase tracking-wider"
              >
                Testar Simulador
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10 text-base px-10 h-14 rounded-md font-bold uppercase tracking-wider"
              >
                Falar com consultor
              </Button>
            </div>
          </div>
          
          <div className="relative flex justify-center">
            {/* Phone Stack Effect */}
            <div className="relative">
              {/* Back Phone */}
              <div className="absolute -left-12 top-10 w-[240px] h-[480px] bg-background rounded-[2.5rem] border-[6px] border-zinc-800 shadow-2xl overflow-hidden opacity-100 rotate-[-10deg] hidden md:block">
                <DemoAppScreen mode="stats" brandName={brandName} brandColor={brandColor} />
              </div>
              
              {/* Main Phone */}
              <div className="relative w-[300px] h-[600px] bg-background rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden z-10">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-xl z-20" />
                {isUnlocked ? (
                  <DemoAppScreen mode="home" brandName={brandName} brandColor={brandColor} />
                ) : (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                    <Lock className="h-10 w-10 text-primary mb-4" />
                    <p className="text-sm font-bold uppercase mb-6">Acesso Bloqueado</p>
                    <Button onClick={() => setShowSimulador(true)} size="sm" className="bg-primary">Liberar com Email</Button>
                  </div>
                )}
              </div>

              {/* Front Phone */}
              <div className="absolute -right-12 bottom-10 w-[240px] h-[480px] bg-background rounded-[2.5rem] border-[6px] border-zinc-800 shadow-2xl overflow-hidden opacity-100 rotate-[10deg] hidden md:block z-20">
                <DemoAppScreen mode="treino" brandName={brandName} brandColor={brandColor} />
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/30 rounded-full blur-[100px]" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-background py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Logo size={40} />
            <p className="text-gray-500 text-sm max-w-xs text-center md:text-left">
              A maior infraestrutura tecnológica para coaches de elite do Brasil.
            </p>
          </div>
          
          <div className="flex gap-12">
            <div className="flex flex-col gap-4">
              <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Plataforma</h4>
              <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Preços</a>
              <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Funcionalidades</a>
              <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Segurança</a>
            </div>
            <div className="flex flex-col gap-4">
              <h4 className="font-bold uppercase text-xs tracking-widest text-gray-400">Legal</h4>
              <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Privacidade</a>
              <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Termos</a>
              <a href="#" className="text-sm text-gray-500 hover:text-white transition-colors">Cookies</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-white/5 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} ALPHA COACH 1.0 — TODOS OS DIREITOS RESERVADOS.
        </div>
      </footer>

      {/* Simulador Modal Overlay */}
      {showSimulador && (
        <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4">
          <button 
            onClick={() => setShowSimulador(false)}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors text-4xl font-light z-[110]"
          >
            ×
          </button>
          
          <div className="flex flex-col lg:flex-row items-center gap-12 max-w-6xl w-full">
            <div className="relative w-[280px] md:w-[320px] h-[580px] md:h-[650px] bg-background rounded-[3rem] border-[10px] border-zinc-800 shadow-2xl overflow-hidden shrink-0">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-800 rounded-b-2xl z-20" />
              {!isUnlocked ? (
                <div className="absolute inset-0 z-30 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center">
                  <Lock className="h-12 w-12 text-primary mb-6 animate-pulse" />
                  <h3 className="text-xl font-bold uppercase mb-4 tracking-tighter">Área Restrita</h3>
                  <p className="text-sm text-gray-400 mb-8">
                    Insira seu e-mail para desbloquear o simulador e ver como seu app ficará.
                  </p>
                  <form onSubmit={handleUnlock} className="w-full space-y-4">
                    <Input 
                      type="email" 
                      placeholder="seu@email.com" 
                      className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 h-12"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <Button 
                      type="submit" 
                      className="w-full bg-primary hover:bg-primary/90 h-12 font-bold uppercase"
                      disabled={isLoading}
                    >
                      {isLoading ? "Liberando..." : "Liberar Acesso"}
                    </Button>
                  </form>
                </div>
              ) : (
                <DemoAppScreen mode="home" brandName={brandName} brandColor={brandColor} />
              )}
            </div>

            <div className="max-w-md w-full text-center lg:text-left">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 mb-6 text-[10px] font-bold uppercase tracking-[0.2em] border rounded-md"
                style={{ borderColor: `${brandColor}55`, backgroundColor: `${brandColor}1A`, color: brandColor }}
              >
                {isUnlocked ? "Personalize ao vivo" : "Modo Simulador"}
              </div>
              <h2 className="text-3xl md:text-5xl font-black uppercase mb-6 leading-[0.9]">
                {isUnlocked ? (
                  <>SEU APP, <span className="text-glow-primary" style={{ color: brandColor }}>SUA MARCA.</span></>
                ) : (
                  <>VEJA SEU APP EM <span className="text-primary text-glow-primary">AÇÃO.</span></>
                )}
              </h2>

              {!isUnlocked ? (
                <>
                  <p className="text-base md:text-lg text-gray-300 mb-8 leading-relaxed">
                    Navegue pelas funcionalidades exclusivas: treinos cinematográficos,
                    dieta personalizada e interface de alto nível.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <CheckCircle2 className="h-5 w-5 text-primary mb-3" />
                      <h4 className="font-bold text-sm uppercase mb-1">Mobile First</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Experiência Fluida</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                      <Mail className="h-5 w-5 text-primary mb-3" />
                      <h4 className="font-bold text-sm uppercase mb-1">Sem Senha</h4>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wider">Acesso Imediato</p>
                    </div>
                  </div>
                  <p className="mt-8 text-xs text-gray-500 italic">
                    * Ao informar seu email, você concorda com nossos termos de uso.
                  </p>
                </>
              ) : (
                <div className="space-y-6">
                  <p className="text-sm md:text-base text-gray-400 leading-relaxed">
                    Mude o nome do seu time e a cor principal — veja o app reagir em tempo real ao lado.
                  </p>

                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      Nome do seu time
                    </label>
                    <Input
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value.slice(0, 28))}
                      placeholder="Ex: Wolf Team"
                      className="bg-white/5 border-white/10 text-white h-12 font-bold uppercase tracking-wider"
                    />
                  </div>

                  <div className="space-y-3 text-left">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                      Cor da marca
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {BRAND_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setBrandColor(c.hex)}
                          className={`h-10 w-10 rounded-full border-2 transition-transform hover:scale-110 ${
                            brandColor === c.hex ? "border-white scale-110" : "border-white/20"
                          }`}
                          style={{ backgroundColor: c.hex }}
                          aria-label={c.name}
                          title={c.name}
                        />
                      ))}
                      <label
                        className="h-10 w-10 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center cursor-pointer hover:border-white/60 transition-colors relative overflow-hidden"
                        title="Cor personalizada"
                      >
                        <Palette className="h-4 w-4 text-white/70" />
                        <input
                          type="color"
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      Selecionada: <span style={{ color: brandColor }}>{brandColor}</span>
                    </p>
                  </div>

                  <Link to="/login" className="block">
                    <Button className="w-full h-12 font-bold uppercase tracking-wider" style={{ backgroundColor: brandColor }}>
                      Quero meu app assim
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Styles */}
      <style>{`
        .text-glow-primary {
          text-shadow: 0 0 30px rgba(229, 9, 20, 0.5);
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
        @keyframes slow-zoom {
          0% { transform: scale(1.05) translateX(0); }
          50% { transform: scale(1.12) translateX(-10px); }
          100% { transform: scale(1.05) translateX(0); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 20s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Landing;
