import { LifeBuoy, MessageCircle, Users, ExternalLink } from "lucide-react";

const TUTORIAIS = [
  { titulo: "1. Configuração inicial do painel", desc: "O que você precisa para configurar e começar." },
  { titulo: "2. Como cadastrar alunos", desc: "Passo a passo de cadastro e envio de credenciais." },
  { titulo: "3. Como montar treinos e dietas", desc: "Use a IA para criar protocolos personalizados." },
  { titulo: "4. Avaliação física — 7 dobras", desc: "Como aplicar Jackson & Pollock no painel." },
];

const Suporte = () => (
  <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
    <div className="text-center">
      <LifeBuoy className="h-10 w-10 text-primary mx-auto mb-2" />
      <h1 className="font-display text-3xl uppercase italic tracking-tighter">Suporte</h1>
      <p className="text-sm text-muted-foreground">Encontre tutoriais e entre em contato com nossa equipe.</p>
    </div>

    <div className="rounded-2xl border border-border/50 bg-card p-5 space-y-3">
      <h2 className="font-display text-sm uppercase tracking-wider">Tutoriais em destaque</h2>
      {TUTORIAIS.map((t) => (
        <div key={t.titulo} className="flex items-center justify-between rounded-xl border border-border/40 bg-background/40 p-4">
          <div className="min-w-0">
            <p className="text-sm font-bold">{t.titulo}</p>
            <p className="text-xs text-muted-foreground">{t.desc}</p>
          </div>
          <button disabled className="text-xs uppercase tracking-wider text-muted-foreground opacity-60">Em breve</button>
        </div>
      ))}
    </div>

    <div className="grid sm:grid-cols-2 gap-4">
      <a
        href="https://wa.me/" target="_blank" rel="noreferrer"
        className="group rounded-2xl border border-border/50 bg-card p-5 hover:border-primary transition-colors"
      >
        <MessageCircle className="h-6 w-6 text-primary mb-2" />
        <p className="font-bold text-sm">Suporte via WhatsApp</p>
        <p className="text-xs text-muted-foreground">Canal oficial — fale com o time AlphaCoach.</p>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary mt-3">
          Abrir <ExternalLink className="h-3 w-3" />
        </span>
      </a>
      <a
        href="#" className="group rounded-2xl border border-border/50 bg-card p-5 hover:border-primary transition-colors"
      >
        <Users className="h-6 w-6 text-primary mb-2" />
        <p className="font-bold text-sm">Comunidade AlphaCoach</p>
        <p className="text-xs text-muted-foreground">Atualizações, novidades e comunicados oficiais.</p>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary mt-3">
          Em breve <ExternalLink className="h-3 w-3" />
        </span>
      </a>
    </div>
  </div>
);

export default Suporte;
