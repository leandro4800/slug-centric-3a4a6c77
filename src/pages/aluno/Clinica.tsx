import { useState } from "react";
import { Stethoscope, Upload, FlaskConical, Send, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/aluno/PageHeader";
import { useBranding } from "@/contexts/BrandingProvider";
import heroDefault from "@/assets/hero-default.jpg";

const Clinica = () => {
  const [tab, setTab] = useState<"nova" | "clinica">("nova");
  const { tenant } = useBranding();
  const hero = tenant?.hero_url || heroDefault;

  const actions = [
    { icon: Upload, title: "ENVIAR PROTOCOLO OU EXAME", sub: "PDF, Imagem, Word ou Texto", dashed: true },
    { icon: FlaskConical, title: "RELATAR PROTOCOLO", sub: "Descreva substâncias, dosagens e ciclos em uso." },
    { icon: Send, title: "COLAR EXAMES MANUALMENTE", sub: "Digite ou cole seus resultados laboratoriais." },
  ];

  return (
    <div className="border border-border rounded-3xl m-3 overflow-hidden">
      <div className="relative h-52">
        <img src={hero} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
        <div className="absolute bottom-4 left-5 right-5">
          <p className="text-xs text-accent font-semibold tracking-wider">${(tenant?.nome || "TIME").toUpperCase()} ORIGINALS</p>
          <h1 className="font-display text-3xl mt-1 leading-tight">CENTRO DE ANÁLISE<br />METABÓLICA</h1>
        </div>
      </div>

      <div className="px-5 pb-6">
        <div className="flex bg-secondary rounded-xl p-1 mb-5">
          <button
            onClick={() => setTab("nova")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider ${
              tab === "nova" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            Nova análise
          </button>
          <button
            onClick={() => setTab("clinica")}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold uppercase tracking-wider ${
              tab === "clinica" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            Clínica
          </button>
        </div>

        <div className="space-y-3">
          {actions.map((a) => (
            <button
              key={a.title}
              className={`w-full bg-card/40 ${a.dashed ? "border-dashed" : ""} border border-accent/40 rounded-2xl p-4 flex items-center gap-4 text-left`}
            >
              <div className="w-12 h-12 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center shrink-0">
                <a.icon className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <p className="font-display text-base">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-accent" />
            </button>
          ))}
        </div>

        <div className="bg-card/40 border border-border rounded-2xl p-5 mt-5">
          <h3 className="font-display text-base mb-3">COMO FUNCIONA</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li>1. Envie seu exame (PDF, foto ou texto)</li>
            <li>2. O sistema extrai APENAS os dados reais do documento</li>
            <li>3. Acesse a aba <span className="text-accent font-bold">CLÍNICA</span> para ver os cards de monitoramento</li>
          </ol>
        </div>

        <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 mt-4 text-xs text-accent">
          <p className="font-bold">AVISO</p>
        </div>
      </div>
    </div>
  );
};

export default Clinica;
