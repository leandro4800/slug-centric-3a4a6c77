import { useEffect, useMemo, useState } from "react";
import { Video, Plus, Trash2, Save, Search, Play, Pencil, X, Globe, Upload, Link2, Users, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSiteTenant } from "@/hooks/use-site-tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { buildVlogEmbedUrl, normalizeVideoUrl } from "@/lib/video-embed";
import { isDirectVideo } from "@/lib/utils";
import { FIGHT_MODALIDADES, modalidadeLabel } from "@/lib/fightModalidades";

interface VideoRow {
  id: string;
  nome_exercicio: string;
  url_video: string | null;
  tenant_id: string | null;
  origem: string | null;
  storage_path: string | null;
  modalidade: string | null;
  valencia: string | null;
}

interface PrescritoRow {
  id: string;
  aluno_id: string;
  dia_semana: string;
  ordem: number | null;
  exercicio: string;
  video_url: string | null;
  video_coach_url: string | null;
}

interface AlunoRow {
  id: string;
  nome_completo: string | null;
  email: string | null;
}

const STORAGE_BUCKET = "comunidade_uploads";

const STOP = ["com", "sem", "dos", "das", "para", "pelo", "pela", "reto", "livre", "barra", "halter", "halteres", "maquina", "cabo", "polia", "banco", "pulley"];

const normTokens = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.includes(w));

const VideosTecnicos = () => {
  const { tenant } = useSiteTenant();
  const isAppAdmin = tenant?.slug === "alphateam";
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const filterStorageKey = `videos-tecnicos-filtro:${tenant?.id ?? "sem-tenant"}`;
  const [filter, setFilter] = useState<"todos" | "app" | "meus">(() => {
    const fallback: "todos" | "meus" = tenant?.slug === "alphateam" ? "todos" : "meus";
    if (typeof window === "undefined") return fallback;
    try {
      const saved = window.localStorage.getItem(filterStorageKey);
      if (saved === "todos" || saved === "app" || saved === "meus") return saved;
    } catch {}
    return fallback;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(filterStorageKey, filter);
    } catch {}
  }, [filter, filterStorageKey]);
  // Fonte de vídeos que os ALUNOS enxergam (travada no tenant, persiste até
  // o coach trocar manualmente): ambos | meus | app.
  const [fonteAlunos, setFonteAlunos] = useState<"ambos" | "meus" | "app">("ambos");
  const onlyMine = fonteAlunos === "meus";
  const [savingPref, setSavingPref] = useState(false);
  const [tab, setTab] = useState<"biblioteca" | "alunos">("biblioteca");

  const [isAdding, setIsAdding] = useState(false);
  const [modo, setModo] = useState<"link" | "upload">("link");
  const [novoNome, setNovoNome] = useState("");
  const [novoUrl, setNovoUrl] = useState("");
  const [novoArquivo, setNovoArquivo] = useState<File | null>(null);
  const [novaModalidade, setNovaModalidade] = useState<string>("");
  const [novaValencia, setNovaValencia] = useState<string>("");
  const [vertical, setVertical] = useState<string>("personal");
  const [filtroModalidade, setFiltroModalidade] = useState<string>("todas");
  const [uploading, setUploading] = useState(false);

  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  // Aba alunos
  const [alunos, setAlunos] = useState<AlunoRow[]>([]);
  const [alunoId, setAlunoId] = useState<string>("");
  const [prescritos, setPrescritos] = useState<PrescritoRow[]>([]);
  const [loadingPresc, setLoadingPresc] = useState(false);
  const [openPresc, setOpenPresc] = useState<string | null>(null);
  const [fixUrl, setFixUrl] = useState("");
  const [savingFix, setSavingFix] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const load = async () => {
    if (!tenant?.id) return;
    try {
      setLoading(true);
      const { data: t } = await supabase
        .from("tenants")
        .select("usar_apenas_meus_videos, videos_fonte_alunos, vertical")
        .eq("id", tenant.id)
        .maybeSingle();
      const fonte = (t as any)?.videos_fonte_alunos as string | undefined;
      setFonteAlunos(
        fonte === "meus" || fonte === "app"
          ? fonte
          : (t as any)?.usar_apenas_meus_videos
            ? "meus"
            : "ambos",
      );
      setVertical(String((t as any)?.vertical || "personal"));

      const { data, error } = await supabase
        .from("referencia_exercicios")
        .select("id, nome_exercicio, url_video, tenant_id, origem, storage_path, modalidade, valencia")
        .or(`tenant_id.is.null,tenant_id.eq.${tenant.id}`)
        .order("nome_exercicio", { ascending: true });
      if (error) throw error;
      setRows((data || []) as VideoRow[]);
    } catch (e: any) {
      toast.error("Erro ao carregar vídeos: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAlunos = async () => {
    if (!tenant?.id) return;
    const { data } = await supabase
      .from("perfis")
      .select("id, nome_completo, email")
      .eq("tenant_id", tenant.id)
      .order("nome_completo", { ascending: true });
    setAlunos((data as AlunoRow[]) || []);
  };

  useEffect(() => {
    load();
    loadAlunos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  const loadPrescritos = async (id: string) => {
    if (!tenant?.id || !id) return;
    setLoadingPresc(true);
    const { data, error } = await supabase
      .from("treinos_prescritos")
      .select("id, aluno_id, dia_semana, dia_ordem, ordem, exercicio, video_url, video_coach_url")
      .eq("aluno_id", id)
      .eq("tenant_id", tenant.id)
      .order("dia_ordem", { nullsFirst: false })
      .order("ordem");
    setLoadingPresc(false);
    if (error) return toast.error("Erro ao carregar treinos: " + error.message);
    setPrescritos((data as PrescritoRow[]) || []);
  };

  // Espelha a lógica do app do aluno: prioridade dos vídeos do coach.
  const libEntries = useMemo(() => {
    const usable = rows
      .filter((r) => r.url_video)
      .filter((r) =>
        fonteAlunos === "meus"
          ? r.tenant_id === tenant?.id
          : fonteAlunos === "app"
            ? r.tenant_id === null
            : true,
      );
    return [...usable]
      .sort((a, b) => (a.tenant_id ? 0 : 1) - (b.tenant_id ? 0 : 1))
      .map((r) => ({ tokens: normTokens(r.nome_exercicio), row: r }))
      .filter((e) => e.tokens.length > 0);
  }, [rows, fonteAlunos, tenant?.id]);

  const matchLibrary = (nome: string): VideoRow | null => {
    const tokens = normTokens(nome);
    if (!tokens.length) return null;
    let best: VideoRow | null = null;
    let bestScore = 0;
    for (const e of libEntries) {
      const overlap = e.tokens.filter((t) => tokens.includes(t)).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        best = e.row;
      }
    }
    return bestScore >= 1 ? best : null;
  };

  const resolvePresc = (p: PrescritoRow) => {
    if (p.video_coach_url) return { url: p.video_coach_url, fonte: "Manual (coach)" };
    if (p.video_url) return { url: p.video_url, fonte: "Manual (prescrição)" };
    const m = matchLibrary(p.exercicio);
    if (m?.url_video) return { url: m.url_video, fonte: m.tenant_id ? `Biblioteca — ${m.nome_exercicio}` : `Do App — ${m.nome_exercicio}` };
    return { url: null as string | null, fonte: "Nenhum vídeo encontrado" };
  };

  const toggleOnlyMine = async () => {
    if (!tenant?.id) return;
    const next = !onlyMine;
    try {
      setSavingPref(true);
      const { error } = await supabase
        .from("tenants")
        .update({ usar_apenas_meus_videos: next } as any)
        .eq("id", tenant.id);
      if (error) throw error;
      setOnlyMine(next);
      toast.success(next ? "Seus alunos verão apenas os SEUS vídeos" : "Vídeos do app reativados para seus alunos");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSavingPref(false);
    }
  };

  const uploadArquivo = async (file: File) => {
    if (!userId) throw new Error("Usuário não autenticado");
    const ext = file.name.split(".").pop() || "mp4";
    const path = `${userId}/videos-tecnicos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "video/mp4",
    });
    if (error) throw error;
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, path };
  };

  const handleAdd = async () => {
    if (!tenant?.id) return toast.error("Tenant não identificado");
    if (!novoNome.trim()) return toast.error("Informe o nome do exercício");
    if (modo === "link" && !novoUrl.trim()) return toast.error("Informe a URL do vídeo");
    if (modo === "upload" && !novoArquivo) return toast.error("Selecione um arquivo");

    try {
      setUploading(true);
      let url = novoUrl.trim();
      let storagePath: string | null = null;
      let origem = "youtube";
      if (modo === "upload" && novoArquivo) {
        const up = await uploadArquivo(novoArquivo);
        url = up.url;
        storagePath = up.path;
        origem = "upload";
      } else if (url.includes("drive.google.com")) {
        origem = "drive";
      }

      const { error } = await supabase.from("referencia_exercicios").insert({
        nome_exercicio: novoNome.trim(),
        url_video: url,
        tenant_id: tenant.id,
        profissional_id: userId,
        origem,
        storage_path: storagePath,
        modalidade: isFight ? novaModalidade || null : null,
        valencia: isFight ? novaValencia.trim() || null : null,
      } as any);
      if (error) throw error;
      toast.success("Vídeo adicionado!");
      setNovoNome("");
      setNovoUrl("");
      setNovoArquivo(null);
      setNovaModalidade("");
      setNovaValencia("");
      setIsAdding(false);
      load();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (v: VideoRow) => {
    setEditId(v.id);
    setEditNome(v.nome_exercicio);
    setEditUrl(v.url_video || "");
  };

  const saveEdit = async () => {
    if (!editId) return;
    if (!editNome.trim() || !editUrl.trim()) return toast.error("Preencha nome e URL");
    try {
      const { error } = await supabase
        .from("referencia_exercicios")
        .update({ nome_exercicio: editNome.trim(), url_video: editUrl.trim() } as any)
        .eq("id", editId);
      if (error) throw error;
      toast.success("Vídeo atualizado");
      setEditId(null);
      load();
    } catch (e: any) {
      toast.error("Erro ao atualizar: " + e.message);
    }
  };

  const handleDelete = async (v: VideoRow) => {
    if (v.tenant_id === null && !isAppAdmin) return toast.error("Vídeos do app não podem ser removidos");
    if (!confirm(`Remover "${v.nome_exercicio}"?`)) return;
    try {
      if (v.storage_path) await supabase.storage.from(STORAGE_BUCKET).remove([v.storage_path]);
      const { error } = await supabase.from("referencia_exercicios").delete().eq("id", v.id);
      if (error) throw error;
      toast.success("Vídeo removido");
      load();
    } catch (e: any) {
      toast.error("Erro ao remover: " + e.message);
    }
  };

  const saveFix = async (p: PrescritoRow, url: string | null) => {
    try {
      setSavingFix(true);
      const { error } = await supabase
        .from("treinos_prescritos")
        .update({ video_coach_url: url } as any)
        .eq("id", p.id);
      if (error) throw error;
      toast.success(url ? "Vídeo corrigido para o aluno" : "Correção removida");
      setFixUrl("");
      setPrescritos((prev) => prev.map((x) => (x.id === p.id ? { ...x, video_coach_url: url } : x)));
    } catch (e: any) {
      toast.error("Erro ao corrigir: " + e.message);
    } finally {
      setSavingFix(false);
    }
  };

  const isFight = vertical === "fight";

  const filtered = useMemo(
    () =>
      rows
        .filter((v) => v.nome_exercicio.toLowerCase().includes(search.toLowerCase()))
        .filter((v) =>
          filter === "app" ? v.tenant_id === null : filter === "meus" ? v.tenant_id !== null : true,
        )
        .filter((v) =>
          !isFight || filtroModalidade === "todas"
            ? true
            : filtroModalidade === "musculacao"
              ? !v.modalidade
              : v.modalidade === filtroModalidade,
        ),
    [rows, search, filter, isFight, filtroModalidade],
  );

  const renderVideo = (rawUrl: string | null | undefined, title: string) => {
    const url = normalizeVideoUrl(rawUrl);
    if (!url) return <p className="text-sm text-muted-foreground">Sem URL de vídeo.</p>;
    if (isDirectVideo(url)) {
      return <video src={url} controls playsInline className="w-full max-h-[360px] bg-black" />;
    }
    const embed = buildVlogEmbedUrl(url, { userInitiated: true, autoplay: false });
    if (!embed) {
      return (
        <a href={url} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
          Abrir vídeo em nova aba
        </a>
      );
    }
    return (
      <iframe
        src={embed}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full aspect-video bg-black"
      />
    );
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-2 text-primary/80">
        <Video className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Programação</span>
      </div>
      <h1 className="font-display text-3xl mt-1">Exercícios & Vídeos Técnicos</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Cadastre, edite, visualize e remova os vídeos que o aluno vê em cada exercício do treino.
      </p>

      <div className="mt-5 flex gap-2">
        {(["biblioteca", "alunos"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-[10px] uppercase tracking-widest font-bold border transition-all ${
              tab === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card/40 text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {t === "biblioteca" ? "Biblioteca" : "Vídeos dos alunos"}
          </button>
        ))}
      </div>

      {tab === "biblioteca" ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2 items-center">
            {((isAppAdmin ? ["todos", "meus", "app"] : ["meus", "app"]) as ("todos" | "meus" | "app")[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border transition-all ${
                  filter === f
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card/40 text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                {f === "todos" ? "Todos" : f === "meus" ? "Meus vídeos" : "Do App"}
              </button>
            ))}
            <button
              onClick={toggleOnlyMine}
              disabled={savingPref}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border transition-all ${
                onlyMine
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card/40 text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              Só meus p/ alunos {onlyMine ? "(ativo)" : ""}
            </button>
            <span className="text-[11px] text-muted-foreground">
              {onlyMine
                ? "Alunos veem somente os seus vídeos."
                : "Alunos veem vídeos do app + os seus (os seus têm prioridade)."}
            </span>
          </div>

          {isFight && (
            <div className="mt-4 flex flex-wrap gap-2">
              {(["todas", "musculacao", ...FIGHT_MODALIDADES.map((m) => m.slug)] as string[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setFiltroModalidade(m)}
                  className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold border transition-all ${
                    filtroModalidade === m
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card/40 text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {m === "todas" ? "Todas" : m === "musculacao" ? "Musculação" : modalidadeLabel(m)}
                </button>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar exercício..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => setIsAdding((v) => !v)} variant={isAdding ? "default" : "outline"}>
              <Plus className="h-4 w-4 mr-2" /> Novo vídeo
            </Button>
          </div>

          {isAdding && (
            <div className="mt-4 border border-primary/30 bg-card/40 p-4 space-y-3">
              <div className="flex gap-2">
                <Button size="sm" variant={modo === "link" ? "default" : "outline"} onClick={() => setModo("link")}>
                  <Link2 className="h-3 w-3 mr-1" /> Link
                </Button>
                <Button size="sm" variant={modo === "upload" ? "default" : "outline"} onClick={() => setModo("upload")}>
                  <Upload className="h-3 w-3 mr-1" /> Upload
                </Button>
              </div>
              <Input placeholder="Nome do exercício" value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
              {isFight && (
                <div className="grid md:grid-cols-2 gap-2">
                  <select
                    value={novaModalidade}
                    onChange={(e) => setNovaModalidade(e.target.value)}
                    className="bg-card border border-border px-3 py-2 text-sm"
                  >
                    <option value="">Musculação / geral (sem modalidade)</option>
                    {FIGHT_MODALIDADES.map((m) => (
                      <option key={m.slug} value={m.slug}>{m.label}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="Valência (ex: POTÊNCIA DE QUADRIL)"
                    value={novaValencia}
                    onChange={(e) => setNovaValencia(e.target.value)}
                  />
                </div>
              )}
              {modo === "link" ? (
                <Input
                  placeholder="https://youtube.com/... ou https://drive.google.com/..."
                  value={novoUrl}
                  onChange={(e) => setNovoUrl(e.target.value)}
                />
              ) : (
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setNovoArquivo(e.target.files?.[0] ?? null)}
                  className="w-full text-sm"
                />
              )}
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={uploading}>
                  <Save className="h-4 w-4 mr-2" /> {uploading ? "Enviando..." : "Salvar"}
                </Button>
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="text-muted-foreground animate-pulse">Carregando biblioteca...</p>
            ) : filtered.length === 0 ? (
              <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Nenhum exercício encontrado.
              </div>
            ) : (
              filtered.map((v) => {
                const isGlobal = v.tenant_id === null;
                const canManage = !isGlobal || isAppAdmin;
                const isEditing = editId === v.id;
                return (
                  <div key={v.id} className="border border-border bg-card/30 p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold border ${
                            isGlobal ? "text-muted-foreground border-border" : "text-primary border-primary/40"
                          }`}
                        >
                          {isGlobal ? (
                            <>
                              <Globe className="h-2.5 w-2.5 inline mr-1" />App
                            </>
                          ) : (
                            v.origem || "meu"
                          )}
                        </span>
                        {isEditing ? (
                          <div className="mt-2 space-y-2">
                            <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
                            <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
                          </div>
                        ) : (
                          <>
                            {v.modalidade && (
                              <span className="ml-2 text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold border text-primary border-primary/40">
                                {modalidadeLabel(v.modalidade)}{v.valencia ? ` · ${v.valencia}` : ""}
                              </span>
                            )}
                            <h3 className="font-semibold mt-1 truncate">{v.nome_exercicio}</h3>
                            <p className="text-[11px] text-muted-foreground truncate">{v.url_video}</p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPreviewId(previewId === v.id ? null : v.id)}
                        >
                          <Play className="h-4 w-4 mr-1" /> {previewId === v.id ? "Fechar" : "Ver"}
                        </Button>
                        {!canManage ? (
                          <span className="text-[10px] text-muted-foreground">Vídeo do app</span>
                        ) : isEditing ? (
                          <>
                            <Button size="sm" onClick={saveEdit}>
                              <Save className="h-4 w-4 mr-1" /> Salvar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" onClick={() => startEdit(v)}>
                              <Pencil className="h-4 w-4 mr-1" /> Editar
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(v)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Excluir
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {previewId === v.id && <div className="mt-3">{renderVideo(v.url_video, v.nome_exercicio)}</div>}
                  </div>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap gap-2 items-center">
            <Users className="h-4 w-4 text-primary" />
            <select
              value={alunoId}
              onChange={(e) => {
                setAlunoId(e.target.value);
                setOpenPresc(null);
                loadPrescritos(e.target.value);
              }}
              className="bg-card border border-border px-3 py-2 text-sm min-w-[260px]"
            >
              <option value="">Selecione um aluno...</option>
              {alunos.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nome_completo || a.email || a.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Mostra exatamente o vídeo que o aluno vê em cada exercício. Se estiver errado, use "Corrigir".
          </p>

          <div className="mt-5 space-y-3">
            {loadingPresc ? (
              <p className="text-muted-foreground animate-pulse">Carregando treinos...</p>
            ) : !alunoId ? null : prescritos.length === 0 ? (
              <div className="border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Este aluno ainda não tem treino prescrito.
              </div>
            ) : (
              prescritos.map((p) => {
                const res = resolvePresc(p);
                const isOpen = openPresc === p.id;
                return (
                  <div key={p.id} className="border border-border bg-card/30 p-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <span className="text-[9px] px-2 py-0.5 uppercase tracking-widest font-bold border text-muted-foreground border-border">
                          {p.dia_semana}
                        </span>
                        <h3 className="font-semibold mt-1 truncate">{p.exercicio}</h3>
                        <p
                          className={`text-[11px] truncate ${
                            res.url ? "text-muted-foreground" : "text-destructive"
                          }`}
                        >
                          {res.fonte}
                          {res.url ? ` — ${res.url}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setOpenPresc(isOpen ? null : p.id);
                            setFixUrl(p.video_coach_url || "");
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" /> {isOpen ? "Fechar" : "Ver / Corrigir"}
                        </Button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className="mt-3 space-y-3">
                        {renderVideo(res.url, p.exercicio)}
                        <div className="border border-primary/30 bg-card/40 p-3 space-y-2">
                          <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-primary">
                            <Wand2 className="h-3 w-3" /> Corrigir vídeo deste exercício
                          </div>
                          <select
                            value=""
                            onChange={(e) => e.target.value && setFixUrl(e.target.value)}
                            className="w-full bg-card border border-border px-3 py-2 text-sm"
                          >
                            <option value="">Escolher da biblioteca...</option>
                            {rows
                              .filter((r) => r.url_video)
                              .map((r) => (
                                <option key={r.id} value={r.url_video as string}>
                                  {r.tenant_id ? "[Meu] " : "[App] "}
                                  {r.nome_exercicio}
                                </option>
                              ))}
                          </select>
                          <Input
                            placeholder="ou cole uma URL de vídeo"
                            value={fixUrl}
                            onChange={(e) => setFixUrl(e.target.value)}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" disabled={savingFix || !fixUrl.trim()} onClick={() => saveFix(p, fixUrl.trim())}>
                              <Save className="h-4 w-4 mr-1" /> Salvar correção
                            </Button>
                            {p.video_coach_url && (
                              <Button size="sm" variant="outline" disabled={savingFix} onClick={() => saveFix(p, null)}>
                                <X className="h-4 w-4 mr-1" /> Remover correção
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VideosTecnicos;
