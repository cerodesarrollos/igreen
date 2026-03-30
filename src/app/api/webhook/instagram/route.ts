/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const VERIFY_TOKEN = 'igreen_webhook_2026';
const APP_SECRET = process.env.META_APP_SECRET || '37fdb89f28f0dbcdc7522ace4215e2af';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

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

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET — verificación del webhook por Meta
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

// POST — recibir mensajes de Instagram
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

        // Echo = message sent BY the page (agent reply) → save as outbound
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

          // Transcribe audio messages with Whisper
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
              console.error('Whisper transcription error:', err);
              messageText = '[audio - error al transcribir]';
            }
          } else if (!messageText) {
            messageText = `[${att.type}]`;
          }
        }

        // Fetch sender profile for display name/username
        const { name: senderName, username: senderUsername } = await getIgUserProfile(senderId);

        // Notify Telegram
        notifyTelegram(senderId, senderName, messageText);

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
      }
    }
  } catch (err) {
    console.error('Webhook error:', err);
  }

  return new NextResponse('EVENT_RECEIVED', { status: 200 });
}

// Notify iGreen agent via Telegram (fire-and-forget)
async function notifyTelegram(senderId: string, senderName: string | null, messageText: string) {
  try {
    const botToken = '8635466884:AAE6SgnxzPtp-es4Fdybws_cgRa8i83Ul_M';
    const chatId = '1708555508';
    const text = `📩 DM Instagram\n\nDe: ${senderName || senderId}\nMensaje: ${messageText}`;
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
  } catch { /* silent */ }
}
