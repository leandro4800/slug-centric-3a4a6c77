import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

interface Marker {
  codigo: string
  nome: string
  valor: number
  unidade: string
  status: "otimo" | "atencao" | "critico"
  observacao: string
}

interface AIResponse {
  parecer_tecnico: string
  score_performance: number
  marcadores: Marker[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get user from JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { file_path } = await req.json()

    if (!file_path) {
      return new Response(JSON.stringify({ error: 'file_path is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Download PDF
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('exames_pdfs')
      .download(file_path)

    if (downloadError) {
      console.error('Error downloading file:', downloadError)
      return new Response(JSON.stringify({ error: 'Error downloading file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const arrayBuffer = await fileData.arrayBuffer()
    const base64PDF = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash',
        messages: [
          {
            role: 'system',
            content: `Você é o "Dr. IA", um especialista em medicina esportiva e análise clínica de alta performance.
Analise o PDF do exame laboratorial fornecido e extraia os marcadores solicitados.
Para cada marcador, identifique o código (ex: vitamina_d, ferritina, hemoglobina, etc), o nome amigável, o valor numérico e a unidade.
Forneça também um parecer técnico em markdown (3 a 5 parágrafos) focado em performance esportiva e um score geral de performance (0-100).
Retorne os dados estritamente no formato JSON solicitado.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise este exame laboratorial e extraia os principais marcadores de saúde e performance.'
              },
              {
                type: 'image_url', // Gemini gateway treats files as image_url or similar if it's base64 with data uri
                image_url: {
                  url: `data:application/pdf;base64,${base64PDF}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        tools: [
          {
            type: 'function',
            function: {
              name: 'save_analysis',
              description: 'Salva a análise do exame laboratorial',
              parameters: {
                type: 'object',
                properties: {
                  parecer_tecnico: { type: 'string' },
                  score_performance: { type: 'number' },
                  marcadores: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        codigo: { type: 'string' },
                        nome: { type: 'string' },
                        valor: { type: 'number' },
                        unidade: { type: 'string' },
                        status: { type: 'string', enum: ['otimo', 'atencao', 'critico'] },
                        observacao: { type: 'string' }
                      },
                      required: ['codigo', 'nome', 'valor', 'unidade', 'status', 'observacao']
                    }
                  }
                },
                required: ['parecer_tecnico', 'score_performance', 'marcadores']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'save_analysis' } }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI Gateway Error:', errorText)
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Muitas requisições. Tente novamente em instantes.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA insuficientes.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ error: 'Erro ao processar análise com IA' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const aiResult = await response.json()
    const toolCall = aiResult.choices[0].message.tool_calls[0]
    const analysisData: AIResponse = JSON.parse(toolCall.function.arguments)

    // Cross-reference with references_exames and inteligencia_clinica
    for (const marker of analysisData.marcadores) {
      const { data: ref } = await supabase
        .from('referencias_exames')
        .select('*')
        .eq('codigo', marker.codigo)
        .single()

      if (ref) {
        // Evaluate status based on "ouro" range
        if (marker.valor >= ref.valor_ouro_min && marker.valor <= ref.valor_ouro_max) {
          marker.status = 'otimo'
        } else if (marker.valor < ref.valor_minimo || marker.valor > ref.valor_maximo) {
          marker.status = 'critico'
        } else {
          marker.status = 'atencao'
        }

        // Enrich with intelligence
        if (marker.status !== 'otimo') {
          const condicao = marker.valor < ref.valor_ouro_min ? 'baixa' : 'alta'
          const { data: intel } = await supabase
            .from('inteligencia_clinica')
            .select('*')
            .eq('biomarcador_codigo', marker.codigo)
            .eq('condicao', condicao)
            .maybeSingle()

          if (intel) {
            marker.observacao = `${intel.interpretacao} Sugestão: ${intel.sugestao_conduta}`
          }
        }
      }
    }

    // Save to analises_clinicas
    const { data: analise, error: analiseError } = await supabase
      .from('analises_clinicas')
      .insert({
        user_id: user.id,
        parecer_ia: analysisData.parecer_tecnico,
        score_performance: analysisData.score_performance,
        url_arquivo: file_path,
        status: 'concluido',
        dados_extraidos: analysisData
      })
      .select()
      .single()

    if (analiseError) {
      console.error('Error saving analysis:', analiseError)
      throw analiseError
    }

    // Save to exames_biomarcadores
    const biomarcadores = analysisData.marcadores.map(m => ({
      analise_id: analise.id,
      user_id: user.id,
      codigo: m.codigo,
      nome: m.nome,
      valor: m.valor,
      unidade: m.unidade,
      classificacao: m.status,
      observacao: m.observacao
    }))

    const { error: biomarcadoresError } = await supabase
      .from('exames_biomarcadores')
      .insert(biomarcadores)

    if (biomarcadoresError) {
      console.error('Error saving biomarcadores:', biomarcadoresError)
    }

    return new Response(JSON.stringify({
      analise_id: analise.id,
      parecer_tecnico: analysisData.parecer_tecnico,
      score_performance: analysisData.score_performance,
      marcadores: analysisData.marcadores
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unhandled Error:', error)
    return new Response(JSON.stringify({ error: 'Erro interno no servidor' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
