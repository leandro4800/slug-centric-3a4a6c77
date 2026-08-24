// ============================================================================
// ImageGenerationService — camada única de geração de imagem do AlphaCoach.
//
// Toda geração de imagem por IA passa por aqui. Provider e model são
// configuráveis SEM alterar o restante do app:
//   - env CARD_IMAGE_MODEL  → troca o modelo (ex: "google/gemini-3.1-flash-image")
//   - por chamada via opts.model
//
// Suporta referenceImages (image-to-image / preservação de identidade),
// prompt, aspectRatio. Consome o stream do gateway server-side (mantém a
// conexão viva em gerações longas) e faz replay não-streaming uma única vez
// se o stream vier vazio (hiccup de transporte).
// ============================================================================

export interface ReferenceImage {
  /** data URL base64 (data:image/...) ou URL https pública */
  url: string;
  /** identity = preservar a pessoa; style = apenas direção de arte */
  role?: "identity" | "style";
}

export interface GenerateImageOptions {
  prompt: string;
  referenceImages?: ReferenceImage[];
  /** ex: "9:16" */
  aspectRatio?: string;
  /** override do modelo para esta chamada */
  model?: string;
}

export class ImageGenerationError extends Error {
  status: number;
  retryable: boolean;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.retryable = status === 429 || status >= 500;
  }
}

// Modelo padrão: Gemini 3 Pro Image — máxima qualidade, suporte real a
// imagens de referência, preservação de identidade e composição complexa.
const DEFAULT_MODEL = "google/gemini-3-pro-image";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/images/generations";

export function getImageModel(): string {
  return Deno.env.get("CARD_IMAGE_MODEL")?.trim() || DEFAULT_MODEL;
}

function buildBody(opts: GenerateImageOptions, stream: boolean) {
  const content: unknown[] = [
    {
      type: "text",
      text: opts.aspectRatio
        ? `${opts.prompt}\nAspect ratio: ${opts.aspectRatio} (vertical).`
        : opts.prompt,
    },
  ];
  for (const ref of opts.referenceImages ?? []) {
    content.push({ type: "image_url", image_url: { url: ref.url } });
  }
  return {
    model: opts.model || getImageModel(),
    messages: [{ role: "user", content }],
    modalities: ["image", "text"],
    stream,
  };
}

async function callGateway(body: unknown, apiKey: string): Promise<Response> {
  const resp = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const raw = await resp.text().catch(() => "");
    let msg = raw;
    try {
      msg = JSON.parse(raw)?.error?.message ?? raw;
    } catch {
      /* mantém raw */
    }
    throw new ImageGenerationError(
      `Gateway ${resp.status}: ${msg}`.slice(0, 500),
      resp.status,
    );
  }
  return resp;
}

interface StreamResult {
  b64: string | null;
  error: string | null;
  sawAny: boolean;
}

async function consumeImageStream(resp: Response): Promise<StreamResult> {
  const reader = resp.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let finalB64: string | null = null;
  let errorMsg: string | null = null;
  let sawAny = false;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) >= 0) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const dataStr = rawEvent
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("\n");
        if (!dataStr || dataStr === "[DONE]") continue;
        let payload: any;
        try {
          payload = JSON.parse(dataStr);
        } catch {
          continue;
        }
        sawAny = true;
        const type = payload?.type;
        if (type === "error" || payload?.error) {
          errorMsg = payload?.error?.message ?? "falha na geração da imagem";
        } else if (
          (type === "image_generation.completed" ||
            type === "image_edit.completed") &&
          payload?.b64_json
        ) {
          finalB64 = payload.b64_json;
        }
        // partial_image é ignorado server-side (não há preview progressivo)
      }
    }
  } finally {
    reader.cancel().catch(() => {});
  }
  return { b64: finalB64, error: errorMsg, sawAny };
}

/**
 * Gera uma imagem e retorna como data URL (data:image/png;base64,...).
 * Lança ImageGenerationError com status HTTP do gateway quando aplicável.
 */
export async function generateImage(
  opts: GenerateImageOptions,
): Promise<string> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    throw new ImageGenerationError("LOVABLE_API_KEY não configurada", 500);
  }

  // 1) streaming: bytes fluindo mantêm a conexão viva em gerações longas
  const resp = await callGateway(buildBody(opts, true), apiKey);
  const { b64, error, sawAny } = await consumeImageStream(resp);

  if (error) throw new ImageGenerationError(error, 500);
  if (b64) return `data:image/png;base64,${b64}`;

  // 2) stream vazio = hiccup de transporte → replay único não-streaming
  if (!sawAny) {
    const replay = await callGateway(buildBody(opts, false), apiKey);
    const json = await replay.json();
    const b = json?.data?.[0]?.b64_json;
    if (!b) throw new ImageGenerationError("modelo não retornou imagem", 500);
    return `data:image/png;base64,${b}`;
  }

  // Eventos chegaram mas sem completed → falha real (moderação/truncamento)
  throw new ImageGenerationError(
    "stream encerrado sem imagem final (possível moderação ou truncamento)",
    500,
  );
}
