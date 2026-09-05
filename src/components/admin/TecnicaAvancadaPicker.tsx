import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronDown, PlayCircle, Plus, Video } from "lucide-react";
import ExercisePlayer from "@/components/aluno/ExercisePlayer";
import { toast } from "sonner";

export interface TecnicaAvancada {
  id: string;
  nome: string;
  descricao: string | null;
  video_explicativo: string | null;
  tenant_id: string | null;
}

const norm = (t: string) =>
  t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export const useTecnicasAvancadas = (tenantId?: string | null) => {
  const [tecnicas, setTecnicas] = useState<TecnicaAvancada[]>([]);

  const load = async () => {
    const { data } = await (supabase as any)
      .from("dicionario_tecnicas")
      .select("id, nome, descricao, video_explicativo, tenant_id")
      .order("nome");
    const rows = ((data as TecnicaAvancada[]) || []).filter(
      (t) => !t.tenant_id || t.tenant_id === tenantId
    );
    // Técnica do tenant tem prioridade sobre a global de mesmo nome
    const map = new Map<string, TecnicaAvancada>();
    for (const t of rows) {
      const k = norm(t.nome || "");
      const atual = map.get(k);
      if (!atual || (!atual.tenant_id && t.tenant_id)) map.set(k, t);
    }
    setTecnicas([...map.values()].sort((a, b) => a.nome.localeCompare(b.nome)));
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  return { tecnicas, reloadTecnicas: load };
};

/** Botão de vídeo da técnica avançada — assiste e permite vincular o link. */
const TecnicaVideoButton = ({
  tecnica,
  tenantId,
  onSaved,
}: {
  tecnica: TecnicaAvancada | null;
  tenantId?: string | null;
  onSaved: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setUrl(tecnica?.video_explicativo || "");
  }, [open, tecnica?.id]);

  if (!tecnica) return null;
  const temVideo = !!tecnica.video_explicativo;

  const salvar = async () => {
    if (!tenantId) return;
    setSaving(true);
    try {
      const link = url.trim() || null;
      if (tecnica.tenant_id) {
        const { error } = await (supabase as any)
          .from("dicionario_tecnicas")
          .update({ video_explicativo: link })
          .eq("id", tecnica.id);
        if (error) throw error;
      } else {
        // Técnica global: cria uma cópia do coach com o vídeo vinculado
        const { error } = await (supabase as any).from("dicionario_tecnicas").insert({
          nome: tecnica.nome,
          descricao: tecnica.descricao,
          video_explicativo: link,
          tenant_id: tenantId,
        });
        if (error) throw error;
      }
      toast.success("Vídeo da técnica salvo.");
      onSaved();
      setOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Não foi possível salvar o vídeo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setOpen(true)}
        className={`h-6 px-2 gap-1 text-[9px] uppercase tracking-wider font-bold ${
          temVideo
            ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10"
            : "text-muted-foreground hover:text-primary"
        }`}
        title={temVideo ? "Ver vídeo da técnica" : "Vincular vídeo da técnica"}
      >
        <PlayCircle className="h-3.5 w-3.5" /> {temVideo ? "Ver vídeo" : "Vincular vídeo"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display uppercase tracking-wider text-base">
              {tecnica.nome}
            </DialogTitle>
          </DialogHeader>
          {tecnica.descricao && (
            <p className="text-xs text-muted-foreground">{tecnica.descricao}</p>
          )}
          {temVideo && (
            <div className="relative w-full overflow-hidden rounded-lg bg-black aspect-video">
              <ExercisePlayer videoUrl={tecnica.video_explicativo!} exerciseName={tecnica.nome} />
            </div>
          )}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Link do vídeo (YouTube ou vídeo direto)
            </p>
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/..."
                className="text-xs"
              />
              <Button type="button" onClick={salvar} disabled={saving}>
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

interface Props {
  value: string;
  tenantId?: string | null;
  tecnicas: TecnicaAvancada[];
  onChange: (v: string) => void;
  onReload: () => void;
}

/** Seletor de técnica avançada (mesma barra com seta usada nos exercícios). */
export const TecnicaAvancadaPicker = ({ value, tenantId, tecnicas, onChange, onReload }: Props) => {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);

  const q = norm(busca);
  const lista = q ? tecnicas.filter((t) => norm(`${t.nome} ${t.descricao || ""}`).includes(q)) : tecnicas;
  const selecionada = tecnicas.find((t) => norm(t.nome) === norm(value || "")) || null;

  const criarTecnica = async () => {
    const nome = busca.trim();
    if (!nome || !tenantId) return;
    setCriando(true);
    try {
      const { error } = await (supabase as any)
        .from("dicionario_tecnicas")
        .insert({ nome, tenant_id: tenantId });
      if (error) throw error;
      onChange(nome);
      onReload();
      setBusca("");
      setOpen(false);
      toast.success("Técnica cadastrada.");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível cadastrar a técnica.");
    } finally {
      setCriando(false);
    }
  };

  return (
    <div className="space-y-1">
      <Popover open={open} onOpenChange={setOpen}>
        <div className="relative isolate mt-1 overflow-visible">
          <Input
            readOnly
            placeholder="Nenhuma técnica avançada"
            value={value || ""}
            onClick={() => setOpen(true)}
            className="relative z-0 w-full min-w-0 pr-14 cursor-pointer"
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              className="absolute right-px top-px z-[60] h-[calc(100%-2px)] w-12 shrink-0 overflow-visible rounded-l-none rounded-r-[5px] border-0 border-l border-primary-foreground/30 bg-primary p-0 text-primary-foreground opacity-100 shadow-none hover:bg-primary focus-visible:z-[70] [&_svg]:relative [&_svg]:z-[70] [&_svg]:!h-6 [&_svg]:!w-6"
              title="Escolher técnica avançada"
              aria-label="Escolher técnica avançada"
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent align="end" className="w-[300px] p-0 max-h-[22rem] overflow-auto">
          <div className="p-2 border-b border-border/40 sticky top-0 bg-popover z-10">
            <Input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar técnica..."
              className="h-8 text-xs"
            />
          </div>
          <ul className="divide-y divide-border/30">
            {value && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:bg-primary/10"
                >
                  Sem técnica avançada
                </button>
              </li>
            )}
            {lista.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(t.nome);
                    setOpen(false);
                    setBusca("");
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-primary/10 flex items-center justify-between gap-2"
                >
                  <span className="text-xs truncate flex items-center gap-1.5">
                    {t.video_explicativo && <Video className="h-3 w-3 text-emerald-400 shrink-0" />}
                    {t.nome}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {busca.trim() && !lista.some((t) => norm(t.nome) === q) && (
            <button
              type="button"
              onClick={criarTecnica}
              disabled={criando}
              className="w-full text-left px-3 py-2 text-xs text-primary hover:bg-primary/10 flex items-center gap-1.5 border-t border-border/40"
            >
              <Plus className="h-3.5 w-3.5" /> Cadastrar "{busca.trim()}"
            </button>
          )}
          {lista.length === 0 && !busca.trim() && (
            <div className="p-3 text-xs text-muted-foreground">Nenhuma técnica cadastrada.</div>
          )}
        </PopoverContent>
      </Popover>

      {selecionada && (
        <TecnicaVideoButton tecnica={selecionada} tenantId={tenantId} onSaved={onReload} />
      )}
    </div>
  );
};

export default TecnicaAvancadaPicker;
