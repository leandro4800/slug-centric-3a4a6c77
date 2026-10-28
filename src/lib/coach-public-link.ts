import { Share } from "@capacitor/share";
import { PRODUCTION_APP_ORIGIN } from "@/lib/app-url";
import { isNativeApp } from "@/lib/native-platform";

/** Same acquisition URL used by the coach panel's Alunos screen. */
export const getCoachPublicLink = (tenant: { slug: string } | null | undefined) =>
  tenant?.slug ? `${PRODUCTION_APP_ORIGIN}/${tenant.slug}` : "";

/** Keep the existing panel's clipboard behavior and failure handling. */
export const copyCoachPublicLink = async (link: string) => {
  if (!link) return;
  await navigator.clipboard.writeText(link);
};

export const getCoachWhatsAppUrl = (link: string) =>
  `https://wa.me/?text=${encodeURIComponent(`Oi! Esse é o meu link: ${link}`)}`;

export async function sendCoachPublicLink(link: string) {
  if (!link) return;
  if (isNativeApp()) {
    // Share text only: never navigate the WebView to the landing page.
    // The system sheet lets the coach choose WhatsApp or another installed app.
    try {
      await Share.share({
        title: "Link de divulgação",
        text: `Oi! Esse é o meu link: ${link}`,
        dialogTitle: "Enviar link para o aluno",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/cancel|dismiss|abort/i.test(message)) return;
      throw error;
    }
    return;
  }
  const opened = window.open(getCoachWhatsAppUrl(link), "_blank");
  if (!opened) throw new Error("Não foi possível abrir o WhatsApp. Copie o link e envie pela conversa.");
  opened.opener = null;
}