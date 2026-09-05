import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, Upload, Trash2, Loader2, FileText, Dumbbell, Apple, PenLine, Save } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { AdminBackButton } from "@/components/admin/AdminBackButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Categoria = "treino" | "dieta";

interface ChunkRow {
  id: string;
  titulo: string;
  fonte: string | null;
  created_at: string;
  categoria: string | null;
  metadata: any;
}

interface DocGroup {
  sourcePath: string;
  fonte: string;
  chunks: number;
  createdAt: string;
  categoria: string;
  manual: boolean;
}

interface CampoDef {
  key: string;
  label: string;
  placeholder: string;
}

const CAMPOS: Record<Categoria, CampoDef[]> = {
  treino: [
    {
      key: "Metodologia e divisão preferida",
      label: "Metodologia e divisão preferida",
      placeholder: "Ex: sempre usar ABC 4x na semana, iniciar por multiarticular, cadência 2-0-2...",
    },
    {
      key: "Séries, repetições e descanso padrão",
      label: "Séries, repetições e descanso padrão",
      placeholder: "Ex: 4x8-12 para membros inferiores, descanso 60-90s, RIR 2...",
    },
    {
      key: "Exercícios que devem ser priorizados",
      label: "Exercícios que devem ser priorizados",
      placeholder: "Ex: agachamento livre, remada curvada, terra romeno...",
    },
    {
      key: "Exercícios proibidos / que nunca usar",
      label: "Exercícios proibidos / que nunca usar",
      placeholder: "Ex: nunca prescrever desenvolvimento por trás da nuca, nem levantamento terra para iniciantes...",
    },
    {
      key: "Aquecimento, mobilidade e finalização",
      label: "Aquecimento, mobilidade e finalização",
      placeholder: "Ex: sempre 5 min de esteira + mobilidade de quadril; finalizar com core...",
    },
    {
      key: "Outras regras obrigatórias do treino",
      label: "Outras regras obrigatórias",
      placeholder: "Qualquer regra que a IA deve seguir à risca ao montar o treino.",
    },
  ],
  dieta: [
    {
      key: "Estrutura de refeições preferida",
      label: "Estrutura de refeições preferida",
      placeholder: "Ex: 5 refeições, café reforçado, ceia leve, sempre proteína em todas...",
    },
    {
      key: "Alimentos preferidos / que sempre usar",
      label: "Alimentos preferidos / que sempre usar",
      placeholder: "Ex: arroz, feijão, ovos, tapioca, frango, batata doce...",
    },
    {
      key: "Alimentos proibidos / que nunca usar",
      label: "Alimentos proibidos / que nunca usar",
      placeholder: "Ex: nunca colocar embutidos, nem adoçante artificial...",
    },
    {
      key: "Suplementação",
      label: "Suplementação",
      placeholder: "Ex: whey só no pós-treino, creatina 5g/dia...",
    },
    {
      key: "Distribuição de macros e calorias",
      label: "Distribuição de macros e calorias",
      placeholder: "Ex: proteína 2g/kg, carbo concentrado ao redor do treino...",
    },
    {
      key: "Outras regras obrigatórias da dieta",
      label: "Outras regras obrigatórias",
      placeholder: "Qualquer regra que a IA deve seguir à risca ao montar a dieta.",
    },
  ],
};

const CAT_META: Record<Categoria, { titulo: string; icone: any; descricao: string }> = {
  treino: {
    titulo: "Base de Conhecimento — Treino",
    icone: Dumbbell,
    descricao:
      "Tudo o que você colocar aqui vira regra obrigatória para a IA quando ela montar treinos para seus alunos.",
  },
  dieta: {
    titulo: "Base de Conhecimento — Dieta",
    icone: Apple,
    descricao:
      "Tudo o que você colocar aqui vira regra obrigatória para a IA quando ela montar dietas para seus alunos.",
  },
};

const BaseConhecimento = () => {
  const { tenant } = useSiteTenant();
  const [searchParams, setSearchParams] = useSearchParams();
  const areaParam = searchParams.get("area");
  const cat: Categoria = areaParam === "dieta" ? "dieta" : "treino";
  const setCat = (c: Categoria) => setSearchParams({ area: c }, { replace: true });
  const [rows, setRows] = useState<ChunkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [modo, setModo] = useState<"arquivo" | "manual">("manual");
  const [titulo, setTitulo] = useState("");
  const [campos, setCampos] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!tenant?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("base_conhecimento_treino")
      .select("id, titulo, fonte, created_at, categoria, metadata")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) toast.error(error.message);
    setRows((data as ChunkRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  useEffect(() => {
    setCampos({});
    setTitulo("");
  }, [cat]);

  const docs: DocGroup[] = useMemo(() => {
    const map = new Map<string, DocGroup>();
    for (const r of rows) {
      const rowCat = (r.categoria || "geral") as string;
      if (rowCat !== cat && rowCat !== "geral") continue;
      const path = r.metadata?.source_path || r.fonte || r.id;
      const existing = map.get(path);
      if (existing) {
        existing.chunks += 1;
        if (r.created_at > existing.createdAt) existing.createdAt = r.created_at;
      } else {
        map.set(path, {
          sourcePath: path,
          fonte: r.fonte || r.metadata?.file || path.split("/").pop() || path,
          chunks: 1,
          createdAt: r.created_at,
          categoria: rowCat,
          manual: !!r.metadata?.manual,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [rows, cat]);

  const handleFile = async (file: File | null) => {
    if (!file || !tenant?.id) return;
    const ok = /\.(pdf|txt|md|markdown|zip)$/i.test(file.name);
    if (!ok) {
      toast.error("Formato não suportado. Use .pdf, .txt, .md ou .zip");
      return;
    }
    setUploading(true);
    try {
      const path = `${tenant.id}/${cat}/${Date.now()}-${file.name.replace(/\s+/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("base-conhecimento").upload(path, file);
      if (upErr) throw upErr;

      toast.info("Arquivo enviado. Processando conteúdo...");
      const { data, error } = await supabase.functions.invoke("ingest-knowledge", {
        body: { file_path: path, tenant_id: tenant.id, fonte: file.name, categoria: cat },
      });
      if (error) throw error;
      toast.success(`Indexado! ${data?.chunks_created ?? 0} trechos de ${data?.files_processed ?? 1} arquivo(s).`);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao enviar o documento");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleSaveManual = async () => {
    if (!tenant?.id) return;
    const blocos = CAMPOS[cat]
      .map((c) => {
        const v = (campos[c.key] || "").trim();
        return v ? `## ${c.label}\n${v}` : "";
      })
      .filter(Boolean);
    if (!blocos.length) {
      toast.error("Preencha pelo menos um campo.");
      return;
    }
    const texto = `# Regras de ${cat === "treino" ? "TREINO" : "DIETA"} do coach\n\n${blocos.join("\n\n")}`;
    if (texto.trim().length < 30) {
      toast.error("Escreva um pouco mais para a IA entender suas regras.");
      return;
    }
    setSaving(true);
    try {
      const fonte = titulo.trim() || `Regras de ${cat === "treino" ? "treino" : "dieta"} do coach`;
      const { data, error } = await supabase.functions.invoke("ingest-knowledge", {
        body: { texto, tenant_id: tenant.id, fonte, categoria: cat },
      });
      if (error) throw error;
      toast.success(`Regras salvas! ${data?.chunks_created ?? 0} trecho(s) indexado(s).`);
      setCampos({});
      setTitulo("");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Erro ao salvar as regras");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (doc: DocGroup) => {
    if (!tenant?.id) return;
    if (!confirm(`Remover "${doc.fonte}" da base de conhecimento?`)) return;
    setDeleting(doc.sourcePath);
    try {
      const { error } = await (supabase as any)
        .from("base_conhecimento_treino")
        .delete()
        .eq("tenant_id", tenant.id)
        .filter("metadata->>source_path", "eq", doc.sourcePath);
      if (error) throw error;
      if (!doc.manual && doc.sourcePath.includes("/")) {
        await supabase.storage.from("base-conhecimento").remove([doc.sourcePath]);
      }
      toast.success("Removido");
      await load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao remover");
    } finally {
      setDeleting(null);
    }
  };

  const meta = CAT_META[cat];
  const Icone = meta.icone;

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex items-center gap-3">
        <AdminBackButton to="/site/admin/dashboard" />
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Programação</p>
        <h1 className="font-display text-3xl md:text-4xl uppercase italic tracking-tighter flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" /> Base de Conhecimento
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Escolha a área abaixo e diga exatamente como a IA deve trabalhar. Você pode escrever direto na tela
          ou enviar um documento com sua metodologia.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-xl">
        {(["treino", "dieta"] as Categoria[]).map((c) => {
          const I = CAT_META[c].icone;
          const active = cat === c;
          return (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-primary bg-primary/15"
                  : "border-border/40 bg-card hover:border-primary/40"
              }`}
            >
              <I className={`h-6 w-6 mb-2 ${active ? "text-primary" : "text-muted-foreground"}`} />
              <p className="font-display uppercase italic tracking-tight text-lg leading-none">
                {c === "treino" ? "IA de Treino" : "IA de Dieta"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {c === "treino" ? "Regras para montar treinos" : "Regras para montar dietas"}
              </p>
            </button>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-5">
        <div className="flex items-start gap-3">
          <Icone className="h-6 w-6 text-primary shrink-0 mt-1" />
          <div>
            <p className="font-bold uppercase tracking-wider text-sm">{meta.titulo}</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-2xl">{meta.descricao}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={modo === "manual" ? "default" : "outline"}
            onClick={() => setModo("manual")}
            className="gap-2"
          >
            <PenLine className="h-4 w-4" /> Escrever
          </Button>
          <Button
            size="sm"
            variant={modo === "arquivo" ? "default" : "outline"}
            onClick={() => setModo("arquivo")}
            className="gap-2"
          >
            <Upload className="h-4 w-4" /> Importar arquivo
          </Button>
        </div>

        {modo === "manual" ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Nome deste conjunto de regras
              </label>
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder={`Ex: Minha metodologia de ${cat}`}
              />
            </div>

            {CAMPOS[cat].map((c) => (
              <div key={c.key} className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {c.label}
                </label>
                <Textarea
                  rows={3}
                  value={campos[c.key] || ""}
                  onChange={(e) => setCampos((p) => ({ ...p, [c.key]: e.target.value }))}
                  placeholder={c.placeholder}
                />
              </div>
            ))}

            <Button onClick={handleSaveManual} disabled={saving || !tenant?.id} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Salvando..." : "Salvar regras"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Formatos aceitos: <b>.pdf, .txt, .md, .zip</b> (o .zip pode conter vários arquivos).
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,.markdown,.zip"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={uploading || !tenant?.id} className="gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Processando..." : "Escolher arquivo"}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-bold uppercase tracking-wider">
          Material de {cat === "treino" ? "treino" : "dieta"} ({docs.length})
        </p>
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center rounded-2xl border border-border/40 bg-card">
            Nada cadastrado ainda para esta área.
          </p>
        ) : (
          <div className="space-y-2">
            {docs.map((d) => (
              <div
                key={d.sourcePath}
                className="flex items-center gap-3 p-4 rounded-xl border border-border/40 bg-card"
              >
                {d.manual ? (
                  <PenLine className="h-5 w-5 text-primary shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-primary shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{d.fonte}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.chunks} trecho{d.chunks > 1 ? "s" : ""} • {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    {d.categoria === "geral" ? " • vale para treino e dieta" : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={deleting === d.sourcePath}
                  onClick={() => handleDelete(d)}
                >
                  {deleting === d.sourcePath
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4 text-destructive" />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BaseConhecimento;
