import { useState } from "react";
import { useBranding, type ThemeOverrides } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { PhonePreview, type EditableTarget, EDITABLE_TARGETS } from "./PhonePreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, RotateCcw, Save, Wand2 } from "lucide-react";
import { toast } from "sonner";

// HEX <-> HSL helpers
const hexToHsl = (hex: string): string | null => {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const num = parseInt(m[1], 16);
  let r = ((num >> 16) & 255) / 255;
  let g = ((num >> 8) & 255) / 255;
  let b = (num & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};
const hslToHex = (hsl: string): string => {
  const m = hsl.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
  if (!m) return "#000000";
  const h = parseFloat(m[1]) / 360, s = parseFloat(m[2]) / 100, l = parseFloat(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

export const IdentidadeVisual = () => {
  const { tenant, refresh, applyPreview, clearPreview } = useBranding();
  const [picked, setPicked] = useState<EditableTarget | null>(null);
  const [draft, setDraft] = useState<ThemeOverrides>({});
  const [aiCmd, setAiCmd] = useState("");
  const [busy, setBusy] = useState<"ai" | "save" | null>(null);

  if (!tenant) return null;

  const current: ThemeOverrides = { ...(tenant.theme_overrides || {}), ...draft };

  const setToken = (key: keyof ThemeOverrides, value: string) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    applyPreview(next);
  };

  const handlePickColor = (key: keyof ThemeOverrides, hex: string) => {
    const hsl = hexToHsl(hex);
    if (!hsl) return;
    setToken(key, hsl);
  };

  const handleAI = async () => {
    if (!aiCmd.trim()) return;
    setBusy("ai");
    try {
      const { data, error } = await supabase.functions.invoke("theme-ai", {
        body: { command: aiCmd, current },
      });
      if (error) throw error;
      const patch = (data?.patch || {}) as ThemeOverrides;
      if (Object.keys(patch).length === 0) {
        toast.info("A IA não sugeriu mudanças.");
      } else {
        const next = { ...draft, ...patch };
        setDraft(next);
        applyPreview(next);
        toast.success(`IA aplicou: ${Object.keys(patch).join(", ")}`);
        setAiCmd("");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const handleSave = async () => {
    setBusy("save");
    const merged = { ...(tenant.theme_overrides || {}), ...draft };
    const { error } = await supabase
      .from("tenants")
      .update({ theme_overrides: merged })
      .eq("id", tenant.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Identidade visual salva!");
      setDraft({});
      await refresh();
    }
    setBusy(null);
  };

  const handleReset = () => {
    setDraft({});
    clearPreview();
    setPicked(null);
    toast.message("Mudanças não salvas descartadas");
  };

  const handleResetAll = async () => {
    setBusy("save");
    const { error } = await supabase.from("tenants").update({ theme_overrides: {} }).eq("id", tenant.id);
    if (error) toast.error(error.message);
    else {
      setDraft({});
      await refresh();
      toast.success("Tema restaurado para o padrão Netflix");
    }
    setBusy(null);
  };

  return (
    <div className="grid lg:grid-cols-[auto_1fr] gap-6">
      {/* Preview do celular */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4 text-center">
          Toque em qualquer elemento para editar
        </p>
        <PhonePreview onPick={setPicked} pickedTarget={picked} />
        <div className="flex gap-2 mt-4">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleReset} disabled={Object.keys(draft).length === 0}>
            <RotateCcw className="h-3 w-3 mr-1" /> Descartar
          </Button>
          <Button size="sm" className="flex-1 bg-gradient-primary shadow-glow" onClick={handleSave} disabled={busy === "save" || Object.keys(draft).length === 0}>
            {busy === "save" ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Save className="h-3 w-3 mr-1" /> Salvar</>}
          </Button>
        </div>
      </div>

      {/* Painel de edição */}
      <div className="space-y-4">
        {/* Editor IA */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="font-display text-lg">EDITAR COM IA</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Descreva a mudança em português. Ex: <em>"muda o fundo para roxo escuro"</em>, <em>"botão reproduzir azul"</em>.
          </p>
          <div className="flex gap-2">
            <Textarea
              value={aiCmd}
              onChange={(e) => setAiCmd(e.target.value)}
              placeholder="muda o fundo da tela para roxo espelhado..."
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAI();
              }}
            />
            <Button onClick={handleAI} disabled={busy === "ai" || !aiCmd.trim()} className="bg-gradient-primary self-stretch px-4">
              {busy === "ai" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Editor do elemento selecionado */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          <h3 className="font-display text-lg mb-3">
            {picked ? `EDITAR · ${picked.label.toUpperCase()}` : "SELECIONE UM ELEMENTO"}
          </h3>
          {!picked ? (
            <p className="text-xs text-muted-foreground">
              Clique em qualquer parte do preview à esquerda (fundo, botão, texto, cards…) para editar a cor.
            </p>
          ) : (
            <div className="space-y-3">
              {picked.tokens.map((tk) => {
                const tokenKey = tk as keyof ThemeOverrides;
                const value = current[tokenKey] || "";
                const hex = value ? hslToHex(value) : "#000000";
                return (
                  <div key={tk} className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs uppercase">{tk}</Label>
                      <Input
                        value={value}
                        onChange={(e) => setToken(tokenKey, e.target.value)}
                        placeholder="ex: 270 60% 25%"
                        className="font-mono text-xs mt-1"
                      />
                    </div>
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => handlePickColor(tokenKey, e.target.value)}
                      className="w-12 h-12 rounded-lg border border-border cursor-pointer mt-5"
                      title="Color picker"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Reset total */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm flex items-center justify-between gap-3">
          <div>
            <p className="font-medium text-sm">Restaurar tema padrão (Netflix)</p>
            <p className="text-xs text-muted-foreground">Apaga todas as customizações salvas deste tenant</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetAll} disabled={busy === "save"}>
            <RotateCcw className="h-3 w-3 mr-1" /> Restaurar
          </Button>
        </div>

        {/* Atalhos: lista de elementos */}
        <div className="bg-black/40 border border-white/10 rounded-2xl p-5 shadow-2xl backdrop-blur-sm">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Elementos editáveis</p>
          <div className="flex flex-wrap gap-2">
            {EDITABLE_TARGETS.map((t) => (
              <button
                key={t.id}
                onClick={() => setPicked(t)}
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  picked?.id === t.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border hover:border-primary/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
