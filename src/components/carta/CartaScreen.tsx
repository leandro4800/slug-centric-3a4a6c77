import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, Sparkles, Pencil, Save, X, ArrowLeft } from "lucide-react";
import { AthleteCard, type CartaData, type AtributosCarta } from "./AthleteCard";

const ATR_FIELDS: Array<{ key: keyof AtributosCarta; label: string }> = [
  { key: "forca", label: "Força" },
  { key: "hipertrofia", label: "Hipertrofia" },
  { key: "resistencia", label: "Resistência" },
  { key: "mobilidade", label: "Mobilidade" },
  { key: "disciplina", label: "Disciplina" },
  { key: "recuperacao", label: "Recuperação" },
];

const calcOverall = (a: AtributosCarta) =>
  Math.round(
    (a.forca + a.hipertrofia + a.resistencia + a.mobilidade + a.disciplina + a.recuperacao) / 6
  );

type Props = {
  alunoId: string;
  /** se true, mostra controles de edição (próprio aluno OU coach do tenant) */
  canEdit: boolean;
};

export const CartaScreen = ({ alunoId, canEdit }: Props) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [carta, setCarta] = useState<CartaData | null>(null);
  const [draft, setDraft] = useState<CartaData | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [perfilNome, setPerfilNome] = useState<string>("");
  const [perfilSexo, setPerfilSexo] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: perfil } = await supabase
        .from("perfis")
        .select("nome_completo, sexo, tenant_id, avatar_url")
        .eq("id", alunoId)
        .maybeSingle();
      setPerfilNome(perfil?.nome_completo ?? "Atleta");
      setPerfilSexo(perfil?.sexo ?? "");
      setTenantId(perfil?.tenant_id ?? null);

      const { data: c } = await supabase
        .from("cartas_atleta")
        .select("*")
        .eq("aluno_id", alunoId)
        .maybeSingle();

      if (c) {
        const data: CartaData = {
          nome: perfil?.nome_completo ?? "Atleta",
          posicao: c.posicao,
          numero: c.numero,
          nivel: c.nivel,
          avatar_carta_url: c.avatar_carta_url,
          foto_original_url: c.foto_original_url ?? perfil?.avatar_url,
          atributos: c.atributos as AtributosCarta,
          estilo_dominante: c.estilo_dominante,
          estilo_secundario: c.estilo_secundario,
          bio: c.bio,
        };
        setCarta(data);
      } else {
        // ainda não tem — mostra esqueleto com defaults
        setCarta({
          nome: perfil?.nome_completo ?? "Atleta",
          posicao: "ATA",
          numero: 10,
          nivel: 75,
          avatar_carta_url: null,
          foto_original_url: perfil?.avatar_url ?? null,
          atributos: {
            forca: 75, hipertrofia: 75, resistencia: 70,
            mobilidade: 70, disciplina: 80, recuperacao: 70,
          },
          estilo_dominante: "Virtuoso",
          estilo_secundario: "Heartbeat",
        });
      }
      setLoading(false);
    })();
  }, [alunoId]);

  const startEdit = () => {
    if (!carta) return;
    setDraft({ ...carta, atributos: { ...carta.atributos } });
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setDraft(null); };

  const saveCarta = async () => {
    if (!draft || !tenantId) return;
    setSaving(true);
    const overall = calcOverall(draft.atributos);
    const payload = {
      aluno_id: alunoId,
      tenant_id: tenantId,
      posicao: draft.posicao,
      numero: draft.numero,
      nivel: overall,
      atributos: draft.atributos,
      estilo_dominante: draft.estilo_dominante,
      estilo_secundario: draft.estilo_secundario,
      bio: draft.bio,
      avatar_carta_url: draft.avatar_carta_url,
      foto_original_url: draft.foto_original_url,
    };
    const { error } = await supabase
      .from("cartas_atleta")
      .upsert(payload, { onConflict: "aluno_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setCarta({ ...draft, nivel: overall });
    setEditing(false);
    setDraft(null);
    toast.success("Carta salva!");
  };

  const onUploadFoto = async (file: File) => {
    if (!file) return;
    const path = `${alunoId}/foto-original-${Date.now()}.${file.name.split(".").pop()}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) { toast.error(error.message); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = pub.publicUrl;
    setDraft((d) => (d ? { ...d, foto_original_url: url } : d));
    if (!editing) {
      setCarta((c) => (c ? { ...c, foto_original_url: url } : c));
      // persistir só a foto se não estiver editando
      if (tenantId) {
        await supabase.from("cartas_atleta").upsert(
          { aluno_id: alunoId, tenant_id: tenantId, foto_original_url: url },
          { onConflict: "aluno_id" }
        );
      }
    }
    toast.success("Foto enviada!");
  };

  const gerarAvatarIA = async () => {
    const fotoUrl = (editing ? draft : carta)?.foto_original_url;
    if (!fotoUrl) {
      toast.error("Envie uma foto primeiro");
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("gerar-avatar-carta", {
      body: { foto_url: fotoUrl, sexo: perfilSexo },
    });
    setGenerating(false);
    if (error || !data?.avatar_url) {
      toast.error(data?.error || error?.message || "Falha ao gerar avatar");
      return;
    }
    const url = data.avatar_url as string;
    if (editing) setDraft((d) => (d ? { ...d, avatar_carta_url: url } : d));
    else {
      setCarta((c) => (c ? { ...c, avatar_carta_url: url } : c));
      if (tenantId) {
        await supabase.from("cartas_atleta").upsert(
          { aluno_id: alunoId, tenant_id: tenantId, avatar_carta_url: url, foto_original_url: fotoUrl },
          { onConflict: "aluno_id" }
        );
      }
    }
    toast.success("Avatar gerado!");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-fut-deep flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin fut-cyan" />
      </div>
    );
  }
  if (!carta) return null;

  const view = editing && draft ? draft : carta;

  return (
    <div className="min-h-screen bg-fut-deep py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Carta */}
        <motion.div
          className="lg:col-span-5 flex justify-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          <AthleteCard carta={view} />
        </motion.div>

        {/* Painel de info / edição */}
        <div className="lg:col-span-7 space-y-4">
          <div className="fut-glass p-5">
            <div className="flex items-center justify-between mb-2">
              <h1 className="font-display-fut text-2xl fut-text-glow">{perfilNome}</h1>
              {canEdit && !editing && (
                <Button variant="outline" size="sm" onClick={startEdit} className="font-gaming">
                  <Pencil className="w-4 h-4 mr-2" /> Editar carta
                </Button>
              )}
              {canEdit && editing && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={saveCarta} disabled={saving} className="bg-[hsl(180_100%_40%)] text-black hover:brightness-110">
                    {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} Salvar
                  </Button>
                </div>
              )}
            </div>
            <p className="font-body-fut text-sm text-muted-foreground">
              Carta gerada a partir do seu perfil de musculação. Estilo EA FC — atualize sua foto e regenere o avatar quando quiser.
            </p>
          </div>

          {canEdit && (
            <div className="fut-glass p-5 space-y-3">
              <h3 className="font-gaming text-sm tracking-widest fut-cyan uppercase">Avatar</h3>
              <div className="flex flex-wrap gap-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onUploadFoto(e.target.files[0])}
                />
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="font-gaming"
                >
                  <Upload className="w-4 h-4 mr-2" /> Enviar foto
                </Button>
                <Button
                  onClick={gerarAvatarIA}
                  disabled={generating}
                  className="font-gaming bg-gradient-to-r from-[hsl(180_100%_45%)] to-[hsl(150_100%_45%)] text-black hover:brightness-110"
                >
                  {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Gerar avatar IA
                </Button>
              </div>
              <p className="font-body-fut text-xs text-muted-foreground">
                A IA gera uma réplica 3D estilo EA FC mantendo seu rosto, com uniforme preto padrão.
              </p>
            </div>
          )}

          {editing && draft && (
            <div className="fut-glass p-5 space-y-4">
              <h3 className="font-gaming text-sm tracking-widest fut-cyan uppercase">Identidade</h3>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="font-gaming text-xs text-muted-foreground">Posição</span>
                  <Input value={draft.posicao} maxLength={4}
                    onChange={(e) => setDraft({ ...draft, posicao: e.target.value.toUpperCase() })} />
                </label>
                <label className="block">
                  <span className="font-gaming text-xs text-muted-foreground">Número</span>
                  <Input type="number" value={draft.numero}
                    onChange={(e) => setDraft({ ...draft, numero: parseInt(e.target.value) || 0 })} />
                </label>
                <label className="block">
                  <span className="font-gaming text-xs text-muted-foreground">Estilo dominante</span>
                  <Input value={draft.estilo_dominante ?? ""}
                    onChange={(e) => setDraft({ ...draft, estilo_dominante: e.target.value })} />
                </label>
                <label className="block">
                  <span className="font-gaming text-xs text-muted-foreground">Estilo secundário</span>
                  <Input value={draft.estilo_secundario ?? ""}
                    onChange={(e) => setDraft({ ...draft, estilo_secundario: e.target.value })} />
                </label>
              </div>

              <h3 className="font-gaming text-sm tracking-widest fut-cyan uppercase pt-2">Atributos</h3>
              <div className="grid grid-cols-2 gap-3">
                {ATR_FIELDS.map(({ key, label }) => (
                  <label key={key} className="block">
                    <div className="flex justify-between items-baseline">
                      <span className="font-gaming text-xs text-muted-foreground">{label}</span>
                      <span className="font-display-fut text-base fut-cyan">{draft.atributos[key]}</span>
                    </div>
                    <input
                      type="range" min={1} max={99}
                      value={draft.atributos[key]}
                      onChange={(e) => setDraft({
                        ...draft,
                        atributos: { ...draft.atributos, [key]: parseInt(e.target.value) },
                      })}
                      className="w-full accent-[hsl(180_100%_50%)]"
                    />
                  </label>
                ))}
              </div>
              <p className="font-body-fut text-xs text-muted-foreground">
                Overall calculado: <span className="fut-cyan font-bold">{calcOverall(draft.atributos)}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
