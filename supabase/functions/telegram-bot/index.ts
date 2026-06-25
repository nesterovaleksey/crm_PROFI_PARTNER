import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

serve(async (req) => {
  if (req.method === 'GET') {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    try {
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
      const data = await res.json()
      return new Response(JSON.stringify({ success: true, bot_info: data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (err) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  try {
    const update = await req.json()
    console.log("Received Telegram update:", JSON.stringify(update))

    // Log the payload to the database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { error: dbError } = await supabase
      .from('telegram_logs')
      .insert({ payload: update })
    if (dbError) {
      console.error("Error logging to database:", dbError)
    }

    const message = update.message || update.edited_message || update.channel_post
    if (message && message.text) {
      const text = message.text.trim().toLowerCase()
      const chatId = message.chat.id
      const chatType = message.chat.type
      
      // Look for the exact phrase "личный кабинет" or the command "/start crm"
      if (text === 'личный кабинет' || text.startsWith('/start crm')) {
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
        if (!botToken) {
          throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable')
        }

        // If it's a group or supergroup chat, send a URL button pointing to the private chat
        if (chatType === 'group' || chatType === 'supergroup') {
          console.log(`Group chat detected. Sending redirect button to chat: ${chatId}`)
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: 'Для входа в личный кабинет перейдите по ссылке или нажмите на кнопку ниже:\n👉 https://t.me/Floristika2026Bot?start=crm',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Войти в личный кабинет 🔑',
                      url: 'https://t.me/Floristika2026Bot?start=crm'
                    }
                  ]
                ]
              }
            })
          })

          const resData = await response.json()
          console.log("Telegram API Response (Group redirect):", JSON.stringify(resData))
          if (!resData.ok) {
            return new Response(JSON.stringify({ success: false, error: "Telegram API error", details: resData }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200,
            })
          }
        } else {
          // If it's a private chat, send the direct web_app button
          console.log(`Private chat detected. Sending Web App button to chat: ${chatId}`)
          const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: 'Для входа в личный кабинет перейдите по ссылке или нажмите на кнопку ниже:\n👉 https://t.me/Floristika2026Bot?start=crm',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Войти в PROFI Partner 🚀',
                      web_app: {
                        url: 'https://crm-profi-partner.vercel.app'
                      }
                    }
                  ]
                ]
              }
            })
          })

          const resData = await response.json()
          console.log("Telegram API Response (Private WebApp):", JSON.stringify(resData))
          if (!resData.ok) {
            return new Response(JSON.stringify({ success: false, error: "Telegram API error", details: resData }), {
              headers: { 'Content-Type': 'application/json' },
              status: 200,
            })
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Error processing webhook update:", error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200, // Always return 200 to Telegram to prevent retry loops
    })
  }
})
