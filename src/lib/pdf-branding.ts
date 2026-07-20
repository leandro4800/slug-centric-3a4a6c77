import jsPDF from "jspdf";
import { supabase } from "@/integrations/supabase/client";

export async function loadImageDataUrl(
  url: string | null | undefined,
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (!url) return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export type RGB = [number, number, number];

const DEFAULT_PRIMARY: RGB = [229, 9, 20];

/** Converte string "H S% L%" (formato usado nos tokens do tenant) para RGB 0-255. */
export function hslStringToRgb(hsl: string | null | undefined): RGB | null {
  if (!hsl) return null;
  const m = hsl.trim().match(/^(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%$/);
  if (!m) return null;
  let h = Number(m[1]);
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r1 = 0, g1 = 0, b1 = 0;
  if (h < 60) { r1 = c; g1 = x; }
  else if (h < 120) { r1 = x; g1 = c; }
  else if (h < 180) { g1 = c; b1 = x; }
  else if (h < 240) { g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; b1 = c; }
  else { r1 = c; b1 = x; }
  return [
    Math.round((r1 + mm) * 255),
    Math.round((g1 + mm) * 255),
    Math.round((b1 + mm) * 255),
  ];
}

interface TenantColorSource {
  primary_hsl?: string | null;
  theme_overrides?: { primary?: string | null } | null;
}

/** Retorna a cor primária do tenant em RGB. Fallback para o vermelho AlphaCoach. */
export function getTenantPrimaryRgb(tenant: TenantColorSource | null | undefined): RGB {
  const override = tenant?.theme_overrides?.primary;
  const base = tenant?.primary_hsl;
  return hslStringToRgb(override) || hslStringToRgb(base) || DEFAULT_PRIMARY;
}

export interface PdfHeaderOpts {
  doc: jsPDF;
  title: string;
  subtitle?: string;
  coachName?: string | null;
  studentName?: string | null;
  logo?: { dataUrl: string; w: number; h: number } | null;
  primary?: RGB;
}

/**
 * Desenha um cabeçalho premium (faixa colorida + faixa preta com coach/aluno).
 * A cor da faixa segue o tenant (via `primary`), com fallback para o vermelho AlphaCoach.
 * Retorna a próxima coordenada Y disponível.
 */
export function renderPdfHeader(opts: PdfHeaderOpts): number {
  const { doc, title, subtitle, coachName, studentName, logo, primary } = opts;
  const [pr, pg, pb] = primary || DEFAULT_PRIMARY;
  const pageW = doc.internal.pageSize.getWidth();

  // Faixa colorida do tenant
  doc.setFillColor(pr, pg, pb);
  doc.rect(0, 0, pageW, 28, "F");

  // Logo à esquerda
  let textX = 14;
  if (logo) {
    const targetH = 18;
    const ratio = logo.w / logo.h || 1;
    const targetW = Math.min(targetH * ratio, 40);
    try {
      const fmt = logo.dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(logo.dataUrl, fmt, 10, 5, targetW, targetH);
      textX = 10 + targetW + 6;
    } catch {
      /* ignore */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(title, textX, 14);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(subtitle, textX, 21);
  }

  // Faixa preta com coach + aluno
  doc.setFillColor(15, 15, 15);
  doc.rect(0, 28, pageW, 12, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  const left = coachName ? `COACH: ${coachName.toUpperCase()}` : "";
  if (left) doc.text(left, 14, 35.5);
  if (studentName) {
    const right = `ATLETA: ${studentName.toUpperCase()}`;
    doc.text(right, pageW - 14, 35.5, { align: "right" });
  }

  doc.setTextColor(20, 20, 20);
  return 48;
}

/** Busca nome + logo do tenant pelo slug (fallback: pelo owner_user_id do usuário logado). */
export async function fetchTenantBranding(
  slug?: string | null,
): Promise<{ nome: string | null; logo_url: string | null; primary_hsl: string | null; theme_overrides: any } | null> {
  try {
    if (slug) {
      const { data } = await supabase
        .from("tenants")
        .select("nome, logo_url, primary_hsl, theme_overrides")
        .eq("slug", slug)
        .maybeSingle();
      if (data) return data as any;
    }
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user?.id;
    if (!uid) return null;
    const { data } = await supabase
      .from("tenants")
      .select("nome, logo_url, primary_hsl, theme_overrides")
      .eq("owner_user_id", uid)
      .maybeSingle();
    return (data as any) || null;
  } catch {
    return null;
  }
}
