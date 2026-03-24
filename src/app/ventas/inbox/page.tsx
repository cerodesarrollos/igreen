'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  AtSign, Search, RefreshCw, UserCheck, Image as ImageIcon,
  Send, AlertCircle
} from 'lucide-react';

interface Message {
  id: string;
  ig_message_id: string;
  ig_sender_id: string;
  sender_username: string | null;
  sender_name: string | null;
  message_text: string;
  message_type: string;
  media_url: string | null;
  direction: 'inbound' | 'outbound';
  status: 'unread' | 'read' | 'replied' | 'archived';
  assigned_to: string;
  conversation_id: string;
  created_at: string;
}

interface Conversation {
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_username: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  status: string;
  messages: Message[];
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const filters = [
    { key: 'todos', label: 'Todos' },
    { key: 'unread', label: 'Sin leer' },
    { key: 'agent', label: 'IA' },
    { key: 'human', label: 'Humano' },
    { key: 'archived', label: 'Archivados' },
  ];

  useEffect(() => {
    fetchConversations();

    // Realtime subscription — escucha INSERT y UPDATE sin refetch completo
    const channel = supabase
      .channel('ig_messages_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ig_messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          setConversations(prev => {
            const cid = newMsg.conversation_id || newMsg.ig_sender_id;
            const existing = prev.find(c => c.conversation_id === cid);

            if (existing) {
              // Agregar mensaje a conversación existente
              return prev.map(c => {
                if (c.conversation_id !== cid) return c;
                const msgs = [...c.messages, newMsg].sort(
                  (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );
                return {
                  ...c,
                  sender_name: newMsg.sender_name || c.sender_name,
                  sender_username: newMsg.sender_username || c.sender_username,
                  last_message: newMsg.message_text || c.last_message,
                  last_message_time: newMsg.created_at,
                  unread_count: newMsg.status === 'unread' && newMsg.direction === 'inbound'
                    ? c.unread_count + 1
                    : c.unread_count,
                  messages: msgs,
                };
              });
            } else {
              // Nueva conversación
              const newConv: Conversation = {
                conversation_id: cid,
                sender_id: newMsg.ig_sender_id,
                sender_name: newMsg.sender_name,
                sender_username: newMsg.sender_username,
                last_message: newMsg.message_text || '',
                last_message_time: newMsg.created_at,
                unread_count: newMsg.status === 'unread' && newMsg.direction === 'inbound' ? 1 : 0,
                status: newMsg.assigned_to || 'agent',
                messages: [newMsg],
              };
              return [newConv, ...prev];
            }
          });

          // Si la conversación está seleccionada, actualizar también selected
          setSelected(prev => {
            if (!prev) return prev;
            const cid = newMsg.conversation_id || newMsg.ig_sender_id;
            if (prev.conversation_id !== cid) return prev;
            const msgs = [...prev.messages, newMsg].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );
            return { ...prev, messages: msgs };
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ig_messages' },
        () => {
          // Para updates (ej: marcar como leído) hacemos refetch liviano
          fetchConversations();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [filterStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  async function fetchConversations() {
    setLoading(true);
    const query = supabase
      .from('ig_messages')
      .select('*')
      .order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // Agrupar por conversation_id
    const convMap = new Map<string, Conversation>();

    for (const msg of (data || [])) {
      const cid = msg.conversation_id || msg.ig_sender_id;

      if (!convMap.has(cid)) {
        convMap.set(cid, {
          conversation_id: cid,
          sender_id: msg.ig_sender_id,
          sender_name: msg.sender_name,
          sender_username: msg.sender_username,
          last_message: msg.message_text || '',
          last_message_time: msg.created_at,
          unread_count: 0,
          status: msg.assigned_to || 'agent',
          messages: [],
        });
      }

      const conv = convMap.get(cid)!;
      conv.messages.push(msg);

      if (msg.status === 'unread' && msg.direction === 'inbound') {
        conv.unread_count++;
      }
    }

    // Ordenar mensajes dentro de cada conversación
    const convList = Array.from(convMap.values()).map(c => ({
      ...c,
      messages: c.messages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    }));

    // Filtrar
    let filtered = convList;
    if (filterStatus === 'unread') {
      filtered = convList.filter(c => c.unread_count > 0);
    } else if (filterStatus === 'agent') {
      filtered = convList.filter(c => c.status === 'agent');
    } else if (filterStatus === 'human') {
      filtered = convList.filter(c => c.status === 'human');
    } else if (filterStatus === 'archived') {
      filtered = convList.filter(c => c.messages.some(m => m.status === 'archived'));
    }

    if (search) {
      filtered = filtered.filter(c =>
        c.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.sender_username?.toLowerCase().includes(search.toLowerCase()) ||
        c.last_message.toLowerCase().includes(search.toLowerCase())
      );
    }

    setConversations(filtered);

    // Actualizar conversación seleccionada si hay
    if (selected) {
      const updated = convList.find(c => c.conversation_id === selected.conversation_id);
      if (updated) setSelected(updated);
    }

    setLoading(false);
  }

  async function selectConversation(conv: Conversation) {
    setSelected(conv);

    // Marcar como leídos
    const unreadIds = conv.messages
      .filter(m => m.status === 'unread' && m.direction === 'inbound')
      .map(m => m.id);

    if (unreadIds.length > 0) {
      await supabase
        .from('ig_messages')
        .update({ status: 'read' })
        .in('id', unreadIds);

      fetchConversations();
    }
  }

  async function assignToHuman(conv: Conversation) {
    await supabase
      .from('ig_messages')
      .update({ assigned_to: 'human' })
      .eq('conversation_id', conv.conversation_id);
    fetchConversations();
  }

  async function sendReply() {
    if (!selected || !replyText.trim() || sending) return;
    setSending(true);

    try {
      const IG_TOKEN = process.env.NEXT_PUBLIC_IG_TOKEN;
      const IG_ID = '26252970514364785';

      if (!IG_TOKEN) {
        alert('Token de Instagram no configurado en variables de entorno');
        return;
      }

      // Enviar via Meta API
      const res = await fetch(`https://graph.instagram.com/v21.0/${IG_ID}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: selected.sender_id },
          message: { text: replyText },
          access_token: IG_TOKEN,
        })
      });

      const data = await res.json();

      if (data.message_id) {
        // Guardar outbound en Supabase
        await supabase.from('ig_messages').insert({
          ig_message_id: data.message_id,
          ig_sender_id: IG_ID,
          message_text: replyText,
          direction: 'outbound',
          status: 'replied',
          assigned_to: 'human',
          conversation_id: selected.conversation_id,
        });

        setReplyText('');
        fetchConversations();
      } else {
        alert('Error enviando: ' + JSON.stringify(data.error));
      }
    } catch (e: unknown) {
      const err = e as Error;
      alert('Error: ' + err.message);
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  }

  function getInitials(name: string | null, username: string | null) {
    const n = name || username || '?';
    return n.slice(0, 2).toUpperCase();
  }

  const noMessages = !loading && conversations.length === 0;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Lista de conversaciones */}
      <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AtSign className="w-5 h-5 text-pink-500" />
              <span className="font-semibold text-slate-800">Instagram DMs</span>
            </div>
            <button onClick={fetchConversations} className="p-1.5 rounded-lg hover:bg-slate-100">
              <RefreshCw className="w-4 h-4 text-slate-500" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {filters.map(f => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterStatus === f.key
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-24">
              <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {noMessages && (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 px-4 text-center">
              <AtSign className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm font-medium">Sin mensajes todavía</p>
              <p className="text-xs mt-1">Los DMs de @igreen.recoleta aparecerán acá</p>
            </div>
          )}

          {conversations.map(conv => (
            <button
              key={conv.conversation_id}
              onClick={() => selectConversation(conv)}
              className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                selected?.conversation_id === conv.conversation_id ? 'bg-green-50 border-l-2 border-l-green-500' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                  {getInitials(conv.sender_name, conv.sender_username)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-medium text-sm text-slate-800 truncate">
                      {conv.sender_name || conv.sender_username || conv.sender_id.slice(0, 10) + '...'}
                    </span>
                    <span className="text-xs text-slate-400 flex-shrink-0 ml-1">
                      {formatTime(conv.last_message_time)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500 truncate">{conv.last_message}</p>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      {conv.unread_count > 0 && (
                        <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                      {conv.status === 'human' && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">H</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Panel de chat */}
      {selected ? (
        <div className="flex-1 flex flex-col bg-white">
          {/* Header del chat */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                {getInitials(selected.sender_name, selected.sender_username)}
              </div>
              <div>
                <p className="font-semibold text-slate-800">
                  {selected.sender_name || selected.sender_username || 'Usuario'}
                </p>
                {selected.sender_username && (
                  <p className="text-xs text-slate-500">@{selected.sender_username}</p>
                )}
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selected.status === 'agent'
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-blue-100 text-blue-600'
              }`}>
                {selected.status === 'agent' ? '🤖 Agente IA' : '👤 Humano'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {selected.status === 'agent' && (
                <button
                  onClick={() => assignToHuman(selected)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition-colors"
                >
                  <UserCheck className="w-4 h-4" />
                  Tomar conversación
                </button>
              )}
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {selected.messages.map(msg => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
                  msg.direction === 'outbound'
                    ? 'bg-green-500 text-white rounded-2xl rounded-br-sm'
                    : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm shadow-sm border border-slate-100'
                } px-4 py-2.5`}>
                  {msg.message_type === 'image' && msg.media_url && (
                    <div className="mb-1">
                      <img src={msg.media_url} alt="imagen" className="rounded-lg max-w-full max-h-60 object-cover" />
                    </div>
                  )}
                  {msg.message_type === 'video' && msg.media_url && (
                    <div className="mb-1">
                      <video src={msg.media_url} controls className="rounded-lg max-w-full max-h-60" />
                    </div>
                  )}
                  {msg.message_type === 'audio' && msg.media_url && (
                    <div className="mb-1">
                      <audio src={msg.media_url} controls className="w-full" />
                    </div>
                  )}
                  {msg.message_type === 'share' && (
                    <div className="flex items-center gap-1 mb-1 opacity-70">
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-xs italic">Contenido compartido</span>
                    </div>
                  )}
                  {!['image','video','audio'].includes(msg.message_type) && msg.message_text && (
                    <p className="text-sm">{msg.message_text}</p>
                  )}
                  {['image','video','audio'].includes(msg.message_type) && msg.message_text && msg.message_text !== `[${msg.message_type}]` && (
                    <p className="text-sm mt-1">{msg.message_text}</p>
                  )}
                  <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-green-100' : 'text-slate-400'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de respuesta */}
          <div className="p-4 border-t border-slate-200 bg-white">
            {selected.status === 'agent' && (
              <div className="flex items-center gap-2 mb-2 text-xs text-slate-500">
                <AlertCircle className="w-3.5 h-3.5" />
                Respondiendo como humano. La IA está asignada a esta conversación.
              </div>
            )}
            <div className="flex items-end gap-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendReply();
                  }
                }}
                placeholder="Escribí una respuesta... (Enter para enviar)"
                rows={2}
                className="flex-1 resize-none px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button
                onClick={sendReply}
                disabled={!replyText.trim() || sending}
                className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {sending
                  ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Send className="w-5 h-5" />
                }
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 text-slate-400">
          <AtSign className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-lg font-medium">Seleccioná una conversación</p>
          <p className="text-sm mt-1">Los mensajes de @igreen.recoleta aparecen acá en tiempo real</p>
        </div>
      )}
    </div>
  );
}
