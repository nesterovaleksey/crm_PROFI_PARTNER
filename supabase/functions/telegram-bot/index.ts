// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'
import * as XLSX from 'npm:xlsx@0.18.5'

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

    const fromId = update.message?.from?.id || update.callback_query?.from?.id;
    let isAdmin = false;
    if (fromId) {
      const { data: senderDriver } = await supabase
        .from('drivers')
        .select('is_admin')
        .eq('telegram_id', fromId)
        .maybeSingle();
      isAdmin = senderDriver?.is_admin === true;
    }

    // 1. Handle Callback Query (Rollback / Deletion)
    const callbackQuery = update.callback_query;
    if (callbackQuery && callbackQuery.data) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
      if (!isAdmin) {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: 'Доступ ограничен.'
          })
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const data = callbackQuery.data;
      if (data.startsWith('rollback:')) {
        const filename = data.substring('rollback:'.length);
        const { error: deleteError } = await supabase
          .from('weekly_incomes')
          .delete()
          .eq('file_name', filename);

        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            callback_query_id: callbackQuery.id,
            text: deleteError ? 'Ошибка отмены' : 'Загрузка отменена'
          })
        });

        const newText = deleteError 
          ? `❌ Ошибка при удалении данных файла ${filename}: ${deleteError.message}`
          : `↩️ *Загрузка файла ${filename} отменена.*\nВсе строки были успешно удалены из базы.`;

        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: callbackQuery.message.chat.id,
            message_id: callbackQuery.message.message_id,
            text: newText,
            parse_mode: 'Markdown'
          })
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Handle Document Uploads (Excel)
    const message = update.message || update.edited_message || update.channel_post;
    if (message && message.document) {
      const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')!;
      const chatId = message.chat.id;

      if (!isAdmin) {
        if (message.chat.type === 'private') {
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: 'У вас нет прав для загрузки отчетов.'
            })
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      const doc = message.document;
      const filename = doc.file_name || '';

      if (!filename.toLowerCase().endsWith('.xlsx')) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: 'Пожалуйста, отправьте файл в формате Excel (.xlsx).'
          })
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      try {
        // Send a loading status message first
        const loadingRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⏳ Обработка файла ${filename}...`
          })
        });
        const loadingData = await loadingRes.json();
        const loadingMsgId = loadingData.result?.message_id;

        // Get file path from Telegram
        const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${doc.file_id}`);
        const fileJson = await fileRes.json();
        if (!fileJson.ok) {
          throw new Error('Не удалось получить информацию о файле от Telegram.');
        }

        const filePath = fileJson.result.file_path;
        const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
        
        // Download
        const downloadRes = await fetch(downloadUrl);
        const arrayBuffer = await downloadRes.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Parse Excel
        const workbook = XLSX.read(uint8Array, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[];

        if (rawRows.length < 2) {
          throw new Error('Файл пуст или содержит некорректные данные.');
        }

        const headers = rawRows[0];
        const indexMap: Record<string, number> = {};
        headers.forEach((h: any, idx: number) => {
          if (h) indexMap[h.toString().trim()] = idx;
        });

        const getColIndex = (options: string[]) => {
          for (let opt of options) {
            if (indexMap[opt] !== undefined) return indexMap[opt];
          }
          return -1;
        };

        const uberGotowkaIdx = getColIndex(['Uber Netto\n(gotówka)', 'Uber Netto (gotówka)', 'Uber Netto (gotowka)']);
        const uberIdx = getColIndex(['Uber Netto']);
        const boltGotowkaIdx = getColIndex(['Bolt Netto (gotówka)', 'Bolt Netto (gotowka)']);
        const boltIdx = getColIndex(['Bolt Netto ', 'Bolt Netto']);
        const freenowKIdx = getColIndex(['FreeNow Netto ', 'FreeNow Netto (k)', 'FreeNow Netto k']);
        const freenowLIdx = getColIndex(['FreeNow Netto', 'FreeNow Netto (l)', 'FreeNow Netto l']);
        
        const vatIdx = indexMap['VAT'];
        const partnerIdx = indexMap['Partner'];
        const autoIdx = indexMap['Auto'];
        const korektyIdx = getColIndex(['Korekty', 'Inne']);
        const zusIdx = indexMap['ZUS'];
        
        const doWyplatyIdx = indexMap['Do wypłaty'];
        const zwrotIdx = getColIndex(['Zwrot kosztów', 'Zwrot kosztow']);
        const umowaIdx = getColIndex(['Umowa zlecenie', 'Umowa zlecenie']);

        const imieNazwiskoIdx = indexMap['Imię Nazwisko'];
        const numerTelIdx = getColIndex(['Numer Tel', 'Numer telefonu', 'Phone']);
        const emailIdx = getColIndex(['E-mail', 'Email']);
        const uberBruttoIdx = getColIndex(['Uber Brutto']);
        const boltBruttoIdx = getColIndex(['Bolt Brutto']);
        const freenowBruttoIdx = getColIndex(['FreeNow Brutto']);
        const brutto3AplIdx = getColIndex(['Brutto 3 apl']);
        const umowaNajmuIdx = getColIndex(['Umowa najmu']);

        if (imieNazwiskoIdx === -1) {
          throw new Error('Колонка "Imię Nazwisko" не найдена в таблице Excel.');
        }

        // Helper to extract period
        const parsePeriodFromFilename = (fname: string): string => {
          const base = fname.replace(/\.xlsx$/i, '').trim();
          if (/\d{4}$/.test(base)) {
            return base;
          }
          const year = new Date().getFullYear();
          return `${base} ${year}`;
        };
        const periodName = parsePeriodFromFilename(filename);

        const incomesToInsert = [];
        for (let i = 1; i < rawRows.length; i++) {
          const row = rawRows[i];
          if (!row || row.length === 0) continue;

          const nameVal = row[imieNazwiskoIdx];
          if (!nameVal) continue;
          
          const driverFio = nameVal.toString().trim();
          if (['Suma', 'Razem', 'Podsumowanie', 'VAT BRUTTO', 'Imię Nazwisko'].includes(driverFio) || driverFio.toLowerCase().includes('brutto')) {
            continue;
          }

          const num = (idx: number) => {
            if (idx === -1 || row[idx] === undefined || row[idx] === null) return 0;
            const val = parseFloat(row[idx].toString().replace(',', '.'));
            return isNaN(val) ? 0 : val;
          };

          const txt = (idx: number) => {
            if (idx === -1 || row[idx] === undefined || row[idx] === null) return '';
            return row[idx].toString().trim();
          };

          incomesToInsert.push({
            period_name: periodName,
            file_name: filename,
            uber_netto_gotowka: num(uberGotowkaIdx),
            uber_netto: num(uberIdx),
            bolt_netto_gotowka: num(boltGotowkaIdx),
            bolt_netto: num(boltIdx),
            freenow_netto_k: num(freenowKIdx),
            freenow_netto_l: num(freenowLIdx),
            vat: num(vatIdx),
            partner: num(partnerIdx),
            auto: num(autoIdx),
            korekty: num(korektyIdx),
            zus: num(zusIdx),
            do_wyplaty: num(doWyplatyIdx),
            zwrot_kosztow: num(zwrotIdx),
            umowa_zlecenie: num(umowaIdx),
            
            imie_nazwisko: txt(imieNazwiskoIdx),
            numer_tel: txt(numerTelIdx),
            email: txt(emailIdx),
            uber_brutto: num(uberBruttoIdx),
            bolt_brutto: num(boltBruttoIdx),
            freenow_brutto: num(freenowBruttoIdx),
            brutto_3_apl: num(brutto3AplIdx),
            umowa_najmu: num(umowaNajmuIdx),
          });
        }

        // Delete duplicates for this file name
        await supabase
          .from('weekly_incomes')
          .delete()
          .eq('file_name', filename);

        // Insert
        const { error: insertError } = await supabase
          .from('weekly_incomes')
          .insert(incomesToInsert);

        if (insertError) throw insertError;

        // Edit loading message to show final report
        const reportText = `📥 *Файл ${filename} успешно обработан!*\n\nВсего найдено строк: *${incomesToInsert.length}*.\nВсего загружено строк: *${incomesToInsert.length}*.`;
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            message_id: loadingMsgId,
            text: reportText,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '↩️ Отменить загрузку',
                    callback_data: `rollback:${filename}`
                  }
                ]
              ]
            }
          })
        });

      } catch (err) {
        console.error("Error processing document:", err);
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: `❌ Ошибка при обработке файла: ${err.message}`
          })
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

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
