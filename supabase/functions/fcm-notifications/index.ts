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

    const message = {
      token: targetToken,
      notification: { title, body },
      data: data || {},
      android: {
        priority: 'high',
        notification: { sound: 'default', channel_id: 'default' },
      },
      apns: {
        payload: { aps: { contentAvailable: true, mutableContent: true, sound: 'default' } },
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
  return result.access_token
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
