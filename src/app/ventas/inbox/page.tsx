'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const channels = [
    { key: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { key: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
    { key: 'messenger', label: 'Messenger', icon: 'forum' },
  ];

  const statusFilters = [
    { key: 'todos', label: 'Todos' },
    { key: 'unread', label: 'Sin leer' },
    { key: 'attention', label: 'Atención' },
    { key: 'waiting', label: 'Esperando' },
    { key: 'done', label: 'Finalizados' },
  ];

  const [activeChannel, setActiveChannel] = useState<string>('instagram');

  useEffect(() => {
    fetchConversations();
    const channel = supabase
      .channel('ig_messages_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ig_messages' }, (payload) => {
        const newMsg = payload.new as Message;
        setConversations(prev => {
          const cid = newMsg.conversation_id || newMsg.ig_sender_id;
          const existing = prev.find(c => c.conversation_id === cid);
          if (existing) {
            return prev.map(c => {
              if (c.conversation_id !== cid) return c;
              const msgs = [...c.messages, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
              return { ...c, sender_name: newMsg.sender_name || c.sender_name, sender_username: newMsg.sender_username || c.sender_username, last_message: newMsg.message_text || c.last_message, last_message_time: newMsg.created_at, unread_count: newMsg.status === 'unread' && newMsg.direction === 'inbound' ? c.unread_count + 1 : c.unread_count, messages: msgs };
            });
          } else {
            const newConv: Conversation = { conversation_id: cid, sender_id: cid, sender_name: newMsg.sender_name, sender_username: newMsg.sender_username, last_message: newMsg.message_text || '', last_message_time: newMsg.created_at, unread_count: newMsg.status === 'unread' && newMsg.direction === 'inbound' ? 1 : 0, status: newMsg.assigned_to || 'agent', messages: [newMsg] };
            return [newConv, ...prev];
          }
        });
        setSelected(prev => {
          if (!prev) return prev;
          const cid = newMsg.conversation_id || newMsg.ig_sender_id;
          if (prev.conversation_id !== cid) return prev;
          const msgs = [...prev.messages, newMsg].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          return { ...prev, messages: msgs };
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ig_messages' }, () => { fetchConversations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selected?.messages]);

  async function fetchConversations() {
    setLoading(true);
    const { data, error } = await supabase.from('ig_messages').select('*').order('created_at', { ascending: false });
    if (error) { setLoading(false); return; }
    const convMap = new Map<string, Conversation>();
    for (const msg of (data || [])) {
      const cid = msg.conversation_id || msg.ig_sender_id;
      if (!convMap.has(cid)) {
        convMap.set(cid, { conversation_id: cid, sender_id: cid, sender_name: msg.sender_name, sender_username: msg.sender_username, last_message: msg.message_text || '', last_message_time: msg.created_at, unread_count: 0, status: msg.assigned_to || 'agent', messages: [] });
      }
      const conv = convMap.get(cid)!;
      conv.messages.push(msg);
      if (!conv.sender_name && msg.sender_name) conv.sender_name = msg.sender_name;
      if (!conv.sender_username && msg.sender_username) conv.sender_username = msg.sender_username;
      if (msg.status === 'unread' && msg.direction === 'inbound') conv.unread_count++;
    }
    const convList = Array.from(convMap.values()).map(c => ({ ...c, messages: c.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) }));
    let filtered = convList;
    if (filterStatus === 'unread') filtered = convList.filter(c => c.unread_count > 0);
    else if (filterStatus === 'agent') filtered = convList.filter(c => c.status === 'agent');
    else if (filterStatus === 'human') filtered = convList.filter(c => c.status === 'human');
    else if (filterStatus === 'archived') filtered = convList.filter(c => c.messages.some(m => m.status === 'archived'));
    if (search) filtered = filtered.filter(c => c.sender_name?.toLowerCase().includes(search.toLowerCase()) || c.sender_username?.toLowerCase().includes(search.toLowerCase()) || c.last_message.toLowerCase().includes(search.toLowerCase()));
    setConversations(filtered);
    if (selected) {
      const updated = convList.find(c => c.conversation_id === selected.conversation_id);
      if (updated) setSelected(updated);
    }
    setLoading(false);
  }

  async function selectConversation(conv: Conversation) {
    setSelected(conv);
    const unreadIds = conv.messages.filter(m => m.status === 'unread' && m.direction === 'inbound').map(m => m.id);
    if (unreadIds.length > 0) {
      await supabase.from('ig_messages').update({ status: 'read' }).in('id', unreadIds);
      fetchConversations();
    }
  }

  async function assignToHuman(conv: Conversation) {
    await supabase.from('ig_messages').update({ assigned_to: 'human' }).eq('conversation_id', conv.conversation_id);
    fetchConversations();
  }

  async function sendReply() {
    if (!selected || (!replyText.trim() && attachments.length === 0) || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/instagram/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientId: selected.sender_id, text: replyText, conversationId: selected.conversation_id }) });
      const data = await res.json();
      if (data.ok) { setReplyText(''); setAttachments([]); }
      else alert('Error enviando: ' + (data.error || 'desconocido'));
    } catch (e: unknown) { alert('Error: ' + (e as Error).message); }
    finally { setSending(false); }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files].slice(0, 5)); // máx 5
    e.target.value = ''; // reset input
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  function getFileIcon(file: File) {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'picture_as_pdf';
    return 'attach_file';
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000) return 'ahora';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  }

  function getInitials(name: string | null, username: string | null) {
    return (name || username || '?').slice(0, 2).toUpperCase();
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* Conversation list */}
      <div className="w-72 shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0e0e10]">

        {/* Channel tabs */}
        <div className="flex border-b border-white/[0.06]">
          {channels.map(ch => (
            <button
              key={ch.key}
              onClick={() => setActiveChannel(ch.key)}
              title={ch.label}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative ${
                activeChannel === ch.key
                  ? 'text-white/90'
                  : 'text-white/30 hover:text-white/55'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{ch.icon}</span>
              <span className="text-[9px] font-medium tracking-wide">{ch.label}</span>
              {activeChannel === ch.key && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-[#3eff8e]" />
              )}
              {/* Hardcode badge: WA and Messenger not connected yet */}
              {ch.key !== 'instagram' && (
                <span className="absolute top-2 right-3 text-[8px] text-white/20 font-medium">pronto</span>
              )}
            </button>
          ))}
        </div>

        {/* Search + status filters */}
        <div className="p-3 border-b border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
            <span className="material-symbols-outlined text-white/40 text-base">search</span>
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm text-white/70 placeholder:text-white/35 outline-none w-full" />
          </div>
          <div className="flex gap-1 flex-wrap items-center">
            {statusFilters.map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${
                  filterStatus === f.key
                    ? 'bg-white/[0.1] text-white/85'
                    : 'text-white/40 hover:text-white/60'
                }`}>
                {f.label}
              </button>
            ))}
            <button onClick={fetchConversations} className="ml-auto text-white/30 hover:text-white/55 transition-colors">
              <span className="material-symbols-outlined text-[15px]">refresh</span>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <span className="material-symbols-outlined text-white/10 text-4xl mb-2">chat_bubble</span>
              <p className="text-sm text-white/50">Sin mensajes</p>
            </div>
          )}
          {conversations.map(conv => (
            <button key={conv.conversation_id} onClick={() => selectConversation(conv)}
              className={`w-full text-left px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${selected?.conversation_id === conv.conversation_id ? 'bg-white/[0.05]' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.08] flex items-center justify-center text-[11px] font-semibold text-white/50 shrink-0">
                  {getInitials(conv.sender_name, conv.sender_username)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium text-white/75 truncate">
                      {conv.sender_name || conv.sender_username || conv.sender_id.slice(0, 12) + '…'}
                    </span>
                    <span className="text-[10px] text-white/45 shrink-0 ml-2">{formatTime(conv.last_message_time)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] text-white/55 truncate flex-1">{conv.last_message}</p>
                    {conv.unread_count > 0 && (
                      <span className="ml-2 w-4 h-4 rounded-full bg-white/20 text-white/80 text-[9px] font-bold flex items-center justify-center shrink-0">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="h-14 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#111114]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.08] flex items-center justify-center text-[11px] font-semibold text-white/50">
                {getInitials(selected.sender_name, selected.sender_username)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white/80">{selected.sender_name || selected.sender_username || 'Usuario'}</p>
                {selected.sender_username && <p className="text-[10px] text-white/55">@{selected.sender_username}</p>}
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium ${selected.status === 'agent' ? 'bg-white/[0.06] text-white/40' : 'bg-white/[0.06] text-white/40'}`}>
                {selected.status === 'agent' ? 'Agente IA' : 'Humano'}
              </span>
            </div>
            {selected.status === 'agent' && (
              <button onClick={() => assignToHuman(selected)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/60 text-xs font-medium rounded-lg transition-colors">
                <span className="material-symbols-outlined text-[14px]">person_check</span>
                Tomar conversación
              </button>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#0d0d0f]">
            {selected.messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-sm lg:max-w-md px-4 py-2.5 rounded-2xl ${
                  msg.direction === 'outbound'
                    ? 'bg-white/[0.12] text-white/80 rounded-br-sm'
                    : 'bg-white/[0.05] border border-white/[0.06] text-white/70 rounded-bl-sm'
                }`}>
                  {msg.message_type === 'image' && msg.media_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={msg.media_url} alt="imagen" className="rounded-lg max-w-full max-h-60 object-cover mb-1" />
                  )}
                  {msg.message_type === 'share' && (
                    <p className="text-[11px] text-white/55 italic">Contenido compartido</p>
                  )}
                  {!['image','video','audio','share'].includes(msg.message_type) && msg.message_text && (
                    <p className="text-sm leading-relaxed">{msg.message_text}</p>
                  )}
                  <p className="text-[10px] text-white/45 mt-1">{formatTime(msg.created_at)}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply input */}
          <div className="shrink-0 border-t border-white/[0.06] bg-[#111114]">

            {/* Attachment previews */}
            {attachments.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5 max-w-[180px]">
                    <span className={`material-symbols-outlined text-[15px] shrink-0 ${
                      file.type === 'application/pdf' ? 'text-red-400/70' : 'text-blue-400/70'
                    }`}>{getFileIcon(file)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white/70 truncate">{file.name}</p>
                      <p className="text-[9px] text-white/35">{formatFileSize(file.size)}</p>
                    </div>
                    <button onClick={() => removeAttachment(idx)} className="text-white/30 hover:text-white/60 transition-colors shrink-0">
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="p-4 flex items-end gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {/* Attach button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Adjuntar imagen o PDF"
                className="p-2.5 text-white/35 hover:text-white/65 hover:bg-white/[0.06] rounded-xl transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-[20px]">attach_file</span>
              </button>

              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Escribí una respuesta…"
                rows={2}
                className="flex-1 resize-none px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/70 placeholder:text-white/45 outline-none focus:border-white/[0.15] transition-colors"
              />
              <button onClick={sendReply} disabled={(!replyText.trim() && attachments.length === 0) || sending}
                className="p-2.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/60 rounded-xl disabled:opacity-30 transition-colors shrink-0">
                {sending
                  ? <div className="w-5 h-5 border border-white/30 border-t-white/70 rounded-full animate-spin" />
                  : <span className="material-symbols-outlined text-[20px]">send</span>
                }
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d0f]">
          <span className="material-symbols-outlined text-white/10 text-5xl mb-3">chat_bubble_outline</span>
          <p className="text-sm text-white/50">Seleccioná una conversación</p>
        </div>
      )}
    </div>
  );
}
