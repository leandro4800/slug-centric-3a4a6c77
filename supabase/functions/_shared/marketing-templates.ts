// ============================================================================
// Templates do Studio de Divulgação (marketing do coach).
//
// Cada template tem:
//   - referenceImageUrl: URL PÚBLICA da imagem de referência de layout
//     (bucket "avatars", path template-references/{template_id}.png).
//     NUNCA usar essas imagens no frontend (privacidade: são pessoas reais).
//   - composition: texto TRAVADO. Só {{coach_nome}}, {{telefone}} e
//     {{instagram}} variam entre coaches.
// ============================================================================

export interface MarketingTemplate {
  id: string;
  label: string;
  referenceImageUrl: string | null;
  composition: string;
}

const MASTER = `ABSOLUTE FACE PRESERVATION (HIGHEST PRIORITY — DO NOT VIOLATE): The face of the person in the FIRST reference image MUST be preserved with PHOTOGRAPHIC IDENTITY ACCURACY. Treat that face as a locked reference. DO NOT alter, reshape, slim, widen, smooth, beautify, age, de-age, or stylize the face in any way. Preserve EXACTLY: nose shape and width, nostrils, mouth shape, lip thickness, philtrum, jawline, chin, cheekbones, eye shape and spacing, eyebrows, ears, skin tone, freckles, moles, scars, facial hair pattern and density, hairline. Use the FIRST reference image as the coach/athlete identity: preserve their exact face, and use their actual body type, current clothing and general appearance as the visual starting point — if they are wearing a shirt in their photo, keep them wearing a shirt (or a fitted training top appropriate to the scene); do not strip or change clothing just because the style reference shows a different outfit. The SECOND reference image is ONLY an art-direction / style reference: use it strictly to guide composition, layout, typography positions, color palette, icons, borders and decorative elements. Do NOT copy the pose, exact clothing, jewelry, watch, or any other accessory from this second image, and do NOT reuse the identity of the person shown in it. This must be a completely NEW original photograph composed specifically for this coach — never reproduce the second reference image's photographic content verbatim.

FRAMING AND CROP LOCK: The SECOND reference image also dictates the exact framing, zoom level, crop proportions and position of the subject within the frame (e.g. how much of the face/body is visible, how tightly cropped, centered vs off-center). Replicate that framing/crop precisely — only the identity (face) and the specific pose/clothing/accessories change per the FACE PRESERVATION and ART-DIRECTION-ONLY rules above. The subject's face size relative to the frame must match the reference's proportions.

Create a VERTICAL 9:16 fitness coaching social poster inspired by the SECOND reference image's layout style, rebranded for {{coach_nome}}, using the coach from the FIRST reference image. Do not invent a new layout concept — follow the composition below.

{{COMPOSITION}}

{{VARIATION}}

CONTACT BLOCK (variable per coach — render exactly these values):
- Coach name: {{coach_nome}}
- WhatsApp / phone: {{telefone}}
- Instagram handle: {{instagram}}

STYLE LOCK:
- LOCKED LAYOUT: composition, colors, typography, decorative elements and positions are FIXED. Only the coach name, phone, @instagram handle, subheadline and CTA text vary between coaches.
- Keep every fixed headline/label/icon text exactly as specified, in Portuguese (Brazil), with correct accents.
- The product wordmark is FIXED literal text and must never be replaced by the coach's brand.`;

const COMPOSITIONS: Record<string, { label: string; text: string }> = {
  "alpha-mente-vida-lima": {
    label: "Corpo, Mente e Vida (Lima)",
    text: `COMPOSITION:
- Full-bleed color photo, close-up side profile portrait of a female athlete, dark hair in a high ponytail with loose strands, dramatic low-key lighting with fine dust/mist particles visible in the dark background, toned shoulders and arms visible, wearing a black sports bra.
- Subject occupies the LEFT half of the frame, profile facing right, cropped from mid-torso up, face large and prominent in the upper-left-to-center area.
- Top-right: wordmark "ALPHA" / "COACH" (white) with lime-green outlined pill badge "PRO".
- Right side, below wordmark: 4 stacked white uppercase words, right-aligned: "CORPO" / "MENTE" / "HÁBITOS" / "ESTILO DE VIDA", followed by a short lime horizontal divider line, then two more lines "TRANSFORME" / "HOJE PARA" / "COLHER AMANHÃ." (last word "AMANHÃ." in lime).
- Lower half, full width: huge distressed/textured condensed headline "TRANSFORME" (white, weathered texture) then below it "CORPO. MENTE. VIDA." (lime green, smaller).
- Below that: thin horizontal divider line, then centered small spaced uppercase white text "TREINO • NUTRIÇÃO • RECUPERAÇÃO • RESULTADOS".
- Bottom contact strip: left side person icon + "NUTRI" (small lime) / "{{coach_nome}}" (bold white) above a WhatsApp icon + "{{telefone}}"; right side Instagram icon + "{{instagram}}", separated by a thin vertical divider.
FIXED TEXT verbatim as above. PALETTE: black background, white text, lime-green (#8BC53F range) accents.`,
  },
  "alpha-nova-versao-lima": {
    label: "Nova Versão (Lima)",
    text: `COMPOSITION:
- Full-bleed color photo, female athlete seen from behind/side, looking back over her shoulder, dark hair flowing, black activewear, bare toned shoulder and back visible, dark moody background with fine mist/dust particles.
- Subject occupies the RIGHT half of the frame, cropped from mid-torso up.
- Top-left: wordmark "ALPHA" / "COACH" (white) with lime-green outlined pill badge "PRO".
- Below wordmark, left column: 4 stacked white uppercase words: "CORPO" / "MENTE" / "HÁBITOS" / "ESTILO DE VIDA", short lime divider line, then "TRANSFORME" / "HOJE PARA" / "COLHER AMANHÃ." (last word in lime).
- Below: huge distressed condensed headline "NOVA" / "VERSÃO" (white, weathered texture, two lines) then smaller lime line "A SÉRIE".
- Below headline: two lines of smaller white text "SUA MELHOR VERSÃO NÃO É O FUTURO." / "É O SEU PRÓXIMO PASSO."
- Row of 4 columns separated by thin vertical dividers, each with a small lime line-icon (dumbbell, fork-knife, target, trending-up chart) above a white uppercase label: "TREINAR" | "NUTRIR" | "FOCAR" | "EVOLUIR".
- Bottom contact strip: WhatsApp icon + "{{telefone}}", thin vertical divider, Instagram icon + "{{instagram}}".
FIXED TEXT verbatim as above. PALETTE: black background, white text, lime-green accents.`,
  },
  "alpha-treino-dieta-cyan": {
    label: "Treino & Dieta (Cyan)",
    text: `COMPOSITION:
- Full-bleed color photo, male athlete with arms crossed at chest, wearing a fitted dark athletic t-shirt, standing in a moody gym with visible cyan/teal smoke or fog effect and cinematic rim lighting behind him.
- Subject occupies the RIGHT ~45% of the frame, cropped at mid-torso, confident direct gaze at camera.
- Top-center-right: small white "ALPHA" + cyan "PRO" wordmark, same line, no badge.
- Top-left, huge condensed headline: "TREINO" (white, weathered texture) then "E DIETA" (cyan, weathered texture), two lines, followed by a cyan rounded rectangle badge with white text "PERSONALIZADOS".
- Below: two lines white bold "TRANSFORME SEU CORPO." / "TRANSFORME SUA VIDA." (word "CORPO" and "VIDA" in cyan).
- Left column below, 4 rows connected by a thin vertical dotted line, each with a cyan circular-outlined icon (dumbbell, fork-knife, trending-up chart, phone-chat) + bold label (partially cyan/partially white) + small gray description line:
  1. "TREINOS" (cyan) "PERSONALIZADOS" (white) — "de acordo com seu objetivo"
  2. "DIETAS" (white) "ADAPTADAS" (white) — "ao seu estilo de vida e rotina"
  3. "ACOMPANHAMENTO" (cyan) "CONSTANTE" (white) — "suporte e ajustes sempre que precisar"
  4. "SUPORTE VIA APP" (cyan) "E WHATSAPP" (white) — "fácil, prático e sempre à mão"
- Small rounded-rectangle badge near the athlete's torso, dark with cyan border: two lines "SUA EVOLUÇÃO" (white) / "É O NOSSO FOCO" (cyan).
- Bottom CTA bar, dark teal rounded rectangle with cyan border: WhatsApp icon + "COMECE HOJE" (white) / "SUA TRANSFORMAÇÃO!" (cyan), thin vertical divider, "VAGAS LIMITADAS!" (white) with a small lock icon.
- Bottom contact strip, bordered rounded box, 3 columns with thin dividers: person icon + "COACH" (cyan) / "{{coach_nome}}" (white bold); WhatsApp icon + "{{telefone}}" (white); Instagram icon + "{{instagram}}" (white).
FIXED TEXT verbatim as above. PALETTE: black background, white text, cyan/teal (#2DD4CE range) accents.`,
  },
  "alpha-modo-alpha-vermelho": {
    label: "Modo Alpha (Vermelho)",
    text: `COMPOSITION:
- Full-bleed color photo, EXTREME CLOSE-UP crop of a male athlete's face, showing roughly the right half of the face only (one eye, nose, mouth, jawline, ear), dramatic low-key side lighting with strong shadow on the unlit half, sweat/skin texture visible, very cinematic and intense.
- Subject/face occupies the RIGHT ~45% of the frame, cropped tight, extending from top to bottom edge of the frame.
- Top-left: wordmark "ALPHA" / "COACH" (white) with red outlined pill badge "PRO".
- Below wordmark: short red divider line, then two lines white "NÃO É SOBRE" / "MOTIVAÇÃO." then short red divider line, then white "É SOBRE" + red "COMPROMISSO."
- Below, huge distressed condensed headline: "MODO" (white, weathered texture) then "ALPHA" (deep red, weathered texture, largest element on the poster).
- Row of 4 columns separated by thin vertical dividers, each with a small red line-icon (dumbbell, fork-knife, target, trending-up chart) above a red uppercase label: "TREINAR" | "NUTRIR" | "FOCAR" | "EVOLUIR".
- Bottom contact strip: WhatsApp icon + "{{telefone}}", thin vertical divider, Instagram icon + "{{instagram}}".
FIXED TEXT verbatim as above. PALETTE: black background, white text, deep red (#C0272D range) accents. The photo itself is in full color with dramatic warm/dark lighting, not desaturated.`,
  },
  "alpha-foco-dias-lima": {
    label: "Foco Todos os Dias (Lima)",
    text: `COMPOSITION:
- Full-bleed color photo, male athlete with arms crossed at chest, close framing from chest up, wearing a fitted black t-shirt, visible tattoo sleeves on forearms, dark moody gym background with subtle smoke/fog, direct intense gaze at camera.
- Subject occupies the RIGHT ~50% of the frame, cropped closely, chest to top of head.
- Top-left: wordmark "ALPHA" / "COACH" (white) with lime-green outlined pill badge "PRO".
- Below wordmark: short lime divider line, then 3 lines white uppercase "TREINE" / "ENQUANTO" / "ELES" / "DESCULPAM." (4 lines total).
- Below, huge distressed condensed headline: "FOCO" (white, weathered texture, large) then below it, smaller handwritten/marker-style lime text "TODOS OS DIAS."
- Below: thin white divider line, then two lines "RESULTADOS REAIS" (white) / "EXIGEM ESCOLHAS REAIS." (word "REAIS." in lime).
- Row of 4 columns separated by thin vertical dividers, each with a small lime line-icon (dumbbell, fork-knife, target, trending-up chart) above a white uppercase label: "TREINAR" | "NUTRIR" | "FOCAR" | "EVOLUIR".
- Bottom contact strip: person icon + "COACH" (lime) / "{{coach_nome}}" (white bold), WhatsApp icon + "{{telefone}}", Instagram icon + "{{instagram}}", separated by thin dividers.
FIXED TEXT verbatim as above. PALETTE: black background, white text, lime-green (#8BC53F range) accents.`,
  },
  "alpha-disciplina-serie-dourado": {
    label: "Disciplina — A Série (Dourado)",
    text: `COMPOSITION:
- Full-bleed color photo, male athlete with arms crossed at chest, wearing a fitted dark athletic t-shirt, standing in a moody gym with visible smoke/fog and cinematic rim lighting, direct intense gaze at camera.
- Subject occupies the RIGHT ~45% of the frame, cropped from chest up.
- Top-center-right: small white "ALPHA" + gold "PRO" wordmark, same line, no badge.
- Top-left: 4 stacked white uppercase words: "DISCIPLINA" / "FOCO" / "CONSISTÊNCIA" / "RESULTADOS", short gold divider line below, then two lines white "NÃO É" / "SOBRE MOTIVAÇÃO." then white "É SOBRE" + gold "COMPROMISSO.", short gold divider line.
- Below, huge distressed condensed headline "DISCIPLINA" (white, weathered texture) then centered smaller gold spaced-out line "A SÉRIE" flanked by short horizontal rule marks on both sides.
- Below: centered small white uppercase spaced text "TREINO • DIETA • MENTALIDADE".
- Thin horizontal divider line across full width.
- Row of 4 feature columns separated by thin dotted vertical dividers, each with a small gold circular-outlined icon (dumbbell, fork-knife, trending-up chart, WhatsApp bubble) + bold label (partially gold/partially white) + small gray description:
  1. "TREINOS" (white) "PERSONALIZADOS" (gold) — "de acordo com seu objetivo"
  2. "DIETAS" (white) "ADAPTADAS" (gold) — "ao seu estilo de vida e rotina"
  3. "ACOMPANHAMENTO" (white) "CONSTANTE" (gold) — "suporte e ajustes sempre que precisar"
  4. "SUPORTE VIA APP" (white) "E WHATSAPP" (gold) — "fácil, prático e sempre à mão"
- Bottom CTA bar, dark rounded rectangle with gold border: WhatsApp icon + "FALE COMIGO AGORA" (white) / "E TRANSFORME SEU CORPO E SUA VIDA!" (gold), thin vertical divider, lock icon + "VAGAS LIMITADAS!" (white) / "COMPROMISSO QUE TRANSFORMA." (gold, smaller).
- Bottom contact strip: person icon + "COACH" (gold) / "{{coach_nome}}" (white bold); WhatsApp icon + "{{telefone}}" (white); Instagram icon + "{{instagram}}" (white).
FIXED TEXT verbatim as above. PALETTE: black background, white text, gold/amber (#D4A24A range) accents.`,
  },
};

// URLs públicas das artes de referência de layout (bucket avatars).
// NUNCA expor no frontend.
const REF_BASE =
  "https://iflgryuemsohurtdaawm.supabase.co/storage/v1/object/public/avatars/template-references";

const REFERENCE_URLS: Record<string, string | null> = Object.fromEntries(
  Object.keys(COMPOSITIONS).map((id) => [id, `${REF_BASE}/${id}.png`]),
);

// ---------------------------------------------------------------------------
// Variações de subheadline / CTA por template. A variação A é sempre a original.
// Sorteada a cada geração NOVA (o cache mantém a arte já gerada).
// ---------------------------------------------------------------------------
export const TEMPLATE_VARIATIONS: Record<string, string[]> = {
  "alpha-mente-vida-lima": [
    `TEXT VARIATION: keep the default subheadline/CTA wording of the composition above.`,
    `TEXT VARIATION (use these instead of the default subheadline/CTA wording): subheadline "TREINO INTELIGENTE. DIETA ESTRATÉGICA. RESULTADOS REAIS!"; CTA "FALE COMIGO AGORA!"`,
  ],
  "alpha-nova-versao-lima": [
    `TEXT VARIATION: keep the default subheadline/CTA wording of the composition above.`,
    `TEXT VARIATION (use these instead of the default subheadline/CTA wording): subheadline "PROTOCOLO ÚNICO, FEITO PARA VOCÊ."; CTA "SUA EVOLUÇÃO HOJE!"`,
  ],
  "alpha-treino-dieta-cyan": [
    `TEXT VARIATION: keep the default subheadline/CTA wording of the composition above.`,
    `TEXT VARIATION (use these instead of the default subheadline/CTA wording): subheadline "RESULTADOS REAIS, ONDE VOCÊ ESTIVER!"; CTA "SUA TRANSFORMAÇÃO!"`,
  ],
  "alpha-modo-alpha-vermelho": [
    `TEXT VARIATION: keep the default subheadline/CTA wording of the composition above.`,
    `TEXT VARIATION (use these instead of the default subheadline/CTA wording): subheadline "ALTO NÍVEL, SEM ATALHOS."; CTA "DOS QUE FAZEM ACONTECER!"`,
  ],
  "alpha-foco-dias-lima": [
    `TEXT VARIATION: keep the default subheadline/CTA wording of the composition above.`,
    `TEXT VARIATION (use these instead of the default subheadline/CTA wording): subheadline "DISCIPLINA DE FERRO, RESULTADO DE OURO."; CTA "SEM DESCULPAS!"`,
  ],
  "alpha-disciplina-serie-dourado": [
    `TEXT VARIATION: keep the default subheadline/CTA wording of the composition above.`,
    `TEXT VARIATION (use these instead of the default subheadline/CTA wording): subheadline "PROMESSA HONESTA, ENTREGA COMPROVADA."; CTA "BORA PRO RESULTADO!"`,
  ],
};

export function pickVariation(templateId: string): string {
  const list = TEMPLATE_VARIATIONS[templateId] ?? [];
  if (list.length === 0) return "";
  return list[Math.floor(Math.random() * list.length)];
}

export const MARKETING_TEMPLATES: Record<string, MarketingTemplate> = Object.fromEntries(
  Object.entries(COMPOSITIONS).map(([id, { label, text }]) => [
    id,
    { id, label, referenceImageUrl: REFERENCE_URLS[id] ?? null, composition: text },
  ]),
);

export interface PromptVars {
  coach_nome: string;
  telefone: string;
  instagram: string;
  variation?: string;
}

export function buildTemplatePrompt(templateId: string, vars: PromptVars): string {
  const tpl = MARKETING_TEMPLATES[templateId];
  if (!tpl) throw new Error(`template desconhecido: ${templateId}`);
  return MASTER.replace("{{COMPOSITION}}", tpl.composition)
    .replace("{{VARIATION}}", vars.variation ?? pickVariation(templateId))
    .replaceAll("{{coach_nome}}", vars.coach_nome)
    .replaceAll("{{telefone}}", vars.telefone)
    .replaceAll("{{instagram}}", vars.instagram);
}
