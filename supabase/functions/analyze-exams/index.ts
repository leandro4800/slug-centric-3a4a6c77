import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

interface Marker {
  codigo: string
  nome: string
  valor: number
  unidade: string
  intervalo_referencia: string | null
  status: "DentroReferencia" | "ForaReferencia" | "NaoIdentificado"
  insight_clinico: string
}

interface AIResponse {
  resumo_executivo: string
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
            content: `Você é um assistente de leitura EDUCACIONAL de exames laboratoriais chamado Alpha Insight.

REGRAS OBRIGATÓRIAS (literais):
A análise de exames é exclusivamente informativa e educacional. A IA não deve realizar diagnóstico médico, determinar que o usuário possui uma doença ou condição médica, prescrever medicamentos, indicar doses, recomendar início ou interrupção de tratamentos ou substituir a avaliação de um profissional de saúde. Sempre que um resultado estiver fora do intervalo de referência, explicar que o resultado isolado não permite estabelecer um diagnóstico e recomendar que o usuário converse com um profissional de saúde para avaliação individualizada. Priorizar os intervalos de referência presentes no próprio exame analisado. Não utilizar termos como "diagnóstico", "paciente", "doença confirmada", "tratamento indicado" ou linguagem que faça a IA parecer um médico. Quando houver incerteza, dificuldade de leitura do documento ou ausência de informações suficientes, informar claramente a limitação em vez de criar ou presumir informações.

COMO CLASSIFICAR:
- "DentroReferencia": o valor está dentro do intervalo de referência informado no próprio exame.
- "ForaReferencia": o valor está acima ou abaixo do intervalo de referência informado no exame.
- "NaoIdentificado": o exame não traz intervalo de referência confiável para aquele resultado.
- Nunca use classificações como Otimizado, Alerta, Crítico ou Subotimizado.

CAMPO "intervalo_referencia": copie exatamente o intervalo impresso no exame (ex.: "13,0 - 400,0 ng/mL"). Se não houver, use null.

CAMPO "insight_clinico": explicação educativa, curta e cautelosa, com no máximo 320 caracteres. Exemplo de tom: "O valor informado está acima do intervalo de referência apresentado no exame. Esse resultado pode estar relacionado a diferentes fatores e sua interpretação depende do contexto individual e de outros resultados laboratoriais. Converse com um profissional de saúde para uma avaliação individualizada."

CAMPO "resumo_executivo": 3 parágrafos educativos — (1) panorama geral do que foi lido no documento, (2) quais resultados ficaram fora dos intervalos informados, (3) lembrete de que a leitura é educacional e não substitui avaliação profissional.

DADOS DE REFERÊNCIA (use apenas como apoio quando o exame não trouxer intervalo próprio):
${referenceContext}

CONTEXTO TÉCNICO AUXILIAR (uso apenas educacional):
${intelligenceContext}`
          },
          {
            role: 'user',
            content: fileBase64 ? [
              {
                type: 'text',
                text: 'Leia este exame laboratorial e explique os resultados de forma educacional. Retorne APENAS um JSON estrito: { "resumo_executivo": "3 parágrafos educativos", "marcadores": [{ "codigo", "nome", "valor", "unidade", "intervalo_referencia", "status": "DentroReferencia"|"ForaReferencia"|"NaoIdentificado", "insight_clinico" }] }'
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
            ] : `Leia os resultados laboratoriais a seguir (colados manualmente pelo usuário) e explique de forma educacional. Retorne APENAS um JSON estrito: { "resumo_executivo": "3 parágrafos educativos", "marcadores": [{ "codigo", "nome", "valor", "unidade", "intervalo_referencia", "status": "DentroReferencia"|"ForaReferencia"|"NaoIdentificado", "insight_clinico" }] }\n\nDADOS DO EXAME:\n${texto_exame}`
          }
        ],
        max_completion_tokens: 32000,
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

      // Recovery 1: fechar strings/arrays/objetos abertos por truncamento
      const closeOpen = (input: string): string => {
        let s = input.replace(/,\s*$/, '')
        const quotes = (s.match(/(?<!\\)"/g) || []).length
        if (quotes % 2 === 1) s += '"'
        const opens = (s.match(/\{/g) || []).length
        const closes = (s.match(/\}/g) || []).length
        const obrs = (s.match(/\[/g) || []).length
        const cbrs = (s.match(/\]/g) || []).length
        s += '}'.repeat(Math.max(0, opens - closes - 1))
        s += ']'.repeat(Math.max(0, obrs - cbrs))
        if (opens - closes > 0) s += '}'
        return s.replace(/,(\s*[}\]])/g, '$1')
      }

      try { return JSON.parse(closeOpen(cleaned)) as AIResponse } catch {}

      // Recovery 2: descartar o último objeto de marcador incompleto e fechar
      const lastComplete = cleaned.lastIndexOf('},')
      if (lastComplete > 0) {
        const truncated = cleaned.substring(0, lastComplete + 1)
        for (const suffix of [']}', '}]}', ']}}']) {
          try { return JSON.parse(truncated + suffix) as AIResponse } catch {}
        }
      }

      // Recovery 3: extrair resumo + marcadores completos via regex
      const resumoMatch = cleaned.match(/"resumo_executivo"\s*:\s*"((?:[^"\\]|\\.)*)"/)
      const marcadores: Marker[] = []
      const objRegex = /\{[^{}]*"codigo"[^{}]*\}/g
      for (const m of cleaned.match(objRegex) || []) {
        try { marcadores.push(JSON.parse(m)) } catch { /* ignora */ }
      }
      if (marcadores.length > 0) {
        return {
          resumo_executivo: resumoMatch ? JSON.parse(`"${resumoMatch[1]}"`) : '',
          marcadores,
        }
      }
      throw new Error('Não foi possível ler a resposta da IA')
    }

    let analysisData: AIResponse
    try {
      analysisData = parseAIJson(rawContent)
    } catch (parseErr) {
      console.error('Falha ao interpretar resposta da IA:', parseErr, 'len:', rawContent.length)
      return new Response(JSON.stringify({
        error: 'Não conseguimos ler este exame agora. Tente novamente ou envie um PDF mais legível.',
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    analysisData.marcadores = (analysisData.marcadores ?? [])
      .filter((m) => m && m.nome)
      .map((m) => {
        const raw = m.valor as unknown
        let valor: number | null = null
        if (typeof raw === 'number' && Number.isFinite(raw)) valor = raw
        else if (typeof raw === 'string') {
          const norm = raw.replace(/[^\d,.\-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
          const n = Number.parseFloat(norm)
          valor = Number.isFinite(n) ? n : null
        }
        return { ...m, valor: valor as number }
      })
      .filter((m) => m.valor !== null)


    // Save to analises_clinicas
    const { data: analise, error: analiseError } = await supabase
      .from('analises_clinicas')
      .insert({
        user_id: user.id,
        parecer_ia: analysisData.resumo_executivo,
        score_performance: null,
        url_arquivo: file_path ?? null,
        status: 'concluido',
        dados_extraidos: analysisData,
        resumo_clinico: null
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
      valor_referencia: m.intervalo_referencia ?? null,
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