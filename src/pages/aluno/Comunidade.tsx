import { useState, useEffect } from "react";
import { Plus, ArrowLeft, Camera, Send, X, Heart, MessageCircle, Share2, MoreHorizontal, Trash2, Flame, Trophy, Dumbbell, Camera as CameraIcon } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sharePostLink } from "@/lib/share";
import StoriesViewer from "@/components/aluno/comunidade/StoriesViewer";
import StoryComposer from "@/components/aluno/comunidade/StoryComposer";
import { groupStories, type StoryGroup, type StoryRow } from "@/components/aluno/comunidade/story-types";

interface Perfil {
  id: string;
  nome_completo: string;
  avatar_url: string | null;
}

interface Comentario {
  id: string;
  comentario: string;
  usuario_id: string;
  criado_em: string;
  perfil?: Perfil | null;
}

type Reacao = "like" | "forca" | "fogo" | "palmas";

const REACOES: { tipo: Reacao; emoji: string; label: string }[] = [
  { tipo: "forca", emoji: "💪", label: "Força" },
  { tipo: "fogo", emoji: "🔥", label: "Fogo" },
  { tipo: "palmas", emoji: "👏", label: "Palmas" },
];

interface Post {
  id: string;
  usuario_id: string;
  conteudo: string;
  imagem_url: string | null;
  video_url: string | null;
  tipo: string;
  criado_em: string;
  perfil?: Perfil | null;
  curtidas_count: number;
  liked_by_me: boolean;
  minha_reacao: Reacao | null;
  reacoes: Record<string, number>;
  comentarios: Comentario[];
  comentarios_count: number;
}

interface StoryItem {
  user_id: string;
  nome_completo: string | null;
  avatar_url: string | null;
  tipo: string;
  titulo: string;
  detalhe: string | null;
  criado_em: string;
}

interface MemberMeta {
  sequencia_atual: number;
  is_coach: boolean;
}

const storyIcon = (tipo: string) => {
  if (tipo === "pr") return <Trophy className="h-5 w-5 text-primary" />;
  if (tipo === "checkin") return <CameraIcon className="h-5 w-5 text-primary" />;
  return <Dumbbell className="h-5 w-5 text-primary" />;
};

const Comunidade = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const { user } = useAuth();
  const { toast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Perfil[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [meta, setMeta] = useState<Record<string, MemberMeta>>({});
  const [viewerStart, setViewerStart] = useState<number | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [postingComment, setPostingComment] = useState<Record<string, boolean>>({});
  const [openReactions, setOpenReactions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (tenant?.id && user?.id) {
      fetchData();
    }
  }, [tenant?.id, user?.id]);

  const fetchData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const { data: profilesData, error: profilesError } = await supabase
        .rpc("get_community_members", { _tenant_id: tenant.id });
      if (profilesError) throw profilesError;
      const communityProfiles = ((profilesData as Perfil[]) || []);
      const profilesById = new Map(communityProfiles.map((profile) => [profile.id, profile]));

      // Stories automáticos (conquistas das últimas 24h) + metadados (streak / coach)
      const [{ data: storiesData }, { data: metaData }] = await Promise.all([
        supabase.rpc("get_community_stories_v2" as any, { _tenant_id: tenant.id }),
        supabase.rpc("get_community_members_meta" as any, { _tenant_id: tenant.id }),
      ]);

      const rows = ((storiesData as any as StoryRow[]) || []);
      const groups = groupStories(rows).sort(
        (a, b) => Number(a.todosVistos) - Number(b.todosVistos)
      );
      setStoryGroups(groups);

      const metaMap: Record<string, MemberMeta> = {};
      ((metaData as any[]) || []).forEach((m) => {
        metaMap[m.user_id] = { sequencia_atual: m.sequencia_atual || 0, is_coach: !!m.is_coach };
      });
      setMeta(metaMap);

      // Ordena o carrossel: quem tem story ativo vem primeiro
      const withStory = new Set(groups.map((g) => g.user_id));
      setStories(
        [...communityProfiles].sort(
          (a, b) => Number(withStory.has(b.id)) - Number(withStory.has(a.id))
        )
      );

      const { data: postsData, error: postsError } = await supabase
        .from("comunidade_posts")
        .select("*")
        .eq("profissional_id", tenant.id)
        .order("criado_em", { ascending: false });
      if (postsError) throw postsError;

      const postIds = (postsData || []).map((p: any) => p.id);

      const [{ data: curtidas }, { data: comentarios }] = await Promise.all([
        postIds.length
          ? supabase.from("comunidade_curtidas").select("post_id, usuario_id, tipo_reacao").in("post_id", postIds)
          : Promise.resolve({ data: [] as any[] }),
        postIds.length
          ? supabase
              .from("comunidade_comentarios")
              .select("id, post_id, comentario, usuario_id, criado_em")
              .in("post_id", postIds)
              .order("criado_em", { ascending: true })
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const enriched: Post[] = (postsData || []).map((p: any) => {
        const cs = (curtidas || []).filter((c: any) => c.post_id === p.id);
        const cms = (comentarios || []).filter((c: any) => c.post_id === p.id);
        const mine = cs.find((c: any) => c.usuario_id === user.id);
        const reacoes: Record<string, number> = {};
        cs.forEach((c: any) => {
          const t = c.tipo_reacao || "like";
          reacoes[t] = (reacoes[t] || 0) + 1;
        });
        return {
          ...p,
          perfil: profilesById.get(p.usuario_id) || null,
          curtidas_count: cs.length,
          liked_by_me: (mine?.tipo_reacao || (mine ? "like" : null)) === "like",
          minha_reacao: (mine?.tipo_reacao as Reacao) || (mine ? "like" : null),
          reacoes,
          comentarios: cms.map((c: any) => ({ ...c, perfil: profilesById.get(c.usuario_id) || null })),
          comentarios_count: cms.length,
        };
      });
      setPosts(enriched);
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error.message);
      toast({ title: "Erro", description: "Não foi possível carregar o feed.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  /** Aplica/alterna uma reação (inclui "like"). Uma reação por usuário por post. */
  const setReacao = async (post: Post, tipo: Reacao) => {
    if (!user || !tenant) return;
    const atual = post.minha_reacao;
    const remove = atual === tipo;
    const nova: Reacao | null = remove ? null : tipo;

    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== post.id) return p;
        const reacoes = { ...p.reacoes };
        if (atual) reacoes[atual] = Math.max(0, (reacoes[atual] || 0) - 1);
        if (nova) reacoes[nova] = (reacoes[nova] || 0) + 1;
        return {
          ...p,
          reacoes,
          minha_reacao: nova,
          liked_by_me: nova === "like",
          curtidas_count: p.curtidas_count + (atual ? 0 : 1) + (remove ? -1 : 0),
        };
      })
    );
    setOpenReactions((s) => ({ ...s, [post.id]: false }));

    try {
      if (remove) {
        const { error } = await supabase
          .from("comunidade_curtidas")
          .delete()
          .eq("post_id", post.id)
          .eq("usuario_id", user.id);
        if (error) throw error;
      } else if (atual) {
        const { error } = await supabase
          .from("comunidade_curtidas")
          .update({ tipo_reacao: tipo } as any)
          .eq("post_id", post.id)
          .eq("usuario_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comunidade_curtidas").insert({
          post_id: post.id,
          usuario_id: user.id,
          profissional_id: tenant.id,
          tipo_reacao: tipo,
        } as any);
        if (error) throw error;
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
      fetchData();
    }
  };

  const sharePost = async (post: Post) => {
    const url = `${window.location.origin}/${slug}/app/comunidade?post=${post.id}`;
    const text = post.conteudo
      ? `${post.perfil?.nome_completo || "Comunidade"}: ${post.conteudo}`
      : `Confira essa publicação na comunidade ${tenant?.nome || "Alpha Coach"}`;
    await sharePostLink({
      url,
      title: tenant?.nome || "Alpha Coach Pro",
      text,
      mediaUrl: post.imagem_url || post.video_url,
      onCopied: () => toast({ title: "Link copiado!", description: "Cole onde quiser compartilhar." }),
      onError: (msg) => toast({ title: "Não foi possível compartilhar", description: msg, variant: "destructive" }),
    });
  };

  const isOwner = !!user && !!tenant?.owner_user_id && user.id === tenant.owner_user_id;
  const canDeletePost = (p: Post) => !!user && (p.usuario_id === user.id || isOwner);
  const canDeleteComment = (c: Comentario) => !!user && (c.usuario_id === user.id || isOwner);
  const isCoach = (uid?: string | null) => !!uid && (!!meta[uid]?.is_coach || uid === tenant?.owner_user_id);
  const streakOf = (uid?: string | null) => (uid ? meta[uid]?.sequencia_atual || 0 : 0);

  const deletePost = async (post: Post) => {
    const prev = posts;
    setPosts((ps) => ps.filter((p) => p.id !== post.id));
    const { error } = await supabase.from("comunidade_posts").delete().eq("id", post.id);
    if (error) {
      setPosts(prev);
      toast({ title: "Erro ao excluir post", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Post excluído" });
    }
  };

  const deleteComment = async (post: Post, comentario: Comentario) => {
    const prev = posts;
    setPosts((ps) =>
      ps.map((p) =>
        p.id === post.id
          ? { ...p, comentarios: p.comentarios.filter((c) => c.id !== comentario.id), comentarios_count: Math.max(0, p.comentarios_count - 1) }
          : p
      )
    );
    const { error } = await supabase.from("comunidade_comentarios").delete().eq("id", comentario.id);
    if (error) {
      setPosts(prev);
      toast({ title: "Erro ao excluir comentário", description: error.message, variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "O limite é 50MB.", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async () => {
    if (!user || !tenant) return;
    if (!newPostText && !selectedFile) {
      toast({ title: "Conteúdo vazio", description: "Escreva algo ou selecione uma mídia.", variant: "destructive" });
      return;
    }
    try {
      setIsUploading(true);
      let publicUrl: string | null = null;
      const isVideo = !!selectedFile?.type.startsWith("video");
      if (selectedFile) {
        const fileExt = selectedFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from("comunidade_uploads").upload(filePath, selectedFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("comunidade_uploads").getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }
      const { error: insertError } = await supabase.from("comunidade_posts").insert({
        usuario_id: user.id,
        conteudo: newPostText,
        imagem_url: isVideo ? null : publicUrl,
        video_url: isVideo ? publicUrl : null,
        tipo: isVideo ? "video" : "foto",
        profissional_id: tenant.id,
      });
      if (insertError) throw insertError;
      toast({ title: "Sucesso!", description: "Seu post foi enviado." });
      setNewPostText("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      toast({ title: "Erro ao postar", description: error.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const openStories = storyItems.filter((s) => s.user_id === openStoryUser);
  const openStoryProfile = stories.find((s) => s.id === openStoryUser);

  return (
    <div className="min-h-screen bg-transparent text-foreground pb-24">
      {/* Header */}
      <div className="px-5 pt-6 flex items-center justify-between sticky top-0 bg-background/35 backdrop-blur-md z-10 pb-4">
        <div className="flex flex-col">
          <Button
            variant="ghost"
            onClick={() => navigate(`/${slug}/app`)}
            className="text-foreground p-0 h-auto w-fit hover:bg-transparent -ml-2"
          >
            <ArrowLeft className="h-5 w-5 mr-1" /> Voltar
          </Button>
          <h1 className="font-display text-2xl mt-1 tracking-tight">COMUNIDADE</h1>
        </div>
        <div className="w-10 h-10 rounded-full border-2 border-primary p-0.5 overflow-hidden">
          <img src={tenant?.logo_url || ""} alt="" className="w-full h-full rounded-full object-cover" />
        </div>
      </div>

      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto scrollbar-hide px-5 mt-4 pb-2 border-b border-border">
        {stories.map((profile) => {
          const hasStory = storyItems.some((s) => s.user_id === profile.id);
          const streak = streakOf(profile.id);
          return (
            <button
              key={profile.id}
              onClick={() => hasStory && setOpenStoryUser(profile.id)}
              className="flex-shrink-0 flex flex-col items-center gap-1 relative"
            >
              <div
                className={`w-[72px] h-[72px] rounded-full p-[3px] ${
                  hasStory ? "bg-gradient-to-tr from-primary to-primary/60" : "bg-border"
                }`}
              >
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <Avatar className={`w-full h-full ${hasStory ? "" : "opacity-60"}`}>
                    <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400">
                      {profile.nome_completo ? profile.nome_completo.substring(0, 2).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              {streak > 1 && (
                <span className="absolute -top-1 -right-1 flex items-center gap-0.5 rounded-full bg-background border border-primary/50 px-1.5 py-[1px] text-[10px] font-bold text-primary">
                  <Flame className="h-3 w-3" />
                  {streak}
                </span>
              )}
              <p className="text-[11px] font-medium max-w-[72px] truncate opacity-80">
                {profile.nome_completo?.split(" ")[0]}
              </p>
            </button>
          );
        })}
      </div>

      {/* Feed */}
      <div className="mt-6 flex flex-col gap-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-50">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-4 text-sm uppercase tracking-widest">Carregando Feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <p>Ainda não há postagens nesta comunidade.</p>
          </div>
        ) : (
          posts.map((post) => {
            const showComments = !!openComments[post.id];
            const streak = streakOf(post.usuario_id);
            return (
              <div key={post.id} className="flex flex-col bg-card/30">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={post.perfil?.avatar_url || ""} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400">
                        {post.perfil?.nome_completo ? post.perfil.nome_completo.substring(0, 2).toUpperCase() : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{post.perfil?.nome_completo || "Usuário"}</p>
                        {isCoach(post.usuario_id) && (
                          <span className="rounded-full bg-primary px-2 py-[1px] text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                            Coach
                          </span>
                        )}
                        {streak > 1 && (
                          <span className="flex items-center gap-0.5 rounded-full border border-primary/40 px-1.5 py-[1px] text-[10px] font-bold text-primary">
                            <Flame className="h-3 w-3" /> {streak} dias
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                        {formatDistanceToNow(new Date(post.criado_em), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {canDeletePost(post) ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-destructive">
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir publicação?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. O post e seus comentários serão removidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deletePost(post)}>Excluir</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button variant="ghost" size="icon" className="text-zinc-400">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  )}
                </div>

                {post.video_url ? (
                  <div className="relative w-full bg-background flex items-center justify-center overflow-hidden">
                    <video
                      src={post.video_url}
                      controls
                      playsInline
                      className="max-h-[80vh] max-w-full h-auto w-auto object-contain"
                    />
                  </div>
                ) : post.imagem_url && (
                  <div className="relative w-full bg-background flex items-center justify-center overflow-hidden">
                    <img
                      src={post.imagem_url}
                      alt=""
                      className="max-h-[80vh] max-w-full h-auto w-auto object-contain"
                    />
                  </div>
                )}

                <div className="px-4 pt-4 pb-2">
                  <div className="flex items-center gap-5">
                    <button onClick={() => setReacao(post, "like")} className="flex items-center gap-1.5">
                      <Heart
                        className={`h-6 w-6 transition-colors ${
                          post.liked_by_me ? "fill-primary text-primary" : "text-foreground hover:text-primary"
                        }`}
                      />
                      {(post.reacoes["like"] || 0) > 0 && (
                        <span className="text-sm font-semibold">{post.reacoes["like"]}</span>
                      )}
                    </button>

                    {/* Reações rápidas */}
                    {REACOES.map((r) => {
                      const count = post.reacoes[r.tipo] || 0;
                      const active = post.minha_reacao === r.tipo;
                      return (
                        <button
                          key={r.tipo}
                          onClick={() => setReacao(post, r.tipo)}
                          aria-label={r.label}
                          className={`flex items-center gap-1 text-lg leading-none transition-transform active:scale-90 ${
                            active ? "scale-110" : "opacity-70 hover:opacity-100"
                          }`}
                        >
                          <span>{r.emoji}</span>
                          {count > 0 && (
                            <span className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>{count}</span>
                          )}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => setOpenComments((s) => ({ ...s, [post.id]: !s[post.id] }))}
                      className="flex items-center gap-1.5"
                    >
                      <MessageCircle className="h-6 w-6 text-zinc-300 hover:text-foreground transition-colors" />
                      {post.comentarios_count > 0 && (
                        <span className="text-sm font-semibold">{post.comentarios_count}</span>
                      )}
                    </button>

                    <button onClick={() => sharePost(post)} aria-label="Compartilhar" className="ml-auto">
                      <Share2 className="h-6 w-6 cursor-pointer hover:text-foreground transition-colors text-zinc-300" />
                    </button>
                  </div>
                </div>

                <div className="px-4 pb-4">
                  {post.conteudo && (
                    <p className="text-sm leading-relaxed text-zinc-200">
                      <span className="font-bold mr-2 text-foreground">{post.perfil?.nome_completo}</span>
                      {post.conteudo}
                    </p>
                  )}

                  {!showComments && post.comentarios_count > 0 && (
                    <button
                      onClick={() => setOpenComments((s) => ({ ...s, [post.id]: true }))}
                      className="text-xs text-zinc-500 mt-2 hover:text-zinc-300"
                    >
                      Ver {post.comentarios_count} comentário{post.comentarios_count > 1 ? "s" : ""}
                    </button>
                  )}

                  {showComments && (
                    <div className="mt-3 flex flex-col gap-3">
                      {post.comentarios.map((c) => (
                        <div key={c.id} className="flex gap-2 items-start group">
                          <Avatar className="w-7 h-7">
                            <AvatarImage src={c.perfil?.avatar_url || ""} />
                            <AvatarFallback className="bg-zinc-800 text-[10px]">
                              {c.perfil?.nome_completo?.substring(0, 2).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-sm leading-snug">
                            <span className="font-semibold mr-1">{c.perfil?.nome_completo || "Usuário"}</span>
                            {isCoach(c.usuario_id) && (
                              <span className="mr-2 rounded-full bg-primary px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wider text-primary-foreground align-middle">
                                Coach
                              </span>
                            )}
                            <span className="text-zinc-300">{c.comentario}</span>
                          </div>
                          {canDeleteComment(c) && (
                            <button
                              onClick={() => deleteComment(post, c)}
                              className="opacity-60 hover:opacity-100 hover:text-destructive transition-opacity"
                              aria-label="Excluir comentário"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}

                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          placeholder="Escreva um comentário..."
                          value={commentDrafts[post.id] || ""}
                          onChange={(e) => setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submitComment(post);
                            }
                          }}
                          className="bg-transparent border-border h-9 text-sm"
                        />
                        <Button
                          size="sm"
                          onClick={() => submitComment(post)}
                          disabled={postingComment[post.id] || !(commentDrafts[post.id] || "").trim()}
                          className="bg-primary hover:bg-primary/90 h-9 px-3"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="h-[1px] bg-border/40 mx-4 mt-2"></div>
              </div>
            );
          })
        )}
      </div>

      {/* Story de conquista */}
      <Dialog open={!!openStoryUser} onOpenChange={(o) => !o && setOpenStoryUser(null)}>
        <DialogContent className="bg-background/95 backdrop-blur-xl border-border text-foreground max-w-sm w-[92%] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-left">
              <Avatar className="w-10 h-10 border border-primary">
                <AvatarImage src={openStoryProfile?.avatar_url || ""} />
                <AvatarFallback className="bg-zinc-800 text-xs">
                  {openStoryProfile?.nome_completo?.substring(0, 2).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-base font-semibold">{openStoryProfile?.nome_completo || "Atleta"}</p>
                <p className="text-[11px] uppercase tracking-widest text-primary">Conquistas de hoje</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {streakOf(openStoryUser) > 1 && (
              <div className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3">
                <Flame className="h-5 w-5 text-primary" />
                <p className="text-sm font-bold">{streakOf(openStoryUser)} dias seguidos treinando</p>
              </div>
            )}
            {openStories.map((s, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card/40 px-4 py-3">
                {storyIcon(s.tipo)}
                <div className="flex-1">
                  <p className="text-sm font-semibold">{s.titulo}</p>
                  {s.detalhe && <p className="text-xs text-zinc-400">{s.detalhe}</p>}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-zinc-500">
                  {formatDistanceToNow(new Date(s.criado_em), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
            ))}
            {openStories.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500">Nenhuma conquista nas últimas 24h.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB */}
      <Button
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full p-0 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 z-20"
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* New Post Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-background/90 backdrop-blur-xl border-border text-foreground max-w-md w-[95%] rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b border-border flex flex-row items-center justify-between">
            <DialogTitle className="text-lg font-display uppercase tracking-widest text-primary">Nova Publicação</DialogTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="text-zinc-400">
              <X className="h-5 w-5" />
            </Button>
          </DialogHeader>

          <div className="p-5 flex flex-col gap-4">
            <div className="flex gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="bg-zinc-800">
                  {user?.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Textarea
                placeholder="O que você está treinando hoje?"
                className="flex-1 bg-transparent border-none focus-visible:ring-0 text-base resize-none min-h-[120px] p-0 placeholder:text-zinc-600"
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
              />
            </div>

            {previewUrl && (
              <div className="relative rounded-2xl overflow-hidden bg-background border border-border flex items-center justify-center">
                {selectedFile?.type.startsWith("video") ? (
                  <video src={previewUrl} controls playsInline className="max-h-[50vh] max-w-full h-auto w-auto object-contain" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-[50vh] max-w-full h-auto w-auto object-contain" />
                )}
                <Button
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/60 backdrop-blur-md p-0 hover:bg-background/80"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-2">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 hover:bg-zinc-800 cursor-pointer transition-colors text-xs font-semibold"
                >
                  <Camera className="h-4 w-4 text-primary" />
                  ADICIONAR MÍDIA
                </label>
              </div>

              <Button
                disabled={isUploading || (!newPostText && !selectedFile)}
                onClick={handleCreatePost}
                className="bg-primary hover:bg-primary/90 rounded-full px-6 flex gap-2 font-bold tracking-tight"
              >
                {isUploading ? "ENVIANDO..." : (
                  <>
                    POSTAR <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function submitComment(post: Post) {
    return (async () => {
      if (!user || !tenant) return;
      const text = (commentDrafts[post.id] || "").trim();
      if (!text) return;
      setPostingComment((p) => ({ ...p, [post.id]: true }));
      try {
        const { data, error } = await supabase
          .from("comunidade_comentarios")
          .insert({
            post_id: post.id,
            usuario_id: user.id,
            comentario: text,
            profissional_id: tenant.id,
          })
          .select(`id, comentario, usuario_id, criado_em, perfil:perfis!usuario_id(id, nome_completo, avatar_url)`)
          .single();
        if (error) throw error;
        setPosts((prev) =>
          prev.map((p) =>
            p.id === post.id
              ? { ...p, comentarios: [...p.comentarios, data as any], comentarios_count: p.comentarios_count + 1 }
              : p
          )
        );
        setCommentDrafts((d) => ({ ...d, [post.id]: "" }));
      } catch (e: any) {
        toast({ title: "Erro ao comentar", description: e.message, variant: "destructive" });
      } finally {
        setPostingComment((p) => ({ ...p, [post.id]: false }));
      }
    })();
  }
};

export default Comunidade;
