import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { isNativeApp } from "./native-platform";

/** Converte um Blob em base64 puro (sem o prefixo data:). */
const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const s = String(reader.result || "");
      resolve(s.includes(",") ? s.split(",")[1] : s);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const webDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

/**
 * Salva/compartilha um arquivo funcionando tanto na web quanto no app nativo.
 * No WebView (iOS/Android) o atributo `download` do <a> é ignorado — por isso
 * gravamos em disco com o Filesystem e abrimos a folha de compartilhamento.
 */
export async function saveOrShareBlob(blob: Blob, filename: string, title = "Alpha Coach Pro") {
  if (!isNativeApp()) {
    webDownload(blob, filename);
    return;
  }

  const base64 = await blobToBase64(blob);
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache,
  });

  try {
    await Share.share({ title, text: filename, url: uri, dialogTitle: title });
  } catch (e: any) {
    // Usuário cancelou a folha de compartilhamento — não é erro.
    if (!/cancel/i.test(String(e?.message || ""))) throw e;
  }
}

/** Versão para conteúdo de texto (CSV, TXT). */
export async function saveOrShareText(
  content: string,
  filename: string,
  mime = "text/plain;charset=utf-8;",
) {
  if (!isNativeApp()) {
    webDownload(new Blob([content], { type: mime }), filename);
    return;
  }
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: content,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  });
  try {
    await Share.share({ title: filename, text: filename, url: uri, dialogTitle: "Alpha Coach Pro" });
  } catch (e: any) {
    if (!/cancel/i.test(String(e?.message || ""))) throw e;
  }
}

/** Versão para data URLs (ex.: PNG gerado por html-to-image). */
export async function saveOrShareDataUrl(dataUrl: string, filename: string) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  await saveOrShareBlob(blob, filename);
}
