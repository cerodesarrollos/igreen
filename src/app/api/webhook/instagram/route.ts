/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const VERIFY_TOKEN = 'igreen_webhook_2026';
const APP_SECRET = process.env.META_APP_SECRET || '37fdb89f28f0dbcdc7522ace4215e2af';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const SYSTEM_PROMPT = `Sos el asistente virtual de iGreen, un local de Apple en Recoleta, Buenos Aires.
Dirección: Los Ríos 1774, Recoleta (CABA).
Horario: Lunes a Viernes 10:30 a 19:00, Sábados 10:30 a 14:00.

Tu trabajo: atender consultas por Instagram, vender equipos usados y nuevos, ofrecer trade-in.

REGLAS ESTRICTAS:
- Respondé SOLO con info del STOCK DISPONIBLE que te paso. NUNCA inventes equipos, precios o disponibilidad.
- Si no hay stock de lo que piden → decí que no tenés pero ofrecé avisar cuando entre uno.
- Sé conciso (2-3 oraciones máximo), amigable, porteño natural. Usá "vos", no "tú".
- Si preguntan precio y el equipo está en stock, dalo. Si no hay precio cargado, decí que lo consultás.
- Si mandan fotos → agradecer y comentar lo que ves (estado del equipo, etc.)
- Si mandan audio transcrito (empieza con 🎤) → respondé al contenido de la transcripción.
- Si mandan reels, stories, o contenido compartido → ignorá con un "Gracias por compartir! 😄" breve.
- Para trade-in: preguntá modelo, capacidad, estado y batería del equipo que quieren dar.
- Si preguntan algo que no sabés (reparaciones complejas, garantía extendida, precios especiales) → "Eso lo maneja mi compañero Kennet, te paso su contacto?" o "Le consulto a Matías y te confirmo".
- NUNCA digas que sos IA, bot, o agente. Sos "del equipo de iGreen".
- Usá emojis con moderación (1-2 por mensaje máximo). 🍏 es tu favorito.

FORMATO: Texto plano, sin markdown, sin asteriscos, sin bullets. Como un mensaje normal de Instagram.`;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function getIgUserProfile(senderId: string): Promise<{ name: string | null; username: string | null }> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v17.0/${senderId}?fields=name,username&access_token=${PAGE_ACCESS_TOKEN}`
    );
    if (!res.ok) return { name: null, username: null };
    const data = await res.json();
    return { name: data.name || null, username: data.username || null };
  } catch {
    return { name: null, username: null };
  }
}

async function getAvailableStock(): Promise<string> {
  try {
    const { data } = await getSupabase()
      .from('ig_products')
      .select('model, brand, capacity, color, condition, battery_health, sale_price, status, defects, notes, is_new')
      .eq('status', 'disponible');
    
    if (!data || data.length === 0) return 'NO HAY STOCK DISPONIBLE en este momento.';
    
    return 'STOCK DISPONIBLE:\n' + data.map(p => 
      `- ${p.brand} ${p.model} ${p.capacity || ''} ${p.color || ''} | Condición: ${p.condition || 'N/A'} | Batería: ${p.battery_health || 'N/A'}% | Precio: USD ${p.sale_price || 'sin precio'} | ${p.is_new ? 'NUEVO' : 'Usado'}${p.defects ? ` | Defectos: ${p.defects}` : ''}`
    ).join('\n');
  } catch {
    return 'Error al consultar stock.';
  }
}

async function getConversationHistory(senderId: string): Promise<string> {
  try {
    const { data } = await getSupabase()
      .from('ig_messages')
      .select('direction, message_text, created_at')
      .eq('conversation_id', senderId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!data || data.length === 0) return '';
    
    return 'HISTORIAL RECIENTE:\n' + data.reverse().map(m => 
      `${m.direction === 'inbound' ? 'Cliente' : 'iGreen'}: ${m.message_text}`
    ).join('\n');
  } catch {
    return '';
  }
}

async function generateResponse(messageText: string, senderId: string, senderName: string | null): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  
  try {
    const [stock, history] = await Promise.all([
      getAvailableStock(),
      getConversationHistory(senderId),
    ]);

    const userMessage = `${stock}\n\n${history}\n\nNuevo mensaje de ${senderName || 'cliente'}:\n${messageText}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.error('Anthropic API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    return data.content?.[0]?.text || null;
  } catch (err) {
    console.error('Generate response error:', err);
    return null;
  }
}

async function sendInstagramReply(recipientId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

async function sendInstagramPhotos(recipientId: string, photoUrls: string[]): Promise<void> {
  for (const url of photoUrls) {
    try {
      await fetch(
        `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: recipientId },
            message: { attachment: { type: 'image', payload: { url } } },
          }),
        }
      );
    } catch { /* silent */ }
  }
}

// Notify Matias via Telegram (fire-and-forget)
function notifyTelegram(senderId: string, senderName: string | null, messageText: string, agentReply?: string) {
  const botToken = '8635466884:AAE6SgnxzPtp-es4Fdybws_cgRa8i83Ul_M';
  const chatId = '1708555508';
  let text = `📩 DM Instagram\n\nDe: ${senderName || senderId}\nMensaje: ${messageText}`;
  if (agentReply) text += `\n\n🤖 Respondí:\n${agentReply}`;
  
  fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  }).catch(() => {});
}

// ========== ROUTES ==========

// GET — Meta webhook verification
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// POST — receive Instagram messages + auto-respond
export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('x-hub-signature-256');

  if (signature) {
    const expectedSig = 'sha256=' + crypto
      .createHmac('sha256', APP_SECRET)
      .update(body)
      .digest('hex');
    if (signature !== expectedSig) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return new NextResponse('Bad Request', { status: 400 });
  }

  try {
    for (const entry of (payload.entry || [])) {
      for (const event of (entry.messaging || [])) {
        if (!event.message) continue;

        // Echo = message sent BY the page → save as outbound, don't respond
        if (event.message.is_echo) {
          const echoMsg = event.message;
          await getSupabase().from('ig_messages').upsert({
            ig_message_id: echoMsg.mid,
            ig_sender_id: event.recipient?.id || '',
            message_text: echoMsg.text || `[${echoMsg.attachments?.[0]?.type || 'media'}]`,
            message_type: 'text',
            direction: 'outbound',
            status: 'replied',
            conversation_id: event.recipient?.id || '',
            assigned_to: 'agent',
            raw_payload: event,
          }, { onConflict: 'ig_message_id' });
          continue;
        }

        const senderId = event.sender?.id;
        const msg = event.message;

        let messageType = 'text';
        let mediaUrl = null;
        let messageText = msg.text || '';

        if (msg.attachments?.length > 0) {
          const att = msg.attachments[0];
          messageType = att.type;
          mediaUrl = att.payload?.url || null;

          // Transcribe audio with Whisper
          if (att.type === 'audio' && att.payload?.url && OPENAI_API_KEY) {
            try {
              const audioRes = await fetch(att.payload.url);
              if (audioRes.ok) {
                const audioBlob = await audioRes.blob();
                const formData = new FormData();
                formData.append('file', audioBlob, 'audio.mp4');
                formData.append('model', 'whisper-1');
                formData.append('language', 'es');
                const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                  body: formData,
                });
                if (whisperRes.ok) {
                  const whisperData = await whisperRes.json();
                  messageText = `🎤 ${whisperData.text}`;
                  messageType = 'audio_transcribed';
                } else {
                  messageText = '[audio - no se pudo transcribir]';
                }
              }
            } catch (err) {
              console.error('Whisper error:', err);
              messageText = '[audio - error al transcribir]';
            }
          } else if (!messageText) {
            messageText = `[${att.type}]`;
          }
        }

        // Fetch sender profile
        const { name: senderName, username: senderUsername } = await getIgUserProfile(senderId);

        // Save inbound message
        await getSupabase().from('ig_messages').upsert({
          ig_message_id: msg.mid,
          ig_sender_id: senderId,
          sender_name: senderName,
          sender_username: senderUsername,
          message_text: messageText,
          message_type: messageType,
          media_url: mediaUrl,
          direction: 'inbound',
          status: 'unread',
          assigned_to: 'agent',
          conversation_id: senderId,
          raw_payload: event,
        }, { onConflict: 'ig_message_id' });

        // Skip auto-response for reels, story mentions, and shared media without text
        const skipTypes = ['ig_reel', 'story_mention'];
        if (skipTypes.includes(messageType)) {
          notifyTelegram(senderId, senderName, messageText);
          continue;
        }

        // Generate AI response and reply instantly
        const reply = await generateResponse(messageText, senderId, senderName);
        
        if (reply) {
          const sent = await sendInstagramReply(senderId, reply);
          if (sent) {
            // Mark inbound as replied
            await getSupabase()
              .from('ig_messages')
              .update({ status: 'replied' })
              .eq('ig_message_id', msg.mid);
          }
        }

        // Notify Matias with message + agent reply
        notifyTelegram(senderId, senderName, messageText, reply || undefined);
      }
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }

  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}
