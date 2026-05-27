import { useEffect, useState } from "react";
import { ArrowLeft, Save, Trash2, Plus, Video, Search, FileText, ClipboardList } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useBranding } from "@/contexts/BrandingProvider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VideoReferencia {
  id: string;
  nome_exercicio: string;
  url_video: string;
}

import { AdminBackButton } from "@/components/admin/AdminBackButton";

const AdminVideosTecnicos = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { tenant } = useBranding();
  const [videos, setVideos] = useState<VideoReferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [novoNome, setNovoNome] = useState("");
  const [novoUrl, setNovoUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [bulkData, setBulkData] = useState("");

  const loadVideos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("referencia_exercicios")
        .select("id, nome_exercicio, url_video")
        .order("nome_exercicio", { ascending: true });

      if (error) throw error;
      setVideos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar vídeos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleAdd = async () => {
    if (!novoNome.trim() || !novoUrl.trim()) {
      toast.error("Preencha o nome e a URL");
      return;
    }

    try {
      const { error } = await supabase
        .from("referencia_exercicios")
        .insert({
          nome_exercicio: novoNome.trim(),
          url_video: novoUrl.trim()
        });

      if (error) throw error;

      toast.success("Vídeo adicionado com sucesso!");
      setNovoNome("");
      setNovoUrl("");
      setIsAdding(false);
      loadVideos();
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    }
  };

  const handleBulkImport = async () => {
    if (!bulkData.trim()) {
      toast.error("Cole os dados primeiro");
      return;
    }

    const lines = bulkData.split('\n').filter(line => line.trim());
    const toInsert = lines.map(line => {
      // Tenta separar por tab ou vírgula
      const parts = line.includes('\t') ? line.split('\t') : line.split(';');
      if (parts.length >= 2) {
        return {
          nome_exercicio: parts[0].trim(),
          url_video: parts[1].trim()
        };
      }
      return null;
    }).filter(item => item !== null);

    if (toInsert.length === 0) {
      toast.error("Formato inválido. Use: Nome do Exercício [TAB ou ;] URL");
      return;
    }

    try {
      const { error } = await supabase
        .from("referencia_exercicios")
        .insert(toInsert as any);

      if (error) throw error;

      toast.success(`${toInsert.length} exercícios importados!`);
      setBulkData("");
      setIsBulkMode(false);
      loadVideos();
    } catch (error: any) {
      toast.error("Erro na importação: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja remover este vídeo?")) return;

    try {
      const { error } = await supabase
        .from("referencia_exercicios")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Vídeo removido");
      loadVideos();
    } catch (error: any) {
      toast.error("Erro ao remover: " + error.message);
    }
  };

  const filteredVideos = videos.filter(v => 
    v.nome_exercicio.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-5 pt-6 pb-32 bg-black min-h-screen">
      <AdminBackButton 
        to={`/${slug}/app/controle`}
        className="mb-8"
        showLabel
        variant="ghost"
      />

      <div className="flex items-center gap-2 text-primary/80">
        <Video className="h-4 w-4" />
        <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Biblioteca Técnica</span>
      </div>
      <h1 className="font-display text-4xl mt-2 text-white leading-tight">
        VÍDEOS <span className="text-primary">TECNICOS</span>
      </h1>
      <p className="text-muted-foreground text-sm mt-2 max-w-md">
        Cadastre os vídeos que serão exibidos automaticamente quando um aluno realizar um exercício com o mesmo nome.
      </p>
      
      <div className="h-px bg-primary/20 mt-6" />

      <div className="mt-8 space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              placeholder="Buscar exercício..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-card/40 border border-white/10 rounded-none pl-10 pr-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => { setIsAdding(!isAdding); setIsBulkMode(false); }}
              variant={isAdding ? "default" : "outline"}
              className="rounded-none h-auto px-4"
            >
              <Plus className="h-5 w-5 mr-2" /> NOVO
            </Button>
            <Button 
              onClick={() => { setIsBulkMode(!isBulkMode); setIsAdding(false); }}
              variant={isBulkMode ? "default" : "outline"}
              className="rounded-none h-auto px-4"
            >
              <ClipboardList className="h-5 w-5 mr-2" /> COLAR LISTA
            </Button>
          </div>
        </div>

        {isAdding && (
          <div className="bg-card/40 border border-primary/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold block mb-1">Nome do Exercício</label>
                <input
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Ex: Supino Reto com Barra"
                  className="w-full bg-black border border-white/10 rounded-none px-3 py-2 text-sm text-white focus:border-primary/50 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-primary font-bold block mb-1">URL do Vídeo</label>
                <input
                  value={novoUrl}
                  onChange={(e) => setNovoUrl(e.target.value)}
                  placeholder="https://youtube.com/..."
                  className="w-full bg-black border border-white/10 rounded-none px-3 py-2 text-sm text-white focus:border-primary/50 outline-none transition-all"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd} className="flex-1 rounded-none">
                <Save className="h-4 w-4 mr-2" /> Salvar Exercício
              </Button>
              <Button onClick={() => setIsAdding(false)} variant="outline" className="rounded-none">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {isBulkMode && (
          <div className="bg-card/40 border border-primary/30 p-4 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-primary font-bold block mb-1">Importação em Massa</label>
              <p className="text-[10px] text-muted-foreground mb-2">Cole as linhas no formato: Nome do Exercício [TAB] URL do Vídeo (direto do Excel ou Sheets)</p>
              <textarea
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder={"Supino Reto\thttps://youtube.com/...\nAgachamento Livre\thttps://youtube.com/..."}
                rows={6}
                className="w-full bg-black border border-white/10 rounded-none px-3 py-2 text-xs text-white focus:border-primary/50 outline-none transition-all font-mono"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleBulkImport} className="flex-1 rounded-none">
                <FileText className="h-4 w-4 mr-2" /> Importar Tudo
              </Button>
              <Button onClick={() => setIsBulkMode(false)} variant="outline" className="rounded-none">
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-3 mt-6">
          {loading ? (
            <p className="text-center text-muted-foreground py-10 animate-pulse">Carregando biblioteca...</p>
          ) : filteredVideos.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10">
              <p className="text-muted-foreground text-sm italic">Nenhum exercício encontrado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredVideos.map((video) => (
                <div 
                  key={video.id} 
                  className="group flex flex-col md:flex-row md:items-center gap-4 bg-card/20 border border-white/5 p-4 hover:border-primary/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg text-white group-hover:text-primary transition-all">
                      {video.nome_exercicio.toUpperCase()}
                    </h3>
                    <p className="text-[10px] text-muted-foreground truncate font-mono uppercase tracking-tighter mt-1 opacity-60">
                      {video.url_video}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a 
                      href={video.url_video} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex-1 md:flex-none h-10 px-4 bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest flex items-center justify-center hover:bg-primary/20 transition-all"
                    >
                      Testar Link
                    </a>
                    <button 
                      onClick={() => handleDelete(video.id)}
                      className="w-10 h-10 flex items-center justify-center text-red-500/50 hover:text-red-500 transition-all border border-red-500/20 hover:border-red-500/50 bg-red-500/5"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminVideosTecnicos;
