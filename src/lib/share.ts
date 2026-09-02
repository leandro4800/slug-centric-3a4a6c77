/**
 * Compartilhamento nativo com fallback, seguindo o mesmo padrão já usado
 * em TreinoConclusaoCard.tsx (navigator.canShare/share com arquivo quando
 * suportado; senão copia o link / faz download).
 */

const MAX_SHARE_FILE = 25 * 1024 * 1024; // evita travar o share sheet com vídeos gigantes

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
};

const fetchAsFile = async (url: string): Promise<File | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size > MAX_SHARE_FILE) return null;
    const ext = (blob.type.split("/")[1] || "bin").split(";")[0];
    return new File([blob], `alpha-coach.${ext}`, { type: blob.type });
  } catch {
    return null;
  }
};

export interface SharePostLinkOptions {
  url: string;
  title: string;
  text: string;
  /** Imagem ou vídeo do post — anexado ao share nativo quando suportado. */
  mediaUrl?: string | null;
  onCopied?: () => void;
  onError?: (message: string) => void;
}

export async function sharePostLink({
  url,
  title,
  text,
  mediaUrl,
  onCopied,
  onError,
}: SharePostLinkOptions): Promise<void> {
  const navAny = navigator as any;
  try {
    if (mediaUrl && navAny.canShare) {
      const file = await fetchAsFile(mediaUrl);
      if (file && navAny.canShare({ files: [file] })) {
        await navAny.share({ files: [file], title, text: `${text}\n${url}` });
        return;
      }
    }
    if (navAny.share) {
      await navAny.share({ title, text, url });
      return;
    }
  } catch (e: any) {
    if (e?.name === "AbortError") return;
    // cai no fallback abaixo
  }

  const ok = await copyToClipboard(url);
  if (ok) onCopied?.();
  else onError?.("Copie o link manualmente: " + url);
}

/** Fallback simples para compartilhar apenas um link (sem mídia). */
export async function shareLink(
  url: string,
  title: string,
  text: string,
  onCopied?: () => void,
  onError?: (m: string) => void,
) {
  return sharePostLink({ url, title, text, onCopied, onError });
}
