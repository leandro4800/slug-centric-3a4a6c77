import { useMemo, useRef, useState } from "react";
import { PersonStanding, Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/aluno/PageHeader";
import { useBranding } from "@/contexts/BrandingProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ViewKey = "frente" | "costas" | "lado";

interface CapturedPhoto {
  file: File;
  previewUrl: string;
}

interface RecomendacaoTreino {
  foco: string;
  exercicios: string[];
  series_repeticoes: string;
}

interface AnaliseResultado {
  resumo_postural: string;
  desvios_por_vista: { frontal: string[]; posterior: string[]; lateral: string[] };
  desequilibrios_musculares: { encurtados: string[]; enfraquecidos: string[] };
  impacto_funcional: string;
  recomendacoes_treino: RecomendacaoTreino[];
  metas_curto_medio_prazo: string[];
}

const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: "frente", label: "Frente", hint: "De frente para a câmera, postura natural" },
  { key: "costas", label: "Costas", hint: "De costas, braços relaxados ao lado do corpo" },
  { key: "lado", label: "Perfil (lado)", hint: "De lado, olhando para frente" },
];

// Ordem enviada à função: frontal, posterior, lateral
const VIEW_TO_FIELD: Record<ViewKey, "foto_frontal_path" | "foto_posterior_path" | "foto_lateral_path"> = {
  frente: "foto_frontal_path",
  costas: "foto_posterior_path",
  lado: "foto_lateral_path",
};

function extFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

const AnalisePostural = () => {
  const { tenant } = useBranding();
  const [photos, setPhotos] = useState<Record<ViewKey, CapturedPhoto | null>>({
    frente: null,
    costas: null,
    lado: null,
  });
  const [analisando, setAnalisando] = useState(false);
  const [resultado, setResultado] = useState<AnaliseResultado | null>(null);
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

  const handleAnalisar = async () => {
    if (totalCapturadas < VIEWS.length) {
      toast.error("Envie as três fotos (frente, costas e lado) antes de analisar.");
      return;
    }

    setAnalisando(true);
    setResultado(null);
    try {
      const { data: sessionData } = await supabase.auth.getUser();
      const alunoId = sessionData.user?.id;
      if (!alunoId) {
        toast.error("Sessão expirada. Entre novamente para continuar.");
        return;
      }

      const tenantId = (tenant as { id?: string } | null)?.id;
      if (!tenantId) {
        toast.error("Não foi possível identificar seu time. Recarregue a página e tente de novo.");
        return;
      }

      // uuid apenas para agrupar as 3 fotos no storage
      const analiseId = crypto.randomUUID();

      const paths: Partial<Record<"foto_frontal_path" | "foto_posterior_path" | "foto_lateral_path", string>> = {};

      for (const v of VIEWS) {
        const captured = photos[v.key]!;
        const ext = extFromFile(captured.file);
        const path = `${alunoId}/${analiseId}/${v.key}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("fotos_posturais")
          .upload(path, captured.file, {
            contentType: captured.file.type || "image/jpeg",
            upsert: true,
          });
        if (uploadError) {
          throw new Error(`Falha ao enviar a foto (${v.label}): ${uploadError.message}`);
        }
        paths[VIEW_TO_FIELD[v.key]] = path;
      }

      const { data, error } = await supabase.functions.invoke("analyze-posture", {
        body: {
          tenant_id: tenantId,
          aluno_id: alunoId,
          foto_frontal_path: paths.foto_frontal_path,
          foto_posterior_path: paths.foto_posterior_path,
          foto_lateral_path: paths.foto_lateral_path,
        },
      });

      if (error) {
        const ctx = (error as { context?: { status?: number } }).context;
        const status = ctx?.status;
        if (status === 429) {
          toast.error("Você atingiu o limite de análises posturais deste mês.");
        } else if (status === 402) {
          toast.error("Créditos de IA insuficientes para gerar a análise agora.");
        } else {
          toast.error("Não foi possível gerar a análise. Tente novamente em instantes.");
        }
        return;
      }

      if (data?.error) {
        if (data.error === "limite_mensal_atingido") {
          toast.error("Você atingiu o limite de análises posturais deste mês.");
        } else {
          toast.error(typeof data.error === "string" ? data.error : "Não foi possível gerar a análise.");
        }
        return;
      }

      setResultado(data as AnaliseResultado);
      toast.success("Análise postural concluída.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao analisar a postura.";
      toast.error(msg);
    } finally {
      setAnalisando(false);
    }
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
                    disabled={analisando}
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
          disabled={totalCapturadas < VIEWS.length || analisando}
          onClick={handleAnalisar}
        >
          {analisando ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analisando...
            </>
          ) : (
            `Analisar postura (${totalCapturadas}/${VIEWS.length})`
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center leading-relaxed border border-border rounded-lg p-3 bg-card/40">
          Este software é uma ferramenta de apoio educacional e de acompanhamento físico-esportivo. Não fornece diagnósticos médicos ou clínicos. A interpretação dos dados é de responsabilidade exclusiva do profissional habilitado.
        </p>

        {!resultado && !analisando && (
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            Envie as três fotos para gerar sua análise postural. Este recurso é
            educacional e funcional — não substitui avaliação de um profissional de saúde.
          </p>
        )}

        {resultado && (
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-display text-sm uppercase tracking-widest text-foreground mb-2">
                Resumo postural
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {resultado.resumo_postural}
              </p>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h2 className="font-display text-sm uppercase tracking-widest text-foreground">
                Desvios por vista
              </h2>
              {([
                ["Frontal", resultado.desvios_por_vista?.frontal],
                ["Posterior", resultado.desvios_por_vista?.posterior],
                ["Lateral", resultado.desvios_por_vista?.lateral],
              ] as [string, string[] | undefined][]).map(([label, itens]) => (
                <div key={label}>
                  <p className="text-xs font-bold uppercase tracking-wide text-foreground">
                    {label}
                  </p>
                  {itens && itens.length > 0 ? (
                    <ul className="mt-1 space-y-1">
                      {itens.map((item, i) => (
                        <li key={i} className="text-sm text-muted-foreground leading-snug">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground/70">Sem desvios relevantes.</p>
                  )}
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground mb-1">
                  Músculos encurtados
                </h3>
                {resultado.desequilibrios_musculares?.encurtados?.length ? (
                  <ul className="space-y-1">
                    {resultado.desequilibrios_musculares.encurtados.map((m, i) => (
                      <li key={i} className="text-sm text-muted-foreground leading-snug">• {m}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground/70">—</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-foreground mb-1">
                  Músculos enfraquecidos
                </h3>
                {resultado.desequilibrios_musculares?.enfraquecidos?.length ? (
                  <ul className="space-y-1">
                    {resultado.desequilibrios_musculares.enfraquecidos.map((m, i) => (
                      <li key={i} className="text-sm text-muted-foreground leading-snug">• {m}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground/70">—</p>
                )}
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-display text-sm uppercase tracking-widest text-foreground mb-2">
                Impacto funcional
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {resultado.impacto_funcional}
              </p>
            </div>

            {resultado.recomendacoes_treino?.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <h2 className="font-display text-sm uppercase tracking-widest text-foreground">
                  Recomendações de treino
                </h2>
                {resultado.recomendacoes_treino.map((rec, i) => (
                  <div key={i} className="border border-border rounded-xl p-3">
                    <p className="text-sm font-bold text-foreground">{rec.foco}</p>
                    {rec.series_repeticoes && (
                      <p className="text-xs text-muted-foreground mt-0.5">{rec.series_repeticoes}</p>
                    )}
                    {rec.exercicios?.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {rec.exercicios.map((ex, j) => (
                          <li key={j} className="text-sm text-muted-foreground leading-snug">• {ex}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {resultado.metas_curto_medio_prazo?.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-display text-sm uppercase tracking-widest text-foreground mb-2">
                  Metas de curto e médio prazo
                </h2>
                <ul className="space-y-1">
                  {resultado.metas_curto_medio_prazo.map((meta, i) => (
                    <li key={i} className="text-sm text-muted-foreground leading-snug">• {meta}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Análise educacional e funcional. Não substitui a avaliação de um
              profissional de saúde.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalisePostural;
