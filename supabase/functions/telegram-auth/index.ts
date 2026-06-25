import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

import { create } from 'https://deno.land/x/djwt@v3.0.1/mod.ts'

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('origin')
  const allowedOrigins = [
    'https://crm-profi-partner.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ]
  const allowOrigin = (origin && allowedOrigins.includes(origin)) ? origin : 'https://crm-profi-partner.vercel.app'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { initData } = await req.json()
    if (!initData) {
      throw new Error('Missing initData')
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      throw new Error('Server configuration error: missing TELEGRAM_BOT_TOKEN')
    }

    // 1. Verify Telegram initData
    const urlParams = new URLSearchParams(initData)
    const hash = urlParams.get('hash')
    urlParams.delete('hash')
    
    // Sort params alphabetically
    const paramsArray = []
    for (const [key, value] of urlParams.entries()) {
      paramsArray.push(`${key}=${value}`)
    }
    paramsArray.sort()
    const dataCheckString = paramsArray.join('\n')

// HMAC-SHA256 using Web Crypto API
    const encoder = new TextEncoder()
    const botTokenKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode('WebAppData'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const secretKeyBuf = await crypto.subtle.sign('HMAC', botTokenKey, encoder.encode(botToken))

    const secretKey = await crypto.subtle.importKey(
      'raw',
      secretKeyBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const hashBuf = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(dataCheckString))
    const calculatedHash = Array.from(new Uint8Array(hashBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (calculatedHash !== hash) {
      throw new Error('Invalid Telegram initData signature')
    }

    // Validated! Extract user
    const userStr = urlParams.get('user')
    if (!userStr) throw new Error('No user data in initData')
    const tgUser = JSON.parse(userStr)
    const telegramId = tgUser.id
    console.log("Edge Function: Parsed telegramId:", telegramId, "type:", typeof telegramId);

    // 2. Look up driver in DB
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('telegram_id', telegramId)
      .maybeSingle()

    console.log("Edge Function: DB query result:", driver, "error:", error);

    if (error) throw error
    if (!driver || !driver.is_active) {
      console.log("Edge Function: Driver not found or inactive. Returning is_verified: false");
      return new Response(JSON.stringify({ 
        success: true, 
        is_verified: false
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Generate Custom JWT
    const jwtSecret = Deno.env.get('JWT_SECRET') || Deno.env.get('SUPABASE_JWT_SECRET')
    if (!jwtSecret) {
      throw new Error('Server configuration error: missing JWT_SECRET / SUPABASE_JWT_SECRET')
    }

    // Convert secret string to CryptoKey for djwt
    const keyBuf = encoder.encode(jwtSecret)
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBuf,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const payload = {
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'supabase',
      sub: driver.id,
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
      is_admin: driver.is_admin === true // Custom claim for RLS
    }

    const token = await create({ alg: 'HS256', typ: 'JWT' }, payload, cryptoKey)

    return new Response(JSON.stringify({
      success: true,
      is_verified: true,
      driver,
      access_token: token
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
