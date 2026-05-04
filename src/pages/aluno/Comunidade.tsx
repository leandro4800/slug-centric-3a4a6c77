import { useState, useEffect } from "react";
import { Plus, ArrowLeft, Camera, Send, X, Heart, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Post {
  id: string;
  usuario_id: string;
  conteudo: string;
  imagem_url: string | null;
  video_url: string | null;
  tipo: string;
  criado_em: string;
  perfil?: {
    nome_completo: string;
    avatar_url: string | null;
  };
}

interface Perfil {
  id: string;
  nome_completo: string;
  avatar_url: string | null;
}

const Comunidade = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [stories, setStories] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPostText, setNewPostText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (tenant?.id) {
      fetchData();
    }
  }, [tenant?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stories (profiles from same tenant)
      const { data: profilesData, error: profilesError } = await supabase
        .from("perfis")
        .select("id, nome_completo, avatar_url")
        .eq("tenant_id", tenant?.id)
        .limit(15);

      if (profilesError) throw profilesError;
      setStories(profilesData || []);

      // Fetch posts with profile info
      const { data: postsData, error: postsError } = await supabase
        .from("comunidade_posts")
        .select(`
          *,
          perfil:perfis!usuario_id(nome_completo, avatar_url)
        `)
        .eq("profissional_id", tenant?.id)
        .order("criado_em", { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData as any || []);
    } catch (error: any) {
      console.error("Erro ao buscar dados:", error.message);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o feed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O limite é 50MB.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleCreatePost = async () => {
    if (!user || !tenant) return;
    if (!newPostText && !selectedFile) {
      toast({
        title: "Conteúdo vazio",
        description: "Escreva algo ou selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      let publicUrl = null;

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('comunidade_uploads')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('comunidade_uploads')
          .getPublicUrl(filePath);
          
        publicUrl = urlData.publicUrl;
      }

      const { error: insertError } = await supabase
        .from('comunidade_posts')
        .insert({
          usuario_id: user.id,
          conteudo: newPostText,
          imagem_url: publicUrl,
          tipo: selectedFile?.type.startsWith('video') ? 'video' : 'foto',
          profissional_id: tenant.id
        });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso!",
        description: "Seu post foi enviado.",
      });

      setNewPostText("");
      setSelectedFile(null);
      setPreviewUrl(null);
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Erro ao postar:", error.message);
      toast({
        title: "Erro ao postar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="px-5 pt-6 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-md z-10 pb-4">
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
        {stories.map((profile) => (
          <div key={profile.id} className="flex-shrink-0 flex flex-col items-center gap-1">
            <div className="w-[72px] h-[72px] rounded-full p-[3px] bg-gradient-to-tr from-primary to-primary/60">
              <div className="w-full h-full rounded-full bg-background p-[2px]">
                <Avatar className="w-full h-full">
                  <AvatarImage src={profile.avatar_url || ""} className="object-cover" />
                  <AvatarFallback className="bg-zinc-800 text-zinc-400">
                    {profile.nome_completo ? profile.nome_completo.substring(0, 2).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            <p className="text-[11px] font-medium max-w-[72px] truncate opacity-80">
              {profile.nome_completo?.split(" ")[0]}
            </p>
          </div>
        ))}
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
          posts.map((post) => (
            <div key={post.id} className="flex flex-col bg-card/30">
              {/* Post Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={post.perfil?.avatar_url || ""} />
                    <AvatarFallback className="bg-zinc-800 text-zinc-400">
                      {post.perfil?.nome_completo ? post.perfil.nome_completo.substring(0, 2).toUpperCase() : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">{post.perfil?.nome_completo}</p>
                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider">
                      {formatDistanceToNow(new Date(post.criado_em), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-zinc-400">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </div>

              {/* Post Media */}
              {post.imagem_url && (
                <div className="relative aspect-square w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
                  <img 
                    src={post.imagem_url} 
                    alt="" 
                    className="w-full h-full object-cover transition-all hover:scale-105 duration-700"
                  />
                </div>
              )}

              {/* Post Actions */}
              <div className="px-4 pt-4 pb-2">
                <div className="flex items-center gap-5">
                  <Heart className="h-6 w-6 cursor-pointer hover:text-primary transition-colors" />
                  <MessageCircle className="h-6 w-6 cursor-pointer hover:text-foreground transition-colors text-zinc-300" />
                  <Share2 className="h-6 w-6 cursor-pointer hover:text-foreground transition-colors text-zinc-300" />
                </div>
              </div>

              {/* Post Content */}
              <div className="px-4 pb-4">
                <p className="text-sm leading-relaxed text-zinc-200">
                  <span className="font-bold mr-2 text-foreground">{post.perfil?.nome_completo}</span>
                  {post.conteudo}
                </p>
              </div>
              <div className="h-[1px] bg-border/40 mx-4 mt-2"></div>
            </div>
          ))
        )}
      </div>

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
              <div className="relative rounded-2xl overflow-hidden aspect-video bg-zinc-900 border border-border">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
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
};

export default Comunidade;
