import { useEffect, useState } from "react";
import { useBranding, applyTheme, type ThemeOverrides, type ThemeMode, type MetalSkin } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { PhonePreview } from "./PhonePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, Save, Check, Music, Contrast } from "lucide-react";
import { toast } from "sonner";

// Paletas metálicas: entram como temas selecionáveis (aplicam cor + acabamento metálico)
const METAL_PRESETS_DEF: { id: MetalSkin; name: string; subtitle: string; swatches: string[]; gradient: string; overrides: ThemeOverrides }[] = [
  {
    id: "azul",
    name: "AZUL METÁLICO",
    subtitle: "Cromado azul",
    swatches: ["#0A1F5C", "#1B3FA0", "#3B5EDB", "#FFFFFF"],
    gradient: "linear-gradient(135deg, #0A1F5C 0%, #1B3FA0 25%, #3B5EDB 50%, #8FB4FF 65%, #3B5EDB 80%, #1B3FA0 100%)",
    overrides: { primary: "224 62% 55%", primary_glow: "220 100% 78%", primary_foreground: "0 0% 100%", accent: "224 62% 55%", accent_foreground: "0 0% 100%", metal_skin: "azul" },
  },
  {
    id: "dourado",
    name: "DOURADO METÁLICO",
    subtitle: "Ouro escovado",
    swatches: ["#3B2600", "#FF8C00", "#FFD700", "#FFFFFF"],
    gradient: "linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)",
    overrides: { primary: "45 100% 50%", primary_glow: "45 100% 65%", primary_foreground: "0 0% 0%", accent: "45 100% 50%", accent_foreground: "0 0% 0%", metal_skin: "dourado" },
  },
  {
    id: "verde",
    name: "VERDE METÁLICO",
    subtitle: "Esmeralda cromada",
    swatches: ["#062B1A", "#0E5C3B", "#2E9E63", "#FFFFFF"],
    gradient: "linear-gradient(135deg, #062B1A 0%, #0E5C3B 25%, #2E9E63 50%, #A8F0C6 65%, #2E9E63 80%, #0E5C3B 100%)",
    overrides: { primary: "152 55% 40%", primary_glow: "148 63% 80%", primary_foreground: "0 0% 100%", accent: "152 55% 40%", accent_foreground: "0 0% 100%", metal_skin: "verde" },
  },
  {
    id: "rosa",
    name: "ROSA METÁLICO",
    subtitle: "Rosé cromado",
    swatches: ["#4A0E2E", "#8E1D57", "#D6488F", "#FFFFFF"],
    gradient: "linear-gradient(135deg, #4A0E2E 0%, #8E1D57 25%, #D6488F 50%, #FFC1E3 65%, #D6488F 80%, #8E1D57 100%)",
    overrides: { primary: "329 63% 56%", primary_glow: "325 100% 88%", primary_foreground: "0 0% 100%", accent: "329 63% 56%", accent_foreground: "0 0% 100%", metal_skin: "rosa" },
  },
];


type Preset = {
  id: string;
  name: string;
  subtitle: string;
  swatches: string[]; // hex array for visual chip
  previewBackground?: string;
  overrides: ThemeOverrides;
};

// Os temas ficam salvos no Supabase (tabela `theme_presets`) para poderem ser
// ajustados sem novo build do app. A lista abaixo é apenas fallback offline.
// IMPORTANTE: os temas alteram APENAS cores de destaque (botões, faixas, bordas).
// Fundo, cards, texto e texturas NÃO são alterados para não sobrepor vídeos/thumbs.
const FALLBACK_PRESETS: Preset[] = [
  {
    id: "ferrari",
    name: "FERRARI BLACK",
    subtitle: "Padrão · Vermelho & Preto",
    swatches: ["#000000", "#0A0A0A", "#E10600", "#FAFAFA"],
    overrides: {
      primary: "355 100% 48%",
      primary_glow: "355 100% 60%",
      primary_foreground: "0 0% 100%",
      accent: "355 100% 48%",
      accent_foreground: "0 0% 100%",
    },
  },
];

const METAL_PRESETS: Preset[] = METAL_PRESETS_DEF.map((m) => ({
  id: `metal-${m.id}`,
  name: m.name,
  subtitle: m.subtitle,
  swatches: m.swatches,
  previewBackground: m.gradient,
  overrides: m.overrides,
}));


type PresetRow = {
  codigo: string;
  nome: string;
  subtitulo: string | null;
  swatches: unknown;
  primary_hsl: string;
  primary_glow_hsl: string | null;
  primary_foreground_hsl: string | null;
  accent_hsl: string | null;
  accent_foreground_hsl: string | null;
  border_hsl: string | null;
};

const rowToPreset = (r: PresetRow): Preset => {
  const overrides: ThemeOverrides = { primary: r.primary_hsl };
  if (r.primary_glow_hsl) overrides.primary_glow = r.primary_glow_hsl;
  if (r.primary_foreground_hsl) overrides.primary_foreground = r.primary_foreground_hsl;
  if (r.accent_hsl) overrides.accent = r.accent_hsl;
  if (r.accent_foreground_hsl) overrides.accent_foreground = r.accent_foreground_hsl;
  if (r.border_hsl) overrides.border = r.border_hsl;
  return {
    id: r.codigo,
    name: r.nome,
    subtitle: r.subtitulo ?? "",
    swatches: Array.isArray(r.swatches) && r.swatches.length >= 4
      ? (r.swatches as string[])
      : ["#000000", "#111111", "#E10600", "#FFFFFF"],
    overrides,
  };
};



export const IdentidadeVisual = () => {
  const { tenant, refresh, applyPreview, clearPreview } = useBranding();
  const [selected, setSelected] = useState<Preset | null>(null);
  const [busy, setBusy] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [savingMusic, setSavingMusic] = useState(false);
  const [presets, setPresets] = useState<Preset[]>([...FALLBACK_PRESETS, ...METAL_PRESETS]);
  const [themeMode, setThemeMode] = useState<ThemeMode>((tenant?.theme_mode as ThemeMode) ?? "escuro");
  const [savingMode, setSavingMode] = useState(false);


  useEffect(() => {
    setThemeMode((tenant?.theme_mode as ThemeMode) ?? "escuro");
  }, [tenant?.theme_mode]);

  useEffect(() => {
    if (!tenant?.owner_user_id) {
      setMusicUrl("");
      return;
    }

    let alive = true;
    void supabase
      .from("perfis")
      .select("music_url")
      .eq("id", tenant.owner_user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setMusicUrl(data?.music_url ?? "");
      });

    return () => {
      alive = false;
    };
  }, [tenant?.owner_user_id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase
        .from("theme_presets")
        .select("codigo, nome, subtitulo, swatches, primary_hsl, primary_glow_hsl, primary_foreground_hsl, accent_hsl, accent_foreground_hsl, border_hsl")
        .eq("ativo", true)
        .order("ordem", { ascending: true });
      if (!alive || error || !data?.length) return;
      setPresets([...(data as PresetRow[]).map(rowToPreset), ...METAL_PRESETS]);
    })();
    return () => {
      alive = false;
    };
  }, []);


  if (!tenant) return null;

  const saveMusic = async () => {
    if (!tenant.owner_user_id) return toast.error("Perfil do coach não identificado");
    setSavingMusic(true);
    const { error } = await supabase
      .from("perfis")
      .update({ music_url: musicUrl.trim() || null })
      .eq("id", tenant.owner_user_id);
    setSavingMusic(false);
    if (error) return toast.error(error.message);
    toast.success(musicUrl.trim() ? "Música do seu perfil salva!" : "Música do perfil removida");
  };

  const saveMode = async (mode: ThemeMode) => {
    if (!tenant || mode === themeMode) return;
    setSavingMode(true);
    const previous = themeMode;
    setThemeMode(mode);
    applyTheme((tenant.theme_overrides as ThemeOverrides | null) ?? null, tenant.hero_url, true, mode);
    const { error } = await supabase.from("tenants").update({ theme_mode: mode }).eq("id", tenant.id);
    setSavingMode(false);
    if (error) {
      setThemeMode(previous);
      applyTheme((tenant.theme_overrides as ThemeOverrides | null) ?? null, tenant.hero_url, true, previous);
      return toast.error(error.message);
    }
    toast.success(mode === "suave" ? "Modo Suave aplicado!" : "Modo Escuro aplicado!");
    await refresh();
  };

  const handlePick = (p: Preset) => {
    setSelected(p);
    applyPreview(p.overrides);
  };

  const handleDiscard = () => {
    setSelected(null);
    clearPreview();
  };

  const handleSave = async () => {
    if (!selected) return;
    setBusy(true);
    const overrides: ThemeOverrides = { metal_skin: null, ...selected.overrides };
    const { error } = await supabase
      .from("tenants")
      .update({ theme_overrides: overrides })
      .eq("id", tenant.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Tema "${selected.name}" aplicado em todo o app!`);
      setSelected(null);
      await refresh();
    }
    setBusy(false);
  };


  const handleResetAll = async () => {
    setBusy(true);
    const { error } = await supabase.from("tenants").update({ theme_overrides: {} }).eq("id", tenant.id);
    if (error) toast.error(error.message);
    else {
      setSelected(null);
      await refresh();
      toast.success("Tema restaurado para o padrão");
    }
    setBusy(false);
  };

  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-6">
      {/* Preview */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 text-center">
          Pré-visualização
        </p>
        <PhonePreview onPick={() => {}} pickedTarget={null} />
        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleDiscard}
            disabled={!selected}
          >
            <RotateCcw className="h-3 w-3 mr-1" /> Descartar
          </Button>
          <Button
            size="sm"
            className="flex-1 bg-gradient-primary shadow-glow"
            onClick={handleSave}
            disabled={busy || !selected}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" /> Aplicar</>}
          </Button>
        </div>
      </div>

      {/* Presets */}
      <div className="space-y-4">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          <h3 className="font-display text-lg mb-1">ESCOLHA UM TEMA</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Toque em qualquer card e o app inteiro muda na hora. Depois clique em <strong>Aplicar</strong> para salvar.
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            {presets.map((p) => {
              const isActive = selected?.id === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePick(p)}
                  className={`relative text-left rounded-xl border-2 p-4 transition-all overflow-hidden ${
                    isActive
                      ? "border-primary shadow-glow scale-[1.02]"
                      : "border-border hover:border-primary/60"
                  }`}
                  style={{
                    background: p.previewBackground ?? `linear-gradient(135deg, ${p.swatches[0]} 0%, ${p.swatches[1]} 100%)`,
                  }}
                >
                  {isActive && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <p
                    className="font-display text-sm font-bold tracking-wide"
                    style={{ color: p.swatches[3] }}
                  >
                    {p.name}
                  </p>
                  <p className="text-[10px] opacity-70 mb-3" style={{ color: p.swatches[3] }}>
                    {p.subtitle}
                  </p>
                  <div className="flex gap-1.5">
                    {p.swatches.map((c, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border border-white/20 shadow-md"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-3">
          <div className="flex items-center gap-2">
            <Contrast className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base">FUNDO DO APP</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Escolha entre o preto absoluto e o cinza-grafite (mais suave para os olhos). Vale para o seu painel e para o app dos seus alunos. As cores da sua marca não mudam.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {([
              { id: "escuro", label: "ESCURO", desc: "Preto absoluto", bg: "#000000" },
              { id: "suave", label: "SUAVE", desc: "Cinza-grafite", bg: "#1F1F1F" },
            ] as const).map((m) => (
              <button
                key={m.id}
                onClick={() => saveMode(m.id)}
                disabled={savingMode}
                className={`relative rounded-xl border-2 p-4 text-left transition-all ${
                  themeMode === m.id ? "border-primary shadow-glow" : "border-border hover:border-primary/60"
                }`}
                style={{ background: m.bg }}
              >
                {themeMode === m.id && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                <p className="font-display text-sm font-bold tracking-wide text-white">{m.label}</p>
                <p className="text-[10px] text-white/60">{m.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-3">
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm space-y-3">

          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base">MÚSICA DE FUNDO DO PERFIL</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole o link de uma música do <strong>YouTube</strong>, <strong>Spotify</strong>, <strong>SoundCloud</strong> ou arquivo direto (.mp3). Ela tocará somente no seu perfil de coach.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="https://youtu.be/... ou https://open.spotify.com/track/..."
              value={musicUrl}
              onChange={(e) => setMusicUrl(e.target.value)}
              className="bg-secondary/50"
            />
            <Button onClick={saveMusic} disabled={savingMusic} className="bg-gradient-primary shadow-glow">
              {savingMusic ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" /> Salvar</>}
            </Button>
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-sm flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Restaurar padrão</p>
            <p className="text-xs text-muted-foreground">Volta para o tema Ferrari Black</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetAll} disabled={busy}>
            <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Em breve: mais temas exclusivos serão adicionados aqui.
        </p>
      </div>
    </div>
  );
};
