import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  user_id?: string
  token?: string
  title: string
  body: string
  data?: any
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // --- Autenticação ---
  // 1) Chamadas server-to-server (cron de lembretes) usam a service_role key.
  // 2) Demais chamadas exigem JWT de usuário autenticado + autorização abaixo.
  const authHeader = req.headers.get('Authorization') ?? ''
  const bearer = authHeader.replace('Bearer ', '')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

  // Um token de service_role pode chegar em formatos diferentes (JWT legado ou
  // chave nova). Como `verify_jwt = true` já valida a assinatura na borda,
  // basta reconhecer a role do token para aceitar chamadas server-to-server
  // (cron de lembretes via send_push_notification).
  const isServiceRoleJwt = (t: string): boolean => {
    try {
      const part = t.split('.')[1]
      if (!part) return false
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
      const claims = JSON.parse(json)
      return claims?.role === 'service_role'
    } catch {
      return false
    }
  }

  const isServiceCall =
    !!bearer && ((!!serviceKey && bearer === serviceKey) || isServiceRoleJwt(bearer))

  let callerId: string | null = null
  if (!isServiceCall) {
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${bearer}` } } }
    )
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    callerId = userData.user.id
  }

  const logSend = async (entry: {
    user_id?: string | null
    has_token: boolean
    status: string
    error_message?: string | null
    fcm_response?: any
    title?: string
    body?: string
  }) => {
    try {
      await supabaseClient.from('push_send_logs').insert({
        user_id: entry.user_id ?? null,
        has_token: entry.has_token,
        status: entry.status,
        error_message: entry.error_message ?? null,
        fcm_response: entry.fcm_response ?? null,
        title: entry.title ?? null,
        body: entry.body ?? null,
      })
    } catch (e) {
      console.error('Failed to write push_send_logs:', e)
    }
  }

  let payload: NotificationPayload | null = null

  try {
    payload = await req.json()
    const { user_id, token, title, body, data } = payload!

    // --- Autorização (chamadas de usuário, não service) ---
    if (!isServiceCall && callerId) {
      const { data: isAdmin } = await supabaseClient.rpc('has_role', {
        _user_id: callerId,
        _role: 'admin',
      })

      if (!isAdmin) {
        if (user_id && user_id !== callerId) {
          // Coach (dono OU role coach) só notifica alunos do próprio tenant.
          const { data: target } = await supabaseClient
            .from('perfis')
            .select('tenant_id')
            .eq('id', user_id)
            .maybeSingle()

          let allowed = false
          if (target?.tenant_id) {
            const [{ data: owned }, { data: isCoach }] = await Promise.all([
              supabaseClient
                .from('tenants')
                .select('id')
                .eq('id', target.tenant_id)
                .eq('owner_user_id', callerId)
                .maybeSingle(),
              supabaseClient.rpc('has_role', {
                _user_id: callerId,
                _role: 'coach',
                _tenant_id: target.tenant_id,
              }),
            ])
            allowed = !!owned || !!isCoach
          }

          if (!allowed) {
            return new Response(
              JSON.stringify({ error: 'Sem permissão para notificar este usuário' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }
        } else if (!user_id && token) {
          // Token cru: bloqueia só se já estiver ligado a OUTRO usuário.
          // Token recém-obtido ainda não salvo em perfis — liberar pro caller autenticado.
          const { data: owner } = await supabaseClient
            .from('perfis')
            .select('id')
            .eq('push_token', token)
            .maybeSingle()
          if (owner && owner.id !== callerId) {
            return new Response(
              JSON.stringify({ error: 'Sem permissão para notificar este dispositivo' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
            )
          }
        }
      }
    }

    let targetToken = token

    if (user_id && !targetToken) {
      const { data: profile } = await supabaseClient
        .from('perfis')
        .select('push_token')
        .eq('id', user_id)
        .single()

      if (!profile?.push_token) {
        await logSend({
          user_id,
          has_token: false,
          status: 'skipped',
          error_message: 'push_token_not_found',
          title,
          body,
        })
        return new Response(
          JSON.stringify({ success: false, skipped: true, reason: 'push_token_not_found', user_id }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }
      targetToken = profile.push_token
    }

    if (!targetToken) {
      await logSend({ user_id, has_token: false, status: 'error', error_message: 'no_target_token', title, body })
      throw new Error('No target token provided')
    }

    const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountJson) {
      await logSend({ user_id, has_token: true, status: 'error', error_message: 'FIREBASE_SERVICE_ACCOUNT not configured', title, body })
      throw new Error('FIREBASE_SERVICE_ACCOUNT not configured')
    }

    const serviceAccount = JSON.parse(serviceAccountJson)
    const { project_id, client_email, private_key } = serviceAccount

    const accessToken = await getAccessToken(client_email, private_key)
    if (!accessToken) {
      await logSend({
        user_id,
        has_token: true,
        status: 'error',
        error_message: 'Failed to obtain Google OAuth access_token',
        title,
        body,
      })
      throw new Error('Failed to obtain Google OAuth access_token — check FIREBASE_SERVICE_ACCOUNT private_key')
    }

    // FCM exige data values como string
    const stringData: Record<string, string> = {}
    if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        stringData[k] = v == null ? '' : String(v)
      }
    }

    const message = {
      token: targetToken,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channel_id: 'default',
          default_sound: true,
          default_vibrate_timings: true,
        },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            'content-available': 1,
          },
        },
      },
      webpush: {
        notification: { icon: 'https://alpha-coach.app/icon-192x192.png' },
      },
    }

    const fcmResponse = await fetch(
      `https://fcm.googleapis.com/v1/projects/${project_id}/messages:send`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ message }),
      }
    )

    const fcmResult = await fcmResponse.json()
    console.log('FCM Response:', fcmResult)

    if (!fcmResponse.ok) {
      // Token morto (app desinstalado/reinstalado, token antigo de navegador):
      // limpa do perfil para o app registrar um novo na próxima abertura.
      const errCode = fcmResult?.error?.details?.[0]?.errorCode
      if (errCode === 'UNREGISTERED' || errCode === 'INVALID_ARGUMENT' || fcmResponse.status === 404) {
        await supabaseClient
          .from('perfis')
          .update({ push_token: null })
          .eq('push_token', targetToken)
      }

      await logSend({
        user_id,
        has_token: true,
        status: 'error',
        error_message: fcmResult?.error?.message || `HTTP ${fcmResponse.status}`,
        fcm_response: fcmResult,
        title,
        body,
      })
      return new Response(JSON.stringify({ success: false, error: fcmResult }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    await logSend({
      user_id,
      has_token: true,
      status: 'success',
      fcm_response: fcmResult,
      title,
      body,
    })

    return new Response(JSON.stringify({ success: true, result: fcmResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error sending notification:', error)
    await logSend({
      user_id: payload?.user_id,
      has_token: !!payload?.token,
      status: 'error',
      error_message: error?.message || String(error),
      title: payload?.title,
      body: payload?.body,
    })
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const encodedHeader = b64(JSON.stringify(header))
  const encodedPayload = b64(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBinary(privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signatureInput)
  )

  const encodedSignature = b64(signature)
  const jwt = `${signatureInput}.${encodedSignature}`

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  })

  const result = await response.json()
  if (!response.ok || !result.access_token) {
    throw new Error(
      `Google OAuth token failed: ${result.error || result.error_description || JSON.stringify(result)}`,
    )
  }
  return result.access_token as string
}

function b64(data: string | ArrayBuffer): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToBinary(pem: string): Uint8Array {
  const base64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '')
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
