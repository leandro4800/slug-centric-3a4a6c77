// Edge Function: ingest-knowledge
// Recebe um arquivo (ZIP, PDF, TXT, MD, DOCX) já uploadado no bucket `base-conhecimento`,
// extrai TODO o texto, faz chunking e gera embeddings — salvando em base_conhecimento_treino.
// Body: { file_path: string, tenant_id?: string | null, fonte?: string }
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CHUNK_SIZE = 1500; // chars
const CHUNK_OVERLAP = 200;

function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + CHUNK_SIZE, clean.length);
    chunks.push(clean.slice(i, end));
    if (end === clean.length) break;
    i = end - CHUNK_OVERLAP;
  }
  return chunks;
}

async function extractFromPdf(buf: ArrayBuffer): Promise<string> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join("\n") : text;
  } catch (e) {
    console.error("pdf extract error:", e);
    return "";
  }
}

async function extractFromFile(name: string, buf: ArrayBuffer): Promise<string> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return extractFromPdf(buf);
  if (lower.endsWith(".txt") || lower.endsWith(".md") || lower.endsWith(".markdown")) {
    return new TextDecoder().decode(buf);
  }
  if (lower.endsWith(".json")) {
    return new TextDecoder().decode(buf);
  }
  // DOCX/outros: tentamos como texto puro (fallback)
  try {
    return new TextDecoder().decode(buf);
  } catch {
    return "";
  }
}

async function getEmbeddings(texts: string[], apiKey: string): Promise<number[][]> {
  const out: number[][] = [];
  // Lovable AI Gateway — Gemini embeddings (1536-dim com text-embedding-004 não bate, usar OpenAI)
  // Usamos OpenAI text-embedding-3-small (1536 dims)
  const batchSize = 50;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: batch }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      throw new Error(`Embeddings error ${resp.status}: ${t}`);
    }
    const data = await resp.json();
    for (const d of data.data) out.push(d.embedding);
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

    // Validar usuário
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const { file_path, tenant_id, fonte, texto, categoria } = await req.json();
    const cat = ["treino", "dieta"].includes(String(categoria)) ? String(categoria) : "geral";
    if (!file_path && !(typeof texto === "string" && texto.trim().length > 20)) {
      return new Response(JSON.stringify({ error: "Envie um arquivo ou um texto com pelo menos 20 caracteres" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Permissão: admin ou dono do tenant; tenant_id null só admin
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roleRows || []).some((r: any) => r.role === "admin");
    if (tenant_id) {
      const { data: t } = await admin.from("tenants").select("owner_user_id").eq("id", tenant_id).maybeSingle();
      if (!isAdmin && t?.owner_user_id !== userId) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Apenas admin pode subir base global" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lista de {nome, conteúdo}
    const files: Array<{ name: string; text: string }> = [];

    if (!file_path) {
      files.push({ name: fonte || "Texto do coach", text: String(texto) });
    } else {
    // Baixar do storage
    const { data: blob, error: dlErr } = await admin.storage.from("base-conhecimento").download(file_path);
    if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message}`);
    const buf = await blob.arrayBuffer();

    const lower = file_path.toLowerCase();

    if (lower.endsWith(".zip")) {
      const zip = await JSZip.loadAsync(buf);
      const entries = Object.values(zip.files).filter((f: any) => !f.dir);
      for (const entry of entries as any[]) {
        const fbuf = await entry.async("arraybuffer");
        const text = await extractFromFile(entry.name, fbuf);
        if (text && text.trim().length > 50) files.push({ name: entry.name, text });
      }
    } else {
      const text = await extractFromFile(file_path, buf);
      if (text) files.push({ name: file_path.split("/").pop()!, text });
    }
    }

    if (!files.length) {
      return new Response(JSON.stringify({ error: "Nenhum texto extraído dos arquivos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Chunk + embed + insert
    let totalChunks = 0;
    for (const f of files) {
      const chunks = chunkText(f.text);
      if (!chunks.length) continue;

      // Embeddings em batch
      const embeddings = await getEmbeddings(chunks, LOVABLE_API_KEY);

      const rows = chunks.map((c, idx) => ({
        tenant_id: tenant_id || null,
        titulo: `${f.name} (parte ${idx + 1}/${chunks.length})`,
        conteudo: c,
        fonte: fonte || f.name,
        embedding: embeddings[idx] as any,
        created_by: userId,
        categoria: cat,
        metadata: {
          file: f.name,
          chunk_index: idx,
          total_chunks: chunks.length,
          source_path: file_path || `manual/${Date.now()}-${f.name}`,
          manual: !file_path,
        },
      }));

      // Insert em lotes de 100
      for (let i = 0; i < rows.length; i += 100) {
        const slice = rows.slice(i, i + 100);
        const { error: insErr } = await admin.from("base_conhecimento_treino").insert(slice);
        if (insErr) throw new Error(`Insert error: ${insErr.message}`);
        totalChunks += slice.length;
      }
    }

    return new Response(JSON.stringify({
      success: true,
      files_processed: files.length,
      chunks_created: totalChunks,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ingest-knowledge error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
