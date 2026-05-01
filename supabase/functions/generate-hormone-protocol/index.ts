import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { alunoId, tenantId } = await req.json();

    if (!alunoId) {
      throw new Error("ID do aluno é obrigatório");
    }

    // 1. Buscar dados do aluno
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const response = await fetch(`${supabaseUrl}/rest/v1/anamnese_aluno?aluno_id=eq.${alunoId}&select=*`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      }
    });
    
    const anamnesisData = await response.json();
    const anamnese = anamnesisData[0] || {};

    const alunoResp = await fetch(`${supabaseUrl}/rest/v1/alunos?id=eq.${alunoId}&select=*`, {
      headers: {
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      }
    });
    const alunoData = await alunoResp.json();
    const aluno = alunoData[0] || {};

    // 2. Construir o contexto para a IA
    const studentContext = `
      Nome: ${aluno.nome || 'Atleta'}
      Nível: ${anamnese.nivel_experiencia || aluno.nivel_experiencia || 'Não informado'}
      Objetivo: ${aluno.objetivo || 'Não informado'}
      Peso: ${anamnese.peso_kg || 'Não informado'} kg
      Anos de Treino: ${anamnese.anos_treino || '0'}
      Uso de Ergogênicos: ${anamnese.faz_uso_ergogenicos ? 'Sim' : 'Não'}
      Detalhes/Objetivo Ergogênicos: ${anamnese.detalhes_ergogenicos || 'Nenhum'}
      Medicamentos em uso: ${anamnese.medicamentos || 'Nenhum'}
      Doenças: ${anamnese.doencas ? anamnese.doencas.join(', ') : 'Nenhuma'}
    `;

    const systemPrompt = `Você é o DR. IA, um especialista em endocrinologia esportiva e protocolos hormonais para fisiculturismo.
Sua base de conhecimento principal é o livro "Hormônios no Fisiculturismo" de Dudu Haluch.

INSTRUÇÕES:
1. Analise os dados do aluno fornecidos.
2. Gere um protocolo sugerido completo incluindo:
   - Drogas (substâncias)
   - Meias-vidas
   - Semanas de uso (duração do ciclo)
   - Dosagens sugeridas
   - TPC (Terapia Pós-Ciclo) detalhada baseada na literatura do Dudu Haluch.
3. Use o nível do atleta para ajustar a agressividade do protocolo (Iniciante deve ser conservador, Atleta de Alto Nível pode ser mais complexo).
4. BUSQUE SEMPRE AS RESPOSTAS NA LITERATURA ESPORTIVA (Dudu Haluch).

REGRA INEGOCIÁVEL DE SEGURANÇA:
Você DEVE obrigatoriamente incluir no INÍCIO e no FINAL do texto o seguinte aviso em destaque:
"⚠️ ATENÇÃO: Esta é apenas uma sugestão educacional baseada em literatura esportiva para auxiliar o treinador. O uso de esteróides anabolizantes apresenta graves riscos à saúde. Este protocolo DEVE ser encaminhado e avaliado por um Médico Endocrinologista. Não inicie nenhum uso sem exames de sangue e acompanhamento médico adequado."

Seja técnico, utilize termos da farmacologia esportiva (ésteres, aromatização, inibidores de aromatase, etc).`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere um protocolo para o seguinte atleta:\n${studentContext}` }
        ],
        temperature: 0.7,
      }),
    });

    const aiData = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;

    return new Response(JSON.stringify({ protocol: resultText }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
