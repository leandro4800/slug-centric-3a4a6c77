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
  sugestao_medicamento?: string
}

interface AIResponse {
  pontuacao_geral: number
  resumo_executivo: string
  marcadores: Marker[]
  conduta_sugerida: string[]
  sugestoes_medicamentos?: string[]
  aviso_medico?: string
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
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: missing auth header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { file_path, texto_exame } = await req.json()

    if (!file_path && !texto_exame) {
      return new Response(JSON.stringify({ error: 'file_path ou texto_exame é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // === LIMITE: 1 análise de exame por mês por aluno ===
    const startOfMonth = new Date()
    startOfMonth.setUTCDate(1)
    startOfMonth.setUTCHours(0, 0, 0, 0)

    const { count: monthCount, error: countError } = await supabase
      .from('analises_clinicas')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString())

    if (countError) {
      console.error('Erro ao verificar limite mensal:', countError)
    } else if ((monthCount ?? 0) >= 10) {
      const nextMonth = new Date(startOfMonth)
      nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1)
      return new Response(JSON.stringify({
        error: 'limite_mensal_atingido',
        message: 'Você já realizou sua leitura de exames deste mês. A próxima estará disponível no próximo ciclo.',
        proxima_disponivel_em: nextMonth.toISOString(),
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Fetch Reference Data
    const { data: refData } = await supabase.from('referencias_exames').select('*')
    const { data: intelData } = await supabase.from('inteligencia_clinica').select('*')

    let fileBase64: string | null = null
    let fileMime: string = 'application/pdf'

    if (file_path) {
      if (typeof file_path !== 'string' || !file_path.startsWith(`${user.id}/`)) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from('exames_pdfs')
        .download(file_path)

      if (downloadError) {
        console.error('Error downloading file:', downloadError)
        return new Response(JSON.stringify({ error: 'Error downloading file', details: downloadError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const ext = (file_path.split('.').pop() || '').toLowerCase()
      if (ext === 'jpg' || ext === 'jpeg') fileMime = 'image/jpeg'
      else if (ext === 'png') fileMime = 'image/png'
      else if (ext === 'webp') fileMime = 'image/webp'
      else fileMime = 'application/pdf'

      const arrayBuffer = await fileData.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      const chunkSize = 0x8000
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)))
      }
      fileBase64 = btoa(binary)
    }

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
            content: `Você é o "Dr. IA", um especialista em medicina integrativa e performance humana. Sua missão é ler dados de OCR de exames de sangue e transformá-los em um relatório de biohacking e longevidade seguindo a Metodologia Pacholok (Anabolismo Total).
Seja técnico, mas encorajador. Priorize a prevenção e a otimização, não apenas a ausência de doença.

REGRAS DE ANÁLISE:
1. PERFORMANCE (GOLD STANDARD): Use os ranges de PERFORMANCE (Performance Min/Max) como alvo. Se o valor estiver no range clínico mas fora do range de performance, status é "Subotimizado".
2. STATUS: Otimizado (dentro do range performance), Alerta (range clínico mas fora performance), Critico (fora range clínico), Subotimizado (próximo da borda da performance mas ainda 'normal').
3. RISCO CRÍTICO (ALÉM DA GENÉTICA):
   - Se Hematócrito > 52%, o status DEVE ser "Critico" e você deve adicionar um aviso de "RISCO CRÍTICO CARDIOVASCULAR" citando a base do Anabolismo Total.
   - Se TGP > 3x o limite superior clínico (valor_maximo), o status DEVE ser "Critico" com aviso de "ESTRESSE HEPÁTICO SEVERO".
4. LÓGICA SISTÊMICA: Use o contexto de inteligência clínica para correlações.
5. CÁLCULOS: Se encontrar Testosterona Total, SHBG e Albumina, calcule a Testosterona Livre estimada.

REGRAS DE SUGESTÃO DE MEDICAMENTOS / SUPLEMENTAÇÃO:
- Quando um marcador estiver "Alerta", "Critico" ou "Subotimizado", inclua em "sugestao_medicamento" do marcador uma sugestão GENÉRICA de classe terapêutica ou suplemento.
- NUNCA prescreva. Sempre escreva no tom de "sugestão para discussão com seu médico".
- Em "sugestoes_medicamentos" (array no nível raiz) liste de forma consolidada as principais sugestões priorizadas.
- SEMPRE preencha "aviso_medico" com um disclaimer claro orientando o usuário a procurar um médico antes de iniciar qualquer medicamento ou suplemento.

DADOS DE REFERÊNCIA:
${referenceContext}

INTELIGÊNCIA CLÍNICA:
${intelligenceContext}`
          },
          {
            role: 'user',
            content: fileBase64 ? [
              {
                type: 'text',
                text: 'Analise este exame laboratorial. Retorne APENAS um JSON estrito: { "pontuacao_geral": 0-100, "resumo_executivo": "3 parágrafos: Estado Atual, Riscos e Prioridade #1", "marcadores": [{ "codigo", "nome", "valor", "unidade", "status": "Otimizado"|"Alerta"|"Critico"|"Subotimizado", "insight_clinico", "sugestao_medicamento": "" }], "conduta_sugerida": ["..."], "sugestoes_medicamentos": ["..."], "aviso_medico": "..." }'
              },
              fileMime === 'application/pdf' ? {
                type: 'file',
                file: {
                  filename: 'exame.pdf',
                  file_data: `data:application/pdf;base64,${fileBase64}`
                }
              } : {
                type: 'image_url',
                image_url: { url: `data:${fileMime};base64,${fileBase64}` }
              }
            ] : `Analise os resultados laboratoriais a seguir (colados manualmente pelo paciente). Retorne APENAS um JSON estrito: { "pontuacao_geral": 0-100, "resumo_executivo": "3 parágrafos: Estado Atual, Riscos e Prioridade #1", "marcadores": [{ "codigo", "nome", "valor", "unidade", "status": "Otimizado"|"Alerta"|"Critico"|"Subotimizado", "insight_clinico", "sugestao_medicamento": "" }], "conduta_sugerida": ["..."], "sugestoes_medicamentos": ["..."], "aviso_medico": "..." }\n\nDADOS DO EXAME:\n${texto_exame}`
          }
        ],
        max_completion_tokens: 8192,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI Gateway Error:', response.status, errorText)
      return new Response(JSON.stringify({ error: 'Erro ao processar análise com IA', status: response.status, details: errorText }), { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const aiResult = await response.json()
    const rawContent: string = aiResult.choices?.[0]?.message?.content ?? ''
    const finishReason = aiResult.choices?.[0]?.finish_reason
    if (finishReason && finishReason !== 'stop') {
      console.warn('AI finish_reason não-stop:', finishReason, 'len:', rawContent.length)
    }

    function parseAIJson(text: string): AIResponse {
      let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      const start = cleaned.search(/[{\[]/)
      if (start === -1) throw new Error('Sem JSON na resposta da IA')
      cleaned = cleaned.substring(start)
      try { return JSON.parse(cleaned) as AIResponse } catch {}
      // Recovery: close open string/arrays/braces caused por truncamento
      let s = cleaned
      const quotes = (s.match(/(?<!\\)"/g) || []).length
      if (quotes % 2 === 1) s += '"'
      s = s.replace(/,\s*$/, '')
      const opens = (s.match(/\{/g) || []).length
      const closes = (s.match(/\}/g) || []).length
      const obrs = (s.match(/\[/g) || []).length
      const cbrs = (s.match(/\]/g) || []).length
      s += ']'.repeat(Math.max(0, obrs - cbrs))
      s += '}'.repeat(Math.max(0, opens - closes))
      s = s.replace(/,(\s*[}\]])/g, '$1')
      return JSON.parse(s) as AIResponse
    }

    const analysisData: AIResponse = parseAIJson(rawContent)

    // Save to analises_clinicas
    const { data: analise, error: analiseError } = await supabase
      .from('analises_clinicas')
      .insert({
        user_id: user.id,
        parecer_ia: analysisData.resumo_executivo,
        score_performance: analysisData.pontuacao_geral,
        url_arquivo: file_path ?? null,
        status: 'concluido',
        dados_extraidos: analysisData,
        resumo_clinico: analysisData.conduta_sugerida.join('\n')
      })
      .select()
      .single()

    if (analiseError) throw analiseError

    // Detect critical risk for dashboard alert
    const isHematocritCritical = analysisData.marcadores.some(m => m.codigo === 'hematocrito' && m.valor > 52);
    const isTGPCritical = analysisData.marcadores.some(m => m.codigo === 'tgp_alt' && m.valor > (refData?.find(r => r.codigo === 'tgp_alt')?.valor_maximo * 3 || 135));

    if (isHematocritCritical || isTGPCritical) {
      const motivo = isHematocritCritical ? "Hematócrito > 52% (Risco Cardiovascular)" : "TGP > 3x Limite (Estresse Hepático)";
      await supabase
        .from('analises_clinicas')
        .update({ alerta_critico: true, motivo_alerta: motivo })
        .eq('id', analise.id);
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
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: 'Erro interno no servidor', details: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})