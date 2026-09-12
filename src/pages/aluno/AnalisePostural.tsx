import { useMemo, useRef, useState } from "react";
import { PersonStanding, Upload, X, Image as ImageIcon } from "lucide-react";
import { PageHeader } from "@/components/aluno/PageHeader";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ViewKey = "frente" | "costas" | "lado";

interface CapturedPhoto {
  file: File;
  previewUrl: string;
}

const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: "frente", label: "Frente", hint: "De frente para a câmera, postura natural" },
  { key: "costas", label: "Costas", hint: "De costas, braços relaxados ao lado do corpo" },
  { key: "lado", label: "Perfil (lado)", hint: "De lado, olhando para frente" },
];

const AnalisePostural = () => {
  const { tenant } = useBranding();
  const [photos, setPhotos] = useState<Record<ViewKey, CapturedPhoto | null>>({
    frente: null,
    costas: null,
    lado: null,
  });
  const inputsRef = useRef<Record<ViewKey, HTMLInputElement | null>>({
    frente: null,
    costas: null,
    lado: null,
  });

  const totalCapturadas = useMemo(
    () => VIEWS.filter((v) => photos[v.key]).length,
    [photos],
  );

  const handleSelect = (view: ViewKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Envie uma foto (imagem).");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPhotos((prev) => {
      const old = prev[view];
      if (old) URL.revokeObjectURL(old.previewUrl);
      return { ...prev, [view]: { file, previewUrl } };
    });
  };

  const removePhoto = (view: ViewKey) => {
    setPhotos((prev) => {
      const old = prev[view];
      if (old) URL.revokeObjectURL(old.previewUrl);
      return { ...prev, [view]: null };
    });
  };

  return (
    <div className="pb-32 min-h-screen bg-background">
      <PageHeader
        icon={PersonStanding}
        title="ANÁLISE POSTURAL"
        subtitle={tenant?.nome || "MEU TIME"}
      />

      <div className="px-5 space-y-6">
        <div className="bg-card/40 border border-border rounded-xl p-5">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Envie três fotos — frente, costas e perfil — para registrar sua postura.
            Use roupas justas, fique em pé com postura natural e enquadre o corpo
            inteiro, dos pés à cabeça, em um fundo neutro.
          </p>
        </div>

        <div className="grid gap-4">
          {VIEWS.map((v) => {
            const captured = photos[v.key];
            return (
              <div
                key={v.key}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="w-20 h-24 rounded-xl bg-secondary border border-border overflow-hidden flex items-center justify-center shrink-0 relative">
                  {captured ? (
                    <>
                      <img
                        src={captured.previewUrl}
                        alt={`Foto ${v.label}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(v.key)}
                        aria-label={`Remover foto ${v.label}`}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-white hover:bg-black transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <ImageIcon className="h-7 w-7 text-muted-foreground/50" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-display text-base uppercase tracking-wide text-foreground">
                    {v.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {v.hint}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2 font-bold uppercase tracking-widest text-[10px]"
                    onClick={() => inputsRef.current[v.key]?.click()}
                  >
                    <Upload className="h-3.5 w-3.5 mr-1.5" />
                    {captured ? "Trocar foto" : "Enviar foto"}
                  </Button>
                  <input
                    ref={(el) => (inputsRef.current[v.key] = el)}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => handleSelect(v.key, e)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-widest text-xs h-12 shadow-glow"
          disabled={totalCapturadas === 0}
          onClick={() =>
            toast.info(
              "Fotos prontas. Falta definir como a análise deve ser feita conforme o material de referência.",
            )
          }
        >
          Analisar postura ({totalCapturadas}/{VIEWS.length})
        </Button>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          A análise automática ainda não foi configurada. Assim que as orientações
          de avaliação forem definidas, o resultado aparecerá aqui.
        </p>
      </div>
    </div>
  );
};

export default AnalisePostural;
