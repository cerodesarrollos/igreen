/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const VERIFY_TOKEN = 'igreen_webhook_2026';
const APP_SECRET = process.env.META_APP_SECRET || '37fdb89f28f0dbcdc7522ace4215e2af';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';

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
        if (!event.message || event.message.is_echo) continue;

        const senderId = event.sender?.id;
        const msg = event.message;

        let messageType = 'text';
        let mediaUrl = null;
        let messageText = msg.text || '';

        if (msg.attachments?.length > 0) {
          const att = msg.attachments[0];
          messageType = att.type;
          mediaUrl = att.payload?.url || null;
          if (!messageText) messageText = `[${att.type}]`;
        }

        // Fetch sender profile for display name/username
        const { name: senderName, username: senderUsername } = await getIgUserProfile(senderId);

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
