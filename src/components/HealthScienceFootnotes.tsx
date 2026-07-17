import { cn } from "@/lib/utils";

const MEDICAL_DISCLAIMER =
  "Este aplicativo fornece estimativas antropométricas e nutricionais para fins de acompanhamento físico e esportivo. Os resultados gerados não substituem diagnósticos, avaliações médicas profissionais, exames de DEXA ou bioimpedância clínica. Consulte sempre um profissional de saúde antes de iniciar qualquer dieta ou rotina de exercícios.";

type CitationProps = {
  text: string;
  href: string;
  className?: string;
};

function CitationLine({ text, href, className }: CitationProps) {
  return (
    <p className={cn("text-[10px] text-muted-foreground leading-relaxed", className)}>
      {text}{" "}
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary/80 underline underline-offset-2 hover:text-primary"
      >
        Fonte
      </a>
    </p>
  );
}

export function MedicalDisclaimer({ className }: { className?: string }) {
  return (
    <p className={cn("text-[10px] text-muted-foreground/90 leading-relaxed border-l-2 border-primary/30 pl-3", className)}>
      <span className="font-semibold text-muted-foreground">Aviso: </span>
      {MEDICAL_DISCLAIMER}
    </p>
  );
}

export function DietScienceFooter({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 pt-4 mt-6 border-t border-border/50", className)}>
      <CitationLine
        text="Cálculo baseado na equação de Mifflin-St Jeor (Mifflin MD, 1990 – Am J Clin Nutr)."
        href="https://pubmed.ncbi.nlm.nih.gov/2305711/"
      />
      <MedicalDisclaimer />
    </div>
  );
}

type PhysicalEvalVariant = "navy" | "jackson" | "full";

export function PhysicalEvaluationScienceFooter({
  variant,
  className,
  showDisclaimer = true,
}: {
  variant: PhysicalEvalVariant;
  className?: string;
  showDisclaimer?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {(variant === "jackson" || variant === "full") && (
        <CitationLine
          text="Método de dobras cutâneas baseado em Jackson & Pollock (1978 – Br J Nutr)."
          href="https://pubmed.ncbi.nlm.nih.gov/702330/"
        />
      )}
      {(variant === "navy" || variant === "full") && (
        <CitationLine
          text="Método de circunferência da Marinha dos EUA (Hodgdon & Beckett, 1984 – NHRC)."
          href="https://apps.dtic.mil/sti/citations/ADA150196"
        />
      )}
      {showDisclaimer && <MedicalDisclaimer className="mt-2" />}
    </div>
  );
}
