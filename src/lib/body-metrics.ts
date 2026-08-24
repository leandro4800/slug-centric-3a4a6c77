// Calcula % de gordura corporal pela fórmula US Navy
// Aceita medidas em cm.
export function calcBodyFatUSNavy(opts: {
  sexo: "M" | "F";
  altura_cm: number;
  pescoco_cm: number;
  cintura_cm: number;
  quadril_cm?: number;
}): number | null {
  const { sexo, altura_cm, pescoco_cm, cintura_cm, quadril_cm } = opts;
  if (!altura_cm || !pescoco_cm || !cintura_cm) return null;

  if (sexo === "M") {
    const denom = 1.0324 - 0.19077 * Math.log10(cintura_cm - pescoco_cm) + 0.15456 * Math.log10(altura_cm);
    if (denom <= 0) return null;
    const bf = 495 / denom - 450;
    return roundTo(bf, 2);
  } else {
    if (!quadril_cm) return null;
    const denom =
      1.29579 - 0.35004 * Math.log10(cintura_cm + quadril_cm - pescoco_cm) + 0.22100 * Math.log10(altura_cm);
    if (denom <= 0) return null;
    const bf = 495 / denom - 450;
    return roundTo(bf, 2);
  }
}

// Converte altura digitada pelo usuário para centímetros.
// Aceita "178", "178cm", "1,78", "1.78", "1,78m", "1.78 m" etc.
// Retorna null quando o valor não é uma altura plausível (100–250 cm).
export function parseAlturaCm(input: string | number | null | undefined): number | null {
  if (input == null) return null;
  let n: number;
  if (typeof input === "number") {
    n = input;
  } else {
    const cleaned = String(input)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/cm$/, "")
      .replace(/m$/, "")
      .replace(",", ".");
    if (!cleaned) return null;
    n = parseFloat(cleaned);
  }
  if (!Number.isFinite(n) || n <= 0) return null;
  const cm = n < 3 ? n * 100 : n; // valor em metros (ex: 1,78) → centímetros
  if (cm < 100 || cm > 250) return null;
  return Math.round(cm * 10) / 10;
}

export function calcIMC(peso_kg: number, altura_cm: number): number | null {
  if (!peso_kg || !altura_cm) return null;
  const m = altura_cm / 100;
  return roundTo(peso_kg / (m * m), 2);
}

function roundTo(n: number, d: number) {
  const f = Math.pow(10, d);
  return Math.round(n * f) / f;
}

export function formatBRL(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
