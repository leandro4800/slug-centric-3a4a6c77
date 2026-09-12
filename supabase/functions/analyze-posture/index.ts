import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { corsHeaders } from "../_shared/cors.ts"

interface AIResponse {
  resumo_postural: string
  desvios_por_vista: { frontal: string[]; posterior: string[]; lateral: string[] }
  desequilibrios_musculares: { encurtados: string[]; enfraquecidos: string[] }
  impacto_funcional: string
  recomendacoes_treino: { foco: string; exercicios: string[]; series_repeticoes: string }[]
  metas_curto_medio_prazo: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { tenant_id, aluno_id, foto_frontal_path, foto_posterior_path, foto_lateral_path } = await req.json()

    if (!tenant_id || !aluno_id || !foto_frontal_path || !foto_posterior_path || !foto_lateral_path) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Permissão: o próprio aluno OU coach/admin do tenant
    if (user.id !== aluno_id) {
      const { data: role } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant_id)
        .in('role', ['coach', 'admin'])
        .maybeSingle()
      if (!role) {
        return new Response(JSON.stringify({ error: 'forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Limite: 2 análises/mês por aluno (ajustável)
    const LIMITE_MENSAL = 2
    const startOfMonth = new Date()
    startOfMonth.setUTCDate(1); startOfMonth.setUTCHours(0, 0, 0, 0)
    const { count } = await supabase
      .from('avaliacoes_posturais')
      .select('id', { count: 'exact', head: true })
      .eq('aluno_id', aluno_id)
      .gte('created_at', startOfMonth.toISOString())
    if ((count ?? 0) >= LIMITE_MENSAL) {
      return new Response(JSON.stringify({ error: 'limite_mensal_atingido' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Baixa e converte as 3 fotos em base64
    async function toBase64(path: string) {
      let lastError = 'Falha desconhecida'

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const { data, error } = await supabase.storage.from('fotos_posturais').download(path)
        if (!error && data) {
          const bytes = new Uint8Array(await data.arrayBuffer())
          let binary = ''
          const chunkSize = 0x8000
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)))
          }
          return btoa(binary)
        }

        lastError = error?.message ?? 'Arquivo não retornado pelo armazenamento'
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500))
      }

      throw new Error(`Erro ao baixar ${path} após 3 tentativas: ${lastError}`)
    }

    const frontalB64 = await toBase64(foto_frontal_path)
    const posteriorB64 = await toBase64(foto_posterior_path)
    const lateralB64 = await toBase64(foto_lateral_path)

    const systemPrompt = `Você é um especialista sênior em fisioterapia, biomecânica e cinesiologia.
Analise as 3 imagens posturais (1. Vista Frontal, 2. Vista Posterior, 3. Vista Lateral).

DIRETRIZES:
1. Vista Frontal: assimetrias de ombros, inclinação pélvica, alinhamento de joelhos/pés.
2. Vista Posterior: posicionamento escapular, desvios de coluna.
3. Vista Lateral: anteriorização de cabeça, lordose/cifose, alinhamento pélvico.

Retorne APENAS um JSON estrito no formato:
{
  "resumo_postural": "...",
  "desvios_por_vista": { "frontal": ["..."], "posterior": ["..."], "lateral": ["..."] },
  "desequilibrios_musculares": { "encurtados": ["..."], "enfraquecidos": ["..."] },
  "impacto_funcional": "...",
  "recomendacoes_treino": [{ "foco": "...", "exercicios": ["..."], "series_repeticoes": "3x12" }],
  "metas_curto_medio_prazo": ["..."]
}
Linguagem clara, profissional e motivadora. Isto é educacional/funcional, não um diagnóstico médico — nunca use a palavra "diagnóstico".`

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analise estas 3 fotos posturais (frontal, posterior, lateral, nesta ordem) e retorne o JSON estrito.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${frontalB64}` } },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${posteriorB64}` } },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${lateralB64}` } },
            ]
          }
        ],
        max_completion_tokens: 8000,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições atingido. Tente em instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA insuficientes.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      console.error('AI Gateway Error:', response.status, errorText)
      return new Response(JSON.stringify({ error: 'Erro ao processar com IA', details: errorText }), {
        status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const aiResult = await response.json()
    const rawContent: string = aiResult.choices?.[0]?.message?.content ?? ''

    let analysisData: AIResponse
    try {
      const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      analysisData = JSON.parse(cleaned)
    } catch {
      console.error('Falha ao interpretar resposta da IA. len:', rawContent.length)
      return new Response(JSON.stringify({ error: 'Não foi possível interpretar a resposta da IA' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: avaliacao, error: insertError } = await supabase
      .from('avaliacoes_posturais')
      .insert({
        tenant_id, aluno_id,
        foto_frontal_path, foto_posterior_path, foto_lateral_path,
        resultado_json: analysisData,
        status: 'concluido'
      })
      .select()
      .single()

    if (insertError) throw insertError

    return new Response(JSON.stringify({ avaliacao_id: avaliacao.id, ...analysisData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Unhandled Error:', error)
    const msg = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ error: 'Erro interno', details: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
