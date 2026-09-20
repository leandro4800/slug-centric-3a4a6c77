import { supabase } from "@/integrations/supabase/client";

/** Desenha o frame atual de um <video> em um JPEG (máx. 640px de largura). */
export function frameToJpeg(video: HTMLVideoElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (!vw || !vh) return resolve(null);
      const scale = Math.min(1, 640 / vw);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(vw * scale);
      canvas.height = Math.round(vh * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.7);
    } catch {
      resolve(null);
    }
  });
}

/** Captura um frame (~1s) de um arquivo de vídeo local, antes do upload. */
export function captureVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("video")) return resolve(null);
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let done = false;
    const finish = async (ok: boolean) => {
      if (done) return;
      done = true;
      const blob = ok ? await frameToJpeg(video) : null;
      URL.revokeObjectURL(url);
      video.src = "";
      resolve(blob);
    };
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      const target = video.duration && video.duration > 1.5 ? 1 : 0;
      if (Math.abs(video.currentTime - target) < 0.05) void finish(true);
      else video.currentTime = target;
    };
    video.onseeked = () => void finish(true);
    video.onerror = () => void finish(false);
    setTimeout(() => void finish(video.readyState >= 2), 8000);
    video.src = url;
  });
}

/** Sobe a capa no Storage e devolve a URL pública (null em caso de falha). */
export async function uploadPoster(
  bucket: string,
  path: string,
  blob: Blob,
): Promise<string | null> {
  try {
    const { error } = await supabase.storage.from(bucket).upload(path, blob, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/jpeg",
    });
    if (error) throw error;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.warn("[video-poster] upload falhou", e);
    return null;
  }
}

/** Captura + upload em um passo. Nunca lança. */
export async function captureAndUploadPoster(
  file: File,
  bucket: string,
  pathPrefix: string,
): Promise<string | null> {
  try {
    const blob = await captureVideoPoster(file);
    if (!blob) return null;
    const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    return await uploadPoster(bucket, path, blob);
  } catch (e) {
    console.warn("[video-poster] captura falhou", e);
    return null;
  }
}
