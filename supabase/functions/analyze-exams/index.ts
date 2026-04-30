import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

interface Marker {
  codigo: string
  nome: string
  valor: number
  unidade: string
  status: "Otimizado" | "Alerta" | "Critico" | "Subotimizado"
  insight_clinico: string
}

interface AIResponse {
  pontuacao_geral: number
  resumo_executivo: string
  marcadores: Marker[]
  conduta_sugerida: string[]
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

    // Fetch Reference Data
    const { data: refData } = await supabase.from('referencias_exames').select('*')
    const { data: intelData } = await supabase.from('inteligencia_clinica').select('*')

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

    // Context for AI
    const referenceContext = JSON.stringify(refData?.map(r => ({
      codigo: r.codigo,
      nome: r.nome,
      unidade: r.unidade,
      clinico_min: r.valor_minimo,
      clinico_max: r.valor_maximo,
      performance_min: r.valor_ouro_min,
      performance_max: r.valor_ouro_max
    })))

    const intelligenceContext = JSON.stringify(intelData?.map(i => ({
      biomarcador: i.biomarcador_codigo,
      condicao: i.condicao,
      interpretacao: i.interpretacao,
      conduta: i.sugestao_conduta
    })))

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é o "Dr. IA", um especialista em medicina integrativa e performance humana. Sua missão é ler dados de OCR de exames de sangue e transformá-los em um relatório de biohacking e longevidade. Seja técnico, mas encorajador. Priorize a prevenção e a otimização, não apenas a ausência de doença.

REGRAS DE ANÁLISE:
1. PERFORMANCE (GOLD STANDARD): Use os ranges de PERFORMANCE (Performance Min/Max) como alvo. Se o valor estiver no range clínico mas fora do range de performance, status é "Subotimizado".
2. STATUS: Otimizado (dentro do range performance), Alerta (range clínico mas fora performance), Critico (fora range clínico), Subotimizado (específico para quando está próximo da borda inferior/superior da performance mas ainda 'normal').
3. LÓGICA SISTÊMICA: Use o contexto de inteligência clínica para correlações. (Ex: Vitamina D e Ferritina baixas juntas indicam comprometimento imunológico/energia).
4. CÁLCULOS: Se encontrar Testosterona Total, SHBG e Albumina, calcule a Testosterona Livre estimada.

DADOS DE REFERÊNCIA:
${referenceContext}

INTELIGÊNCIA CLÍNICA:
${intelligenceContext}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise este exame laboratorial. Retorne um JSON estrito seguindo a estrutura: { "pontuacao_geral": 0-100, "resumo_executivo": "3 parágrafos focando em Estado Atual, Riscos e Prioridade #1", "marcadores": [{ "codigo", "nome", "valor", "unidade", "status": "Otimizado"|"Alerta"|"Critico"|"Subotimizado", "insight_clinico" }], "conduta_sugerida": ["ação 1", "ação 2"] }'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64PDF}`
                }
              }
            ]
          }
        ],
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI Gateway Error:', errorText)
      return new Response(JSON.stringify({ error: 'Erro ao processar análise com IA' }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const aiResult = await response.json()
    const analysisData: AIResponse = JSON.parse(aiResult.choices[0].message.content)

    // Save to analises_clinicas
    const { data: analise, error: analiseError } = await supabase
      .from('analises_clinicas')
      .insert({
        user_id: user.id,
        parecer_ia: analysisData.resumo_executivo,
        score_performance: analysisData.pontuacao_geral,
        url_arquivo: file_path,
        status: 'concluido',
        dados_extraidos: analysisData,
        resumo_clinico: analysisData.conduta_sugerida.join('\n')
      })
      .select()
      .single()

    if (analiseError) throw analiseError

    // Save to exames_biomarcadores
    const biomarcadores = analysisData.marcadores.map(m => ({
      analise_id: analise.id,
      user_id: user.id,
      codigo: m.codigo,
      nome: m.nome,
      valor: m.valor,
      unidade: m.unidade,
      classificacao: m.status,
      observacao: m.insight_clinico,
      data_exame: new Date().toISOString().split('T')[0]
    }))

    const { error: biomarcadoresError } = await supabase
      .from('exames_biomarcadores')
      .insert(biomarcadores)

    if (biomarcadoresError) console.error('Error saving biomarcadores:', biomarcadoresError)

    return new Response(JSON.stringify({
      analise_id: analise.id,
      ...analysisData
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
