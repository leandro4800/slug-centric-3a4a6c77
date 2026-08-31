// ============================================================================
// Templates do Studio de Divulgação (marketing do coach).
//
// Cada template tem:
//   - referenceImageUrl: URL PÚBLICA da imagem de referência de layout
//     (bucket "avatars", path template-references/{template_id}.png).
//     Enquanto a imagem não é enviada, fica null e a geração usa só o prompt.
//   - prompt: texto TRAVADO. Só {{coach_nome}}, {{telefone}} e {{instagram}}
//     variam entre coaches.
// ============================================================================

export interface MarketingTemplate {
  id: string;
  label: string;
  referenceImageUrl: string | null;
  composition: string;
}

const MASTER = `ABSOLUTE FACE PRESERVATION (HIGHEST PRIORITY — DO NOT VIOLATE): The face of the person in the FIRST reference image MUST be preserved with PHOTOGRAPHIC IDENTITY ACCURACY. Treat that face as a locked reference. DO NOT alter, reshape, slim, widen, smooth, beautify, age, de-age, or stylize the face in any way. Preserve EXACTLY: nose shape and width, nostrils, mouth shape, lip thickness, philtrum, jawline, chin, cheekbones, eye shape and spacing, eyebrows, ears, skin tone, freckles, moles, scars, facial hair pattern and density, hairline. Use the FIRST reference image as the coach/athlete identity: preserve their exact face, and use their actual body type, current clothing and general appearance as the visual starting point — if they are wearing a shirt in their photo, keep them wearing a shirt (or a fitted training top appropriate to the scene); do not strip or change clothing just because the style reference shows a different outfit. The SECOND reference image is ONLY an art-direction / style reference: use it strictly to guide composition, layout, typography positions, color palette, icons, borders and decorative elements. Do NOT copy the pose, exact camera framing, clothing, jewelry, watch, or any other accessory from this second image, and do NOT reuse the identity of the person shown in it. This must be a completely NEW original photograph composed specifically for this coach — never reproduce the second reference image's photographic content, exact pose or framing verbatim, even partially.

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
- The coach's pose, exact framing and accessories must be freshly composed for this photo — inspired by the athletic energy of the reference but NOT a copy of it.`;

const COMPOSITIONS: Record<string, { label: string; text: string }> = {
  "treino-dieta-cyan": {
    label: "Treino & Dieta (Cyan)",
    text: `COMPOSITION:
- Full-bleed color gym photography as background, athlete performing a bicep curl with a dumbbell, three-quarter angle, dramatic side lighting, slightly desaturated shadows.
- Subject occupies the left-to-center portion of the frame, cropped at mid-thigh.
- Top-left: three small chevron-bulleted words stacked, white uppercase: "DISCIPLINA" / "FOCO" / "RESULTADOS", each preceded by a small ">" chevron in cyan.
- Top-right: huge condensed bold headline, white "TREINO" then "& DIETA" where "&" is white and "DIETA" is cyan gradient, stacked two lines, followed by a cyan rectangular badge containing "ONLINE" in white.
- Below headline: white bold line "PLANOS PERSONALIZADOS" then cyan bold line "PARA RESULTADOS REAIS!".
- Right-side vertical list of 4 feature rows, each with a circular cyan-outlined icon (dumbbell, plant/leaf, bar chart, phone) followed by two-line text: bold white label + cyan bold sublabel + small gray description line. Exact labels:
  1. "TREINOS" / "PERSONALIZADOS" — "Programas feitos para seu objetivo."
  2. "DIETAS" / "PERSONALIZADAS" — "Alimentação ajustada ao seu estilo de vida."
  3. "ACOMPANHAMENTO" / "INDIVIDUAL" — "Suporte contínuo para maximizar resultados."
  4. "100% ONLINE" — "Treine de qualquer lugar com praticidade."
- Bottom-left: rounded rectangle with cyan border and a WhatsApp icon in a cyan circle, text "COMECE AGORA!" (bold white) and "INVESTA NO SEU MELHOR RESULTADO." (small white).
- Below that: a diagonal cyan paint-brush-stroke banner containing two lines of bold white italic text: "SEU CORPO, SUA ESCOLHA." / "EU TE AJUDO A TRANSFORMAR!"
- Bottom strip: solid near-black bar.
FIXED TEXT verbatim as above. PALETTE: near-black background, white text, cyan/electric-blue accents only.`,
  },
  "transformacao-lime": {
    label: "Transforme seu Corpo (Lime)",
    text: `COMPOSITION:
- Full-bleed dark gym photo, athlete mid-exercise on a pull-up/lat machine, arms raised, intense expression, warm-toned skin highlights against near-black background.
- Subject occupies the right half of the frame, cropped at the waist.
- Top-left, stacked huge condensed headline: "TRANSFORME SEU" (white) / "CORPO." (lime green, largest line) / "TRANSFORME SUA" (white) / "VIDA." (lime green).
- Below: "TREINO INTELIGENTE." (white bold) / "DIETA ESTRATÉGICA." (white bold) / "RESULTADOS REAIS!" (lime bold).
- Left column: small white label "O QUE VOCÊ RECEBE:" then 4 rows, lime-outlined rounded-square icons (dumbbell, clipboard, chat bubble, trending-up) + bold white label + small gray sublabel:
  1. "TREINOS PERSONALIZADOS" — "100% ON-LINE"
  2. "DIETAS PERSONALIZADAS" — "DE ACORDO COM SEU OBJETIVO"
  3. "ACOMPANHAMENTO INDIVIDUAL" — "SUPORTE E MOTIVAÇÃO PARA VOCÊ EVOLUIR"
  4. "RESULTADOS COMPROVADOS" — "MÉTODO TESTADO E APROVADO"
- Small quote box near the athlete's leg, lime quotation marks framing italic white text: "DISCIPLINA HOJE, RESULTADOS AMANHÃ!"
- Bottom: thin strip, 5 columns separated by hairlines, small lime line-icons (bicep, flame, running figure, target, trophy) + two-line white bold caption: "GANHO DE MASSA MUSCULAR" | "QUEIMA DE GORDURA" | "MAIS ENERGIA E DISPOSIÇÃO" | "FOCO E DISCIPLINA" | "CONFIANÇA E AUTOESTIMA"
- Bottom band, solid black: left huge lime "COMECE HOJE" + white "A MELHOR VERSÃO DE VOCÊ."; right white "TREINO E DIETA ON-LINE" above lime pill "FALE COMIGO AGORA!" with WhatsApp icon, small white "VAGAS LIMITADAS!" beneath.
FIXED TEXT verbatim as above. PALETTE: black background, white text, lime/neon-green accents only.`,
  },
  "consultoria-ouro-coach": {
    label: "Consultoria Ouro (Coach)",
    text: `COMPOSITION:
- Full-bleed color gym photo, athlete standing arms crossed, three-quarter angle, confident expression, dark industrial gym background, warm rim lighting.
- Subject occupies the right ~45% of the frame, cropped at mid-thigh.
- Top-left: small white "CONSULTORIA ON-LINE" then huge condensed headline "TREINO" (white) / "E DIETA" (gold), two lines.
- Below: "PERSONALIZADOS DO SEU JEITO" (white bold) then "PARA O SEU MELHOR RESULTADO!" (gold bold).
- Row of 3 small icon+label pairs (gold clipboard, dumbbell, fork-plate icons): "PLANEJAMENTO ESTRATÉGICO" | "TREINO PERSONALIZADO" | "DIETA ADAPTADA A VOCÊ"
- 3 stacked rounded-rectangle rows, gold left border, gold icon (target, chart, phone) + bold white label + gold sublabel:
  1. "TREINO PERSONALIZADO" — "DO SEU NÍVEL AO AVANÇADO"
  2. "ACOMPANHAMENTO" — "E AJUSTES CONSTANTES"
  3. "SUPORTE DIRETO" — "VIA WHATSAPP"
- Below: white bold "NÃO É SOBRE" / "DICAS DE TREINO." then large gold bold "ENTREGO RESULTADO." with underline swoosh.
- Small bordered box near athlete: gold trophy icon + white bold "DISCIPLINA HOJE," / "O RESULTADO É" / "AMANHÃ!"
- Coach identity block, bottom-left: geometric gold monogram badge with the coach's initials, beside "COACH" (small gold) above "{{coach_nome}}" (large white/gold). THIS BLOCK IS VARIABLE per coach — use the coach's actual initials and name.
- Right of coach block, 3 rows with gold icons: "+ DE 10 ANOS" / "TRANSFORMANDO VIDAS", "MÉTODO" / "COMPROVADO E PERSONALIZADO", "CENTENAS" / "DE ALUNOS TRANSFORMADOS" — these are EDITABLE default claims (coach can override the numbers/text in the form; don't hardcode as literal fact for every coach in the UI copy).
- Bottom strip, solid black, gold top border, centered gold spaced text: "FOCO • DISCIPLINA • CONSTÂNCIA • RESULTADOS"
FIXED TEXT as above except coach block + 3 claims (variable). PALETTE: black background, white + gold accents only.`,
  },
  "treino-dieta-mono-amarelo": {
    label: "Treino & Dieta Mono (Amarelo)",
    text: `COMPOSITION:
- Full-bleed BLACK AND WHITE (monochrome) dramatic gym photography, athlete seated on a bench, head down in focus, holding a dumbbell at knee height, moody low-key lighting, film-grain feel.
- Subject occupies the right ~55% of the frame, full torso to shoes visible.
- Top-left huge condensed headline, three lines: "TREINO" (white) / "E DIETA" (yellow) / "ON-LINE" (white, smaller, yellow underline rule).
- Top-right small two-line white bold label: "DISCIPLINA HOJE" / "RESULTADOS SEMPRE" (second half in yellow).
- Left column, 4 rows, yellow-outlined circular icons (dumbbell, food-bowl, phone-chat, chart) + bold white two-line labels:
  1. "TREINOS" / "PERSONALIZADOS"
  2. "DIETAS" / "PERSONALIZADAS"
  3. "ACOMPANHAMENTO" / "ON-LINE"
  4. "RESULTADOS" / "DE VERDADE"
- Yellow paint-brush-stroke banner, bold black text: "COMECE SUA" / "MELHOR VERSÃO" / "AGORA!"
- Bottom strip, 4 columns with hairline dividers, tiny yellow icons (person, calendar, check, trophy) + two-line white caption: "ATENDIMENTO 100% ON-LINE" | "PLANO FLEXÍVEL" | "FOCO, FORÇA E CONSTÂNCIA" | "MENTE FORTE CORPO FORTE"
- Bottom black band: WhatsApp icon (yellow circle) + white bold "FALE COMIGO PELO WHATSAPP" then yellow bold "VAMOS TRANSFORMAR SEU CORPO E SUA VIDA!"
FIXED TEXT verbatim as above. PALETTE: the PHOTO is monochrome/B&W. Text and icon accents are yellow or white only.`,
  },
  "consultoria-dourada-mono": {
    label: "Consultoria Dourada (Mono)",
    text: `COMPOSITION:
- Full-bleed BLACK AND WHITE (monochrome) gym photo, athlete in side profile pulling a cable machine handle, arm flexed, gritty high-contrast look.
- Subject occupies the right ~55% of the frame, cropped at mid-thigh.
- Top-left: white bold "CONSULTORIA" then huge condensed gold gradient "ON-LINE" (largest element) then white bold "DE TREINO E DIETA".
- Below: white "RESULTADOS REAIS," then gold bold "ONDE VOCÊ ESTIVER."
- Left column, 4 rows, gold circular-outlined icons (clipboard-check, fork-plate, phone-chat, trending-up) + bold white label + gold sublabel + small gray description:
  1. "TREINOS" / "PERSONALIZADOS" — "Planejamentos de treino adaptados ao seu objetivo, nível e rotina."
  2. "DIETAS" / "INDIVIDUALIZADAS" — "Planos alimentares práticos e flexíveis, de acordo com suas necessidades."
  3. "ACOMPANHAMENTO" / "PRÓXIMO" — "Suporte contínuo para ajustes, dúvidas e motivação."
  4. "RESULTADOS" / "COMPROVADOS" — "Mais performance, mais saúde e a melhor versão de você."
- Bottom-left rounded box, gold border: WhatsApp icon in gold circle, bold white "VAMOS JUNTOS" then gold bold "ALCANÇAR SEUS OBJETIVOS!", small white "FALE COMIGO AGORA:" below a divider.
- Near athlete's hip: small gold circular badge, three centered lines "100%" (large) / "ON-LINE" / "PRA VOCÊ".
- Bottom-right: realistic laptop mockup (dark dashboard UI "SEU PLANO PERSONALIZADO" with "TREINO"/"DIETA" panels) + smartphone mockup showing "EVOLUÇÃO" with an upward trend graph and "RESULTADOS" progress bars. Small black shaker bottle beside the laptop with white text "DISCIPLINA FOCO CONSTÂNCIA RESULTADOS".
- Bottom strip, 4 columns, gold icons (calendar-clock, pin, target, trophy) + two-line white/gold caption: "TREINE NO SEU TEMPO" | "DE ONDE ESTIVER" | "FOCO NO QUE IMPORTA" | "DISCIPLINA RESULTADOS"
- Very bottom centered: white "DISCIPLINA HOJE," + gold "LIBERDADE AMANHÃ."
FIXED TEXT verbatim as above. PALETTE: monochrome B&W photo, gold + white text/icon accents only.`,
  },
  "treino-dieta-teal-prato": {
    label: "Treino & Dieta (Teal + Prato)",
    text: `COMPOSITION:
- Full-bleed color gym photo, athlete in side profile at a cable machine, arms crossed at chest, confident, cool-toned lighting.
- Subject occupies the right ~50% of the frame.
- Top-left small white kicker: "TRANSFORME SEU CORPO." / "TRANSFORME SUA VIDA."
- Main headline, huge condensed: "TREINO" (white) then "E DIETA" (teal) then a teal pill badge "PERSONALIZADOS" (white text) then teal outline pill "ONLINE".
- Below: white "RESULTADOS REAIS," then teal "ONDE VOCÊ ESTIVER!"
- Left column, 4 rows, teal circular icon outlines (dumbbell, fork-plate, trending-chart, smartphone) + bold white label + teal sublabel:
  1. "TREINOS PERSONALIZADOS" — "de acordo com seu objetivo"
  2. "DIETAS ADAPTADAS" — "ao seu estilo de vida e rotina"
  3. "ACOMPANHAMENTO CONSTANTE" — "suporte e ajustes sempre que precisar"
  4. "SUPORTE VIA APP E WHATSAPP" — "fácil, prático e sempre à mão"
- Bottom-left: realistic photo of a grilled-chicken-and-vegetables meal plate (rice, broccoli, carrots, grilled chicken), composited at the bottom edge, real food photography style.
- Beside the plate: smartphone mockup with dark app UI, header "PLANO DO DIA", a "TREINO" section with 2-3 sample exercises, a "DIETA" section with macros ("PROTEÍNAS", "CARBOS", "GORDURAS" + gram values), teal button "VER PLANO COMPLETO".
- Bottom-left CTA: teal rounded pill button with WhatsApp icon, bold white "COMECE HOJE" / "SUA TRANSFORMAÇÃO!"
- Bottom-right: white icon + two-line white bold "SEU TREINO. SUA DIETA." / "SEUS RESULTADOS."
- Small bottom-left corner: white "VAGAS LIMITADAS!" with lock icon.
FIXED TEXT verbatim as above. PALETTE: black background, white text, teal/cyan accents. Food plate and phone mockup are the only full-color photographic elements besides the athlete.`,
  },
};

// URLs públicas (CDN Lovable Assets) das artes de referência de layout.
// São as mesmas imagens usadas como miniatura no Studio de Divulgação.
const CDN = "https://alpha-coach.app/__l5e/assets-v1";

const REFERENCE_URLS: Record<string, string | null> = {
  "treino-dieta-cyan": `${CDN}/73849259-deca-4521-a7a1-d91ca397ed43/treino-dieta-cyan.jpg`,
  "transformacao-lime": `${CDN}/5b6c9b61-84bc-4d77-a4d6-1d7f4beb979f/transformacao-lime.jpg`,
  "consultoria-ouro-coach": `${CDN}/2e0779a2-1004-4f00-b41f-20ed80f18457/consultoria-ouro-coach.jpg`,
  "treino-dieta-mono-amarelo": `${CDN}/11c5d14f-537e-49a6-bf94-6f8239af6e61/treino-dieta-mono-amarelo.jpg`,
  "consultoria-dourada-mono": `${CDN}/29f64758-bfb5-42b2-aa71-d90914a718de/consultoria-dourada-mono.jpg`,
  "treino-dieta-teal-prato": `${CDN}/6940874e-7bac-4f61-9b91-1fdc9570f157/treino-dieta-teal-prato.jpg`,
};

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
}

export function buildTemplatePrompt(templateId: string, vars: PromptVars): string {
  const tpl = MARKETING_TEMPLATES[templateId];
  if (!tpl) throw new Error(`template desconhecido: ${templateId}`);
  return MASTER.replace("{{COMPOSITION}}", tpl.composition)
    .replaceAll("{{coach_nome}}", vars.coach_nome)
    .replaceAll("{{telefone}}", vars.telefone)
    .replaceAll("{{instagram}}", vars.instagram);
}
