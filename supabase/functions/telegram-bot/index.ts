import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
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

    const message = update.message || update.edited_message || update.channel_post
    if (message && message.text) {
      const text = message.text.trim().toLowerCase()
      
      // Look for the exact phrase "личный кабинет"
      if (text === 'личный кабинет') {
        const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
        if (!botToken) {
          throw new Error('Missing TELEGRAM_BOT_TOKEN environment variable')
        }

        const chatId = message.chat.id
        console.log(`Sending Web App button to chat: ${chatId}`)

        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: 'Для входа в личный кабинет нажмите на кнопку ниже:',
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
        console.log("Telegram API Response:", JSON.stringify(resData))
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
