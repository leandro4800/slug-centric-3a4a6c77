import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { ArrowRight, Play, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const coaches = [
  {
    name: "BAD BOY TEAM",
    specialty: "HIPERTROFIA",
    bio: "Método Bad Boy — sem desculpa, sem atalho.",
    video: "https://player.vimeo.com/external/517090025.sd.mp4?s=f5296068e1c6e1a9652a927d149021d7a36c968f&profile_id=165&oauth2_token_id=57447761",
    tag: "VERIFICADO",
  },
  {
    name: "PIKACHU TEAM",
    specialty: "HIPERTROFIA & ESTÉTICA",
    bio: "Treinos cinematográficos pra quem quer crescer.",
    video: "https://player.vimeo.com/external/494252666.sd.mp4?s=7201fd1f99cf39925e01c9a101d36d2466085a67&profile_id=165&oauth2_token_id=57447761",
    tag: "VERIFICADO",
  },
  {
    name: "TEAM JACKSON",
    specialty: "HIPERTROFIA & EMAGRECIMENTO",
    bio: "Performance e estética com método Team Jackson.",
    video: "https://player.vimeo.com/external/392530510.sd.mp4?s=29e6ca6f53e346f043e035f8287e07e60913866d&profile_id=165&oauth2_token_id=57447761",
    tag: "VERIFICADO",
  },
  {
    name: "NUTRI SAMILA DIAS",
    specialty: "EMAGRECIMENTO",
    bio: "Especialista em emagrecimento e saúde.",
    video: "https://player.vimeo.com/external/494252666.sd.mp4?s=7201fd1f99cf39925e01c9a101d36d2466085a67&profile_id=165&oauth2_token_id=57447761",
    tag: "VERIFICADO",
  },
];

const Landing = () => {
  const [showSimulador, setShowSimulador] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-primary selection:text-white overflow-x-hidden">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent backdrop-blur-sm">
        <Logo />
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
          <a href="#coaches" className="hover:text-white transition-colors">Coaches</a>
          <button onClick={() => setShowSimulador(true)} className="hover:text-white transition-colors">Simulador</button>
          <a href="#" className="hover:text-white transition-colors">Recursos</a>
          <a href="#" className="hover:text-white transition-colors">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login">
            <Button variant="ghost" className="text-white hover:bg-white/10">Entrar</Button>
          </Link>
          <Link to="/login">
            <Button className="bg-primary hover:bg-primary/90 text-white px-6">CADASTRAR</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src="https://rmetppilvfrxosvxzhgj.supabase.co/storage/v1/object/public/message-attachments/a73ad678-986d-44b2-9487-bc73eb5d5a24/1777443275624_movv45_WhatsApp_Image_2026-04-24_at_13.32.23.jpeg" 
            alt="Background" 
            className="w-full h-full object-cover opacity-80 scale-105 transition-all duration-700 hover:scale-110"
            style={{ 
              objectPosition: "calc(100% + 120px) center",
              filter: "brightness(0.9) contrast(1.1)"
            }}
          />
          {/* Mobile: overlay escuro forte para legibilidade */}
          <div className="absolute inset-0 bg-black/70 md:hidden" />
          {/* Desktop: gradiente lateral mostra os atletas à direita */}
          <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-black via-black/85 via-30% to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 text-[10px] font-bold uppercase tracking-[0.2em] border border-primary/30 bg-primary/10 text-primary rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Plataforma White-Label para Coaches
            </div>
            
            <h1 className="text-4xl md:text-7xl font-black leading-[0.9] mb-8 tracking-tighter uppercase">
              SEU APP DE <br />
              <span className="text-primary text-glow-primary">CONSULTORIA</span> <br />
              EM MODO CINEMA.
            </h1>
            
            <p className="text-lg md:text-xl text-gray-400 max-w-xl mb-12 leading-relaxed">
              Esqueça planilhas e WhatsApp. Tenha seu próprio aplicativo com treinos, 
              dieta, IA e pagamento automático — tudo com sua marca e seu domínio.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white text-base px-8 h-14 rounded-md font-bold uppercase tracking-wider group">
                <Play className="mr-2 h-4 w-4 fill-current" />
                Quero minha franquia Alpha Coach
              </Button>
              <a href="#coaches">
                <Button size="lg" variant="outline" className="text-white border-white/20 bg-white/5 hover:bg-white/10 text-base px-8 h-14 rounded-md font-medium group">
                  Ver coaches em destaque
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Coaches Section */}
      <section id="coaches" className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight mb-4">
              COACHES EM DESTAQUE
            </h2>
            <div className="h-1 w-20 bg-primary" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {coaches.map((coach, i) => (
            <div 
              key={i} 
              className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-white/5 hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] cursor-pointer"
            >
              {/* Video Background */}
              <video 
                src={coach.video} 
                autoPlay 
                muted 
                loop 
                playsInline
                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
              />
              
              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-end">
                <div className="flex items-center gap-1.5 mb-2">
                  <div className="px-2 py-0.5 bg-primary text-[9px] font-black rounded-sm flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" />
                    {coach.tag}
                  </div>
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
            <Button 
              size="lg" 
              onClick={() => setShowSimulador(true)}
              className="bg-white text-black hover:bg-gray-200 text-base px-10 h-14 rounded-md font-bold uppercase tracking-wider"
            >
              Testar Simulador
            </Button>
          </div>
          
          <div className="relative flex justify-center">
            {/* Phone Frame */}
            <div className="relative w-[300px] h-[600px] bg-zinc-900 rounded-[3rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-zinc-800 rounded-b-xl z-20" />
              <iframe 
                src="/demo/app" 
                className="w-full h-full border-none"
                title="App Preview"
              />
            </div>
            {/* Decorative Elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/30 rounded-full blur-[100px]" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black py-16 px-6">
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
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <button 
            onClick={() => setShowSimulador(false)}
            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors text-4xl font-light"
          >
            ×
          </button>
          <div className="relative w-[320px] h-[650px] bg-zinc-900 rounded-[3rem] border-[10px] border-zinc-800 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-zinc-800 rounded-b-2xl z-20" />
            <iframe 
              src="/demo/app" 
              className="w-full h-full border-none"
              title="App Preview Full"
            />
          </div>
          <div className="hidden lg:block ml-12 max-w-md">
            <h2 className="text-4xl font-black uppercase mb-6 text-primary">MODO SIMULADOR</h2>
            <p className="text-lg text-gray-300 mb-8">
              Experimente a interface que seus alunos terão acesso. 
              Navegue pelos treinos, dietas e veja como a experiência 
              Alpha Coach transforma a consultoria online.
            </p>
            <div className="p-6 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm text-gray-400 italic">
                "O design focado em mobile garante que seu aluno 
                tenha a melhor experiência direto no celular, 
                onde quer que ele esteja treinando."
              </p>
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
      `}</style>
    </div>
  );
};

export default Landing;