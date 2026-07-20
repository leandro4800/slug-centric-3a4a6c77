import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { normalizeSevenFoldResult } from "./index.ts";

Deno.test("normaliza 7 dobras quando a IA retorna texto OCR", () => {
  const normalized = normalizeSevenFoldResult({
    texto_lido: "Peitoral 8; Axilar Média 10; Tríceps 14; Subescapular 12; Abdominal 18; Suprailíaca 11; Coxa 20",
    dobras: {
      peitoral: null,
      axilar_media: null,
      triceps: null,
      subescapular: null,
      abdominal: null,
      suprailiaca: null,
      coxa: null,
    },
  });

  assertEquals(normalized.dobras, {
    peitoral: 8,
    axilar_media: 10,
    triceps: 14,
    subescapular: 12,
    abdominal: 18,
    suprailiaca: 11,
    coxa: 20,
  });
});

Deno.test("normaliza 7 dobras quando a IA retorna linhas de tabela", () => {
  const normalized = normalizeSevenFoldResult({
    tabela: [
      { local: "Peitoral", valor_mm: "8 mm" },
      { local: "Axilar Media", valor_mm: "10" },
      { local: "Triceps", valor_mm: "14" },
      { local: "Sub Escapular", valor_mm: "12" },
      { local: "Abdominal", valor_mm: "18" },
      { local: "Supra Iliaca", valor_mm: "11" },
      { local: "Coxa", valor_mm: "20" },
    ],
  });

  assertEquals(normalized.dobras, {
    peitoral: 8,
    axilar_media: 10,
    triceps: 14,
    subescapular: 12,
    abdominal: 18,
    suprailiaca: 11,
    coxa: 20,
  });
});

Deno.test("normaliza 7 dobras quando OCR separa cabeçalho e valores", () => {
  const normalized = normalizeSevenFoldResult({
    texto_lido: `PEITORAL AXILAR MÉDIA TRÍCEPS SUBESCAPULAR ABDOMINAL SUPRAILÍACA COXA
8 10 14 12 18 11 20`,
  });

  assertEquals(normalized.dobras, {
    peitoral: 8,
    axilar_media: 10,
    triceps: 14,
    subescapular: 12,
    abdominal: 18,
    suprailiaca: 11,
    coxa: 20,
  });
});

Deno.test("normaliza 7 dobras quando valor vem antes do rótulo", () => {
  const normalized = normalizeSevenFoldResult({
    texto_lido: "8 Peitoral; 10 Axilar Média; 14 Tríceps; 12 Subescapular; 18 Abdominal; 11 Suprailíaca; 20 Coxa",
  });

  assertEquals(normalized.dobras, {
    peitoral: 8,
    axilar_media: 10,
    triceps: 14,
    subescapular: 12,
    abdominal: 18,
    suprailiaca: 11,
    coxa: 20,
  });
});