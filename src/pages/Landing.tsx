import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Dumbbell, Users, Palette, BarChart3 } from "lucide-react";
import hero from "@/assets/hero-default.jpg";

const features = [
  { icon: Palette, title: "White-label total", desc: "Sua marca, suas cores, seu domínio. Cada coach com seu próprio app." },
  { icon: Users, title: "Gestão de elenco", desc: "Acompanhe alunos, evolução, biomarcadores e prescrições num só lugar." },
  { icon: Dumbbell, title: "Experiência premium", desc: "Interface estilo streaming. Seus alunos consomem treino como conteúdo." },
  { icon: BarChart3, title: "Multi-tenant nativo", desc: "Cada time isolado e seguro, escalando do primeiro ao milésimo aluno." },
];

const Landing = () => (
  <div className="min-h-screen bg-background text-foreground">
    {/* Nav */}
    <header className="absolute top-0 left-0 right-0 z-20 px-6 md:px-12 py-6 flex items-center justify-between">
      <Logo />
      <div className="flex items-center gap-3">
        <Link to="/login"><Button variant="ghost">Entrar</Button></Link>
        <Link to="/login"><Button className="bg-gradient-primary shadow-glow">Começar agora</Button></Link>
      </div>
    </header>

    {/* Hero */}
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
      <div className="relative z-10 max-w-5xl mx-auto px-6 md:px-12 py-32">
        <span className="inline-block px-3 py-1 mb-6 text-xs uppercase tracking-widest border border-primary/40 text-primary rounded-full">
          SaaS Multi-Tenant para Coaches
        </span>
        <h1 className="font-display text-6xl md:text-8xl leading-[0.9] mb-6">
          A PLATAFORMA<br />
          DOS <span className="text-gradient-primary">COACHES</span><br />
          DE ELITE.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">
          AlphaCoach é a infraestrutura white-label que coaches usam para entregar
          treinos, dietas e acompanhamento numa experiência tão imersiva quanto a Netflix.
        </p>
        <div className="flex flex-wrap gap-4">
          <Link to="/login">
            <Button size="lg" className="bg-gradient-primary shadow-glow text-base px-8 h-14">
              Acessar plataforma <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <Link to="/demo/app">
            <Button size="lg" variant="outline" className="text-base px-8 h-14 border-border">
              Ver demo
            </Button>
          </Link>
        </div>
      </div>
    </section>

    {/* Features */}
    <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
      <h2 className="font-display text-4xl md:text-5xl mb-16 text-center">
        TUDO QUE VOCÊ PRECISA. <span className="text-primary">NADA QUE VOCÊ NÃO PRECISE.</span>
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f) => (
          <div key={f.title} className="bg-gradient-card border border-border rounded-2xl p-6 shadow-card hover:border-primary/40 transition-all duration-300">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
              <f.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-xl mb-2">{f.title}</h3>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>

    <footer className="border-t border-border py-8 px-6 text-center text-sm text-muted-foreground">
      <Logo size={28} /> <span className="block mt-3">© {new Date().getFullYear()} AlphaCoach 1.0 — Todos os direitos reservados.</span>
    </footer>
  </div>
);

export default Landing;
