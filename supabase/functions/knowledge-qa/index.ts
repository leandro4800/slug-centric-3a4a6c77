import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question, tenant_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // 1. Get Embeddings for the question
    const embResp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "openai/text-embedding-3-small", input: question }),
    });
    
    let context = "";
    if (embResp.ok) {
      const { data } = await embResp.json();
      const embedding = data[0].embedding;

      // 2. Search knowledge base
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
      const { data: matches } = await supabase.rpc("buscar_conhecimento_treino", {
        query_embedding: embedding,
        p_tenant_id: tenant_id || null,
        match_count: 10,
        similarity_threshold: 0.3
      });

      if (matches) {
        context = matches.map((m: any) => `[Fonte: ${m.fonte}]\n${m.conteudo}`).join("\n\n");
      }
    }

    // 3. Answer with AI
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash",
        messages: [
          { 
            role: "system", 
            content: `Você é o consultor técnico Alpha Coach. Responda à pergunta do Coach baseando-se no contexto da Metodologia Pacholok e Saúde fornecido. Se não souber, diga que não encontrou na base.\n\nCONTEXTO:\n${context}` 
          },
          { role: "user", content: question }
        ]
      }),
    });

    const aiData = await aiResp.json();
    const reply = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});