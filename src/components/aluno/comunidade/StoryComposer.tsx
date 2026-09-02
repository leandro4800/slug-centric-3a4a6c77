import { useRef, useState } from "react";
import { Camera, Send, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MAX_VIDEO_SEC = 15;
const MAX_SIZE_MB = 30;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  userId: string;
  tenantId: string;
  onPublished: () => void;
}

/** Captura o primeiro frame do vídeo como thumbnail JPEG. */
const captureThumb = (file: File): Promise<Blob | null> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.onloadeddata = () => {
      video.currentTime = 0.1;
    };
    video.onseeked = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7);
    };
    video.onerror = () => resolve(null);
  });

const readVideoDuration = (file: File): Promise<number> =>
  new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => resolve(video.duration || 0);
    video.onerror = () => resolve(0);
  });

export const StoryComposer = ({ open, onOpenChange, userId, tenantId, onPublished }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [duracao, setDuracao] = useState(5);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setTexto("");
    setDuracao(5);
  };

  const handleFile = async (f: File) => {
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: `Limite de ${MAX_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }
    if (f.type.startsWith("video")) {
      const dur = await readVideoDuration(f);
      if (dur > MAX_VIDEO_SEC + 1) {
        toast({
          title: "Vídeo muito longo",
          description: `O story aceita até ${MAX_VIDEO_SEC} segundos.`,
          variant: "destructive",
        });
        return;
      }
      setDuracao(Math.max(1, Math.round(dur || MAX_VIDEO_SEC)));
    } else {
      setDuracao(5);
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const publicar = async () => {
    if (!file && !texto.trim()) {
      toast({ title: "Story vazio", description: "Escolha uma mídia ou escreva algo.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      let mediaUrl: string | null = null;
      let thumbUrl: string | null = null;
      const isVideo = !!file?.type.startsWith("video");

      if (file) {
        const ext = file.name.split(".").pop() || (isVideo ? "mp4" : "jpg");
        const path = `${userId}/stories/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("comunidade_uploads").upload(path, file);
        if (error) throw error;
        mediaUrl = supabase.storage.from("comunidade_uploads").getPublicUrl(path).data.publicUrl;

        if (isVideo) {
          const thumb = await captureThumb(file);
          if (thumb) {
            const tPath = `${userId}/stories/${Date.now()}-thumb.jpg`;
            const { error: tErr } = await supabase.storage.from("comunidade_uploads").upload(tPath, thumb, {
              contentType: "image/jpeg",
            });
            if (!tErr) {
              thumbUrl = supabase.storage.from("comunidade_uploads").getPublicUrl(tPath).data.publicUrl;
            }
          }
        }
      }

      const { error: insErr } = await supabase.from("comunidade_stories" as any).insert({
        tenant_id: tenantId,
        user_id: userId,
        tipo: file ? (isVideo ? "video" : "foto") : "texto",
        media_url: mediaUrl,
        thumb_url: thumbUrl || (isVideo ? null : mediaUrl),
        texto: texto.trim() || null,
        duracao_seg: duracao,
      } as any);
      if (insErr) throw insErr;

      toast({ title: "Story publicado!", description: "Fica visível por 24 horas." });
      reset();
      onOpenChange(false);
      onPublished();
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="w-[95%] max-w-md overflow-hidden rounded-3xl border-border bg-background/95 p-0 backdrop-blur-xl">
        <DialogHeader className="border-b border-border p-4">
          <DialogTitle className="font-display text-lg uppercase tracking-widest text-primary">
            Novo Story
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 p-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />

          {preview ? (
            <div className="relative flex items-center justify-center overflow-hidden rounded-2xl border border-border bg-black">
              {file?.type.startsWith("video") ? (
                <video src={preview} controls playsInline className="max-h-[45vh] w-auto" />
              ) : (
                <img src={preview} alt="Prévia do story" className="max-h-[45vh] w-auto" />
              )}
              <Button
                onClick={reset}
                className="absolute right-2 top-2 h-8 w-8 rounded-full bg-black/60 p-0 hover:bg-black/80"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-sm text-muted-foreground"
            >
              <Camera className="h-6 w-6 text-primary" />
              Escolher foto ou vídeo (até {MAX_VIDEO_SEC}s)
            </button>
          )}

          <Input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escreva uma legenda…"
            maxLength={140}
          />

          <Button
            onClick={publicar}
            disabled={uploading}
            className="h-12 gap-2 rounded-full font-bold uppercase tracking-widest"
          >
            {uploading ? "Publicando…" : (<>Publicar story <Send className="h-4 w-4" /></>)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryComposer;
