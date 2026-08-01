import { useEffect, useState } from "react";
import { useBranding, type ThemeOverrides } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { PhonePreview } from "./PhonePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, Save, Check, Music } from "lucide-react";
import { toast } from "sonner";

type Preset = {
  id: string;
  name: string;
  subtitle: string;
  swatches: string[]; // hex array for visual chip
  previewBackground?: string;
  overrides: ThemeOverrides;
};

// Defaults Netflix/Ferrari já estão no BrandingProvider; aqui só os presets.
// IMPORTANTE: os temas alteram APENAS cores de destaque (botões, faixas, bordas).
// Fundo, cards, texto e texturas NÃO são alterados para não sobrepor vídeos/thumbs
// nem quebrar a legibilidade das telas (principalmente a tela Início).
const PRESETS: Preset[] = [
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
  {
    id: "cimento",
    name: "CIMENTO",
    subtitle: "Industrial · Concreto & Detalhes",
    swatches: ["#9A9A9A", "#FFFFFF", "#E10600", "#000000"],
    overrides: {
      primary: "0 0% 75%",
      primary_glow: "0 0% 90%",
      primary_foreground: "0 0% 5%",
      accent: "0 0% 100%",
      accent_foreground: "0 0% 0%",
    },
  },
  {
    id: "gold-rush",
    name: "BLACK GOLD",
    subtitle: "Luxo · Dourado",
    swatches: ["#101010", "#2F2F2F", "#FFD700", "#FFFACD"],
    overrides: {
      primary: "45 100% 50%",
      primary_glow: "45 100% 80%",
      primary_foreground: "0 0% 8%",
      accent: "44 85% 50%",
      accent_foreground: "0 0% 8%",
    },
  },
  {
    id: "tech-titanium",
    name: "TECH TITANIUM",
    subtitle: "Performance · Azul Elétrico",
    swatches: ["#121417", "#1C1F28", "#007BFF", "#FFFFFF"],
    overrides: {
      primary: "212 100% 50%",
      primary_glow: "212 100% 65%",
      primary_foreground: "0 0% 100%",
      accent: "212 100% 50%",
      accent_foreground: "0 0% 100%",
    },
  },
  {
    id: "deep-sea-glass",
    name: "DEEP SEA GLASS",
    subtitle: "Moderno & Fluido",
    swatches: ["#0F172A", "#1E293B", "#7DD3FC", "#FEFFEF"],
    overrides: {
      primary: "199 89% 74%",
      primary_glow: "199 89% 85%",
      primary_foreground: "222 47% 11%",
      accent: "199 89% 74%",
      accent_foreground: "222 47% 11%",
    },
  },
  {
    id: "nordic-minimalist",
    name: "NORDIC SILVER",
    subtitle: "Limpo & Sofisticado",
    swatches: ["#FBF9FA", "#212529", "#A9A9A9", "#000000"],
    overrides: {
      primary: "210 8% 72%",
      primary_glow: "210 8% 88%",
      primary_foreground: "210 11% 12%",
      accent: "210 8% 72%",
      accent_foreground: "210 11% 12%",
    },
  },
  {
    id: "army-stealth",
    name: "ARMY STEALTH",
    subtitle: "Tático · Verde Militar",
    swatches: ["#1A1C14", "#2D3021", "#4B5320", "#D1D5B8"],
    overrides: {
      primary: "72 45% 38%",
      primary_glow: "72 45% 52%",
      primary_foreground: "60 30% 96%",
      accent: "72 45% 38%",
      accent_foreground: "60 30% 96%",
    },
  },
  {
    id: "desert-storm",
    name: "DESERT STORM",
    subtitle: "Ação · Areia & Cinza",
    swatches: ["#2B2824", "#3D3934", "#C2B280", "#F5F5DC"],
    overrides: {
      primary: "45 38% 63%",
      primary_glow: "45 38% 80%",
      primary_foreground: "30 10% 12%",
      accent: "45 38% 63%",
      accent_foreground: "30 10% 12%",
    },
  },
  {
    id: "midnight-neon",
    name: "MIDNIGHT NEON",
    subtitle: "Cyberpunk · Roxo & Preto",
    swatches: ["#000000", "#12001F", "#BC13FE", "#FFFFFF"],
    overrides: {
      primary: "282 100% 54%",
      primary_glow: "282 100% 75%",
      primary_foreground: "0 0% 100%",
      accent: "282 100% 54%",
      accent_foreground: "0 0% 100%",
    },
  },
  {
    id: "black-flow",
    name: "BLACK FLOW",
    subtitle: "Cinematográfico · Dark & Red",
    swatches: ["#000000", "#1A1A1A", "#E10600", "#FFFFFF"],
    overrides: {
      primary: "0 84% 45%",
      primary_glow: "0 84% 60%",
      primary_foreground: "0 0% 100%",
      accent: "0 84% 45%",
      accent_foreground: "0 0% 100%",
    },
  },
];


export const IdentidadeVisual = () => {
  const { tenant, refresh, applyPreview, clearPreview } = useBranding();
  const [selected, setSelected] = useState<Preset | null>(null);
  const [busy, setBusy] = useState(false);
  const [musicUrl, setMusicUrl] = useState<string>("");
  const [savingMusic, setSavingMusic] = useState(false);

  useEffect(() => {
    setMusicUrl((tenant as any)?.music_url ?? "");
  }, [tenant?.id, (tenant as any)?.music_url]);

  if (!tenant) return null;

  const saveMusic = async () => {
    setSavingMusic(true);
    const { error } = await supabase
      .from("tenants")
      .update({ music_url: musicUrl.trim() || null })
      .eq("id", tenant.id);
    setSavingMusic(false);
    if (error) return toast.error(error.message);
    toast.success(musicUrl.trim() ? "Música de fundo salva!" : "Música removida");
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
    const { error } = await supabase
      .from("tenants")
      .update({ theme_overrides: selected.overrides })
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
            {PRESETS.map((p) => {
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
            <Music className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base">MÚSICA DE FUNDO DO PERFIL</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Cole o link de uma música do <strong>YouTube</strong>, <strong>Spotify</strong>, <strong>SoundCloud</strong> ou arquivo direto (.mp3). Ela tocará quando o aluno abrir a tela Perfil.
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
