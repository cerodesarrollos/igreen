import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';
const IG_ID = '17841408400120435'; // @igreen.recoleta

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { recipientId, text, conversationId } = await request.json();

    if (!recipientId || !text) {
      return NextResponse.json({ error: 'recipientId y text son requeridos' }, { status: 400 });
    }

    // Enviar via Meta Graph API (server-side, sin CORS)
    const res = await fetch(`https://graph.facebook.com/v17.0/${IG_ID}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        access_token: PAGE_ACCESS_TOKEN,
      }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      console.error('Meta API error:', data.error);
      return NextResponse.json({ error: data.error?.message || 'Error de Meta API' }, { status: 400 });
    }

    // Guardar outbound en Supabase
    await supabase.from('ig_messages').insert({
      ig_message_id: data.message_id,
      ig_sender_id: IG_ID,
      message_text: text,
      message_type: 'text',
      direction: 'outbound',
      status: 'replied',
      assigned_to: 'human',
      conversation_id: conversationId || recipientId,
    });

    return NextResponse.json({ ok: true, message_id: data.message_id });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Send error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
