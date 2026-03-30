/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const VERIFY_TOKEN = 'igreen_webhook_2026';
const APP_SECRET = process.env.META_APP_SECRET || '37fdb89f28f0dbcdc7522ace4215e2af';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// WhatsApp Business API (iGreen number)
const WA_PHONE_NUMBER_ID = '523049757565498';
const WA_TOKEN = process.env.WA_ACCESS_TOKEN || '';

const SYSTEM_PROMPT = `Sos el asistente virtual de iGreen, un local de Apple en Recoleta, Buenos Aires.
Dirección: Los Ríos 1774, Recoleta (CABA).
Horario: Lunes a Viernes 10:30 a 19:00, Sábados 10:30 a 14:00.

Tu trabajo: atender consultas por Instagram, vender equipos usados y nuevos, ofrecer trade-in, y agendar turnos.

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

TURNOS:
- Cuando el cliente quiera venir al local, comprar algo, o hacer trade-in → ofrecé agendar un turno.
- Para agendar necesitás: nombre completo y número de teléfono (con código de área, ej: 1168636497).
- Pedí los datos de forma natural en la conversación, no todo junto.
- Cuando tengas nombre y teléfono, usá la herramienta schedule_appointment para crear el turno.
- El turno se agenda para el próximo día hábil a las 15:00 por defecto. Si el cliente pide otro horario, respetalo.
- Después de agendar, confirmale al cliente por Instagram que ya queda agendado.

FORMATO: Texto plano, sin markdown, sin asteriscos, sin bullets. Como un mensaje normal de Instagram.`;

const TOOLS = [
  {
    name: 'schedule_appointment',
    description: 'Agendar un turno para que el cliente visite el local. Usar cuando el cliente confirma que quiere venir y ya dio su nombre y teléfono.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_name: { type: 'string', description: 'Nombre completo del cliente' },
        client_phone: { type: 'string', description: 'Número de teléfono del cliente (solo números, con código de área, ej: 1168636497)' },
        product_interest: { type: 'string', description: 'Equipo por el que consulta o motivo de la visita' },
        preferred_date: { type: 'string', description: 'Fecha preferida en formato YYYY-MM-DD. Si no especificó, usar el próximo día hábil.' },
        preferred_time: { type: 'string', description: 'Hora preferida en formato HH:MM. Default: 15:00' },
        notes: { type: 'string', description: 'Notas adicionales sobre el turno' },
      },
      required: ['client_name', 'client_phone', 'product_interest'],
    },
  },
];

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

function getNextBusinessDay(): string {
  const now = new Date();
  // Convert to Argentina time (UTC-3)
  const argTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const day = argTime.getDay();
  let addDays = 1;
  if (day === 5) addDays = 3; // Friday → Monday
  if (day === 6) addDays = 2; // Saturday → Monday
  if (day === 0) addDays = 1; // Sunday → Monday
  argTime.setDate(argTime.getDate() + addDays);
  return argTime.toISOString().split('T')[0];
}

async function handleScheduleAppointment(input: any, senderId: string, senderUsername: string | null): Promise<string> {
  const date = input.preferred_date || getNextBusinessDay();
  const time = input.preferred_time || '15:00';
  const scheduledAt = `${date}T${time}:00-03:00`;

  // Create appointment in Supabase
  const { data: appt, error } = await getSupabase()
    .from('ig_appointments')
    .insert({
      client_name: input.client_name,
      client_phone: input.client_phone,
      scheduled_at: scheduledAt,
      status: 'confirmado',
      notes: `[Instagram: @${senderUsername || senderId}] ${input.product_interest}${input.notes ? ' | ' + input.notes : ''}`,
    })
    .select()
    .single();

  if (error) {
    console.error('Appointment error:', error);
    return `Error al agendar: ${error.message}`;
  }

  // Format date for display
  const dateObj = new Date(scheduledAt);
  const dayNames = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dateDisplay = `${dayNames[dateObj.getDay()]} ${dateObj.getDate()} de ${monthNames[dateObj.getMonth()]}`;
  const timeDisplay = time;

  // Send WhatsApp confirmation to client
  const phone = input.client_phone.replace(/\D/g, '');
  const waPhone = phone.startsWith('54') ? phone : `54${phone}`;
  const waMessage = `¡Hola ${input.client_name}! 🍏\n\nTe confirmamos tu turno en *iGreen*:\n\n📅 ${dateDisplay} a las ${timeDisplay}hs\n📍 Los Ríos 1774, Recoleta (CABA)\n📱 Consulta: ${input.product_interest}\n\n¡Te esperamos! Si necesitás cambiar el horario, avisanos por acá o por Instagram @igreen.recoleta`;

  if (WA_TOKEN) {
    try {
      await fetch(`https://graph.facebook.com/v17.0/${WA_PHONE_NUMBER_ID}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WA_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: waPhone,
          type: 'text',
          text: { body: waMessage },
        }),
      });
    } catch (err) {
      console.error('WhatsApp send error:', err);
    }
  }

  // Notify Matias via Telegram
  const tgText = `📅 TURNO AGENDADO\n\n👤 ${input.client_name}\n📱 ${input.client_phone}\n📱 IG: @${senderUsername || senderId}\n📅 ${dateDisplay} ${timeDisplay}hs\n🔍 ${input.product_interest}${input.notes ? '\n📝 ' + input.notes : ''}`;
  notifyTelegramRaw(tgText);

  return `Turno agendado correctamente para ${input.client_name} el ${dateDisplay} a las ${timeDisplay}hs. Se envió confirmación por WhatsApp al ${input.client_phone}.`;
}

async function generateResponse(messageText: string, senderId: string, senderName: string | null, senderUsername: string | null): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;

  try {
    const [stock, history] = await Promise.all([
      getAvailableStock(),
      getConversationHistory(senderId),
    ]);

    const today = new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const userMessage = `Fecha actual: ${today}\n\n${stock}\n\n${history}\n\nNuevo mensaje de ${senderName || 'cliente'}:\n${messageText}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!res.ok) {
      console.error('Anthropic API error:', res.status, await res.text());
      return null;
    }

    const data = await res.json();
    
    // Process response - may contain text + tool_use
    let replyText = '';
    let toolResult = '';

    for (const block of (data.content || [])) {
      if (block.type === 'text') {
        replyText += block.text;
      } else if (block.type === 'tool_use' && block.name === 'schedule_appointment') {
        // Execute the appointment booking
        toolResult = await handleScheduleAppointment(block.input, senderId, senderUsername);
        
        // Get follow-up response from Claude after tool execution
        const followUp = await fetch('https://api.anthropic.com/v1/messages', {
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
            messages: [
              { role: 'user', content: userMessage },
              { role: 'assistant', content: data.content },
              { role: 'user', content: [{ type: 'tool_result', tool_use_id: block.id, content: toolResult }] },
            ],
          }),
        });

        if (followUp.ok) {
          const followUpData = await followUp.json();
          const followUpText = followUpData.content?.find((b: any) => b.type === 'text')?.text;
          if (followUpText) replyText = followUpText;
        }
      }
    }

    return replyText || null;
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

// Notify Matias via Telegram (fire-and-forget)
function notifyTelegram(senderId: string, senderName: string | null, messageText: string, agentReply?: string) {
  let text = `📩 DM Instagram\n\nDe: ${senderName || senderId}\nMensaje: ${messageText}`;
  if (agentReply) text += `\n\n🤖 Respondí:\n${agentReply}`;
  notifyTelegramRaw(text);
}

function notifyTelegramRaw(text: string) {
  const botToken = '8635466884:AAE6SgnxzPtp-es4Fdybws_cgRa8i83Ul_M';
  const chatId = '1708555508';
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

        // Skip auto-response for reels, story mentions
        const skipTypes = ['ig_reel', 'story_mention'];
        if (skipTypes.includes(messageType)) {
          notifyTelegram(senderId, senderName, messageText);
          continue;
        }

        // Generate AI response (with tool use for appointments)
        const reply = await generateResponse(messageText, senderId, senderName, senderUsername);

        if (reply) {
          const sent = await sendInstagramReply(senderId, reply);
          if (sent) {
            await getSupabase()
              .from('ig_messages')
              .update({ status: 'replied' })
              .eq('ig_message_id', msg.mid);
          }
        }

        // Notify Matias
        notifyTelegram(senderId, senderName, messageText, reply || undefined);
      }
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }

  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}
