import { extractYouTubeId } from "@/lib/utils";

/**
 * Capa de uma vídeo-aula do Dojo.
 * Regra: se o coach informou uma imagem válida, usa ela. Se ele colou um link de
 * vídeo (YouTube/Shorts) no campo de capa, ou não informou nada, derivamos a
 * thumbnail do YouTube a partir do vídeo — assim a prévia sempre aparece.
 */
export const dojoThumb = (
  capaUrl?: string | null,
  videoUrl?: string | null,
): string | null => {
  const capa = (capaUrl || "").trim();
  const ytFromCapa = extractYouTubeId(capa);
  if (capa && !ytFromCapa) return capa;
  const id = ytFromCapa || extractYouTubeId(videoUrl || "");
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
};
