/** Utilitários puros do áudio no Direct da comunidade. */

export const AUDIO_MAX_SEG = 300;
export const AUDIO_MIN_SEG = 1;
export const AUDIO_BUCKET = "comunidade_audios";

// mp4/aac primeiro: toca em iPhone e Android. webm/ogg ficam como alternativa.
const CANDIDATOS = ["audio/mp4", "audio/aac", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

export const pickAudioMime = (isSupported: (t: string) => boolean): string | null =>
  CANDIDATOS.find((t) => {
    try {
      return isSupported(t);
    } catch {
      return false;
    }
  }) ?? null;

/** Tipo sem parâmetros (ex.: "audio/webm;codecs=opus" -> "audio/webm"). */
export const baseMime = (mime: string) => (mime.split(";")[0] || "audio/webm").trim().toLowerCase();

export const audioExtension = (mime: string) => {
  const b = baseMime(mime);
  if (b === "audio/mp4" || b === "audio/x-m4a") return "m4a";
  if (b === "audio/aac") return "aac";
  if (b === "audio/ogg") return "ogg";
  if (b === "audio/mpeg") return "mp3";
  return "webm";
};

/** Caminho no Storage: {tenant_id}/{remetente_id}/{arquivo}. */
export const buildAudioPath = (tenantId: string, userId: string, id: string, mime: string) =>
  `${tenantId}/${userId}/${id}.${audioExtension(mime)}`;

export const formatAudioTime = (totalSeg: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(totalSeg) ? totalSeg : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/** Mensagem amigável para falhas de microfone. */
export const microfoneErro = (e: unknown): string => {
  const name = (e as { name?: string })?.name || "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError")
    return "Permissão do microfone negada. Libere o microfone para o app nas configurações do celular.";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "Nenhum microfone encontrado neste aparelho.";
  if (name === "NotReadableError") return "O microfone está sendo usado por outro app. Feche-o e tente de novo.";
  if (name === "Unsupported") return "Este aparelho não permite gravar áudio aqui.";
  return "Não foi possível acessar o microfone.";
};
