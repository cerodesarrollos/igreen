'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
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
  done?: boolean;
}

interface QuickReply {
  id: string;
  shortcut: string;
  title: string;
  body: string;
  sort_order: number;
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

  // Label / note
  const [convLabel, setConvLabel] = useState<string>('');
  const [convDone, setConvDone] = useState(false);
  const [labelMenuOpen, setLabelMenuOpen] = useState(false);
  const [noteText, setNoteText] = useState<string>('');
  const [noteSaved, setNoteSaved] = useState<string>('');
  const [noteVisible, setNoteVisible] = useState(false);
  const [noteEditing, setNoteEditing] = useState(false);
  const [notePos, setNotePos] = useState({ x: 24, y: 24 });
  const [noteSaving, setNoteSaving] = useState(false);

  // Quick replies
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [qrMenuOpen, setQrMenuOpen] = useState(false);
  const [qrSearch, setQrSearch] = useState('');
  const [qrEditOpen, setQrEditOpen] = useState(false);
  const [qrEditing, setQrEditing] = useState<QuickReply | null>(null);
  const [qrForm, setQrForm] = useState({ shortcut: '', title: '', body: '' });

  // Chat search
  const [chatSearch, setChatSearch] = useState('');
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchIdx, setChatSearchIdx] = useState(0);

  // Time without reply
  const [now, setNow] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const labelMenuRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLDivElement>(null);
  const qrMenuRef = useRef<HTMLDivElement>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);
  const dragState = useRef<{ dragging: boolean; startX: number; startY: number; origX: number; origY: number }>({ dragging: false, startX: 0, startY: 0, origX: 24, origY: 24 });

  const CONV_LABELS = [
    { key: 'consulta',         label: 'Consulta',         color: 'text-white/55',      bg: 'bg-white/[0.07]',      icon: 'help' },
    { key: 'turno_reservado',  label: 'Turno reservado',  color: 'text-blue-400/80',   bg: 'bg-blue-500/[0.12]',   icon: 'calendar_month' },
    { key: 'no_asistio',       label: 'No asistió',       color: 'text-amber-400/80',  bg: 'bg-amber-500/[0.12]',  icon: 'event_busy' },
    { key: 'venta_concretada', label: 'Venta concretada', color: 'text-[#3eff8e]/80',  bg: 'bg-[#3eff8e]/[0.10]', icon: 'check_circle' },
    { key: 'sin_modelo',       label: 'Sin el modelo',    color: 'text-orange-400/80', bg: 'bg-orange-500/[0.12]', icon: 'inventory_2' },
    { key: 'garantia',         label: 'Garantía',         color: 'text-purple-400/80', bg: 'bg-purple-500/[0.12]', icon: 'shield' },
    { key: 'trade_in',         label: 'Trade-in',         color: 'text-cyan-400/80',   bg: 'bg-cyan-500/[0.12]',   icon: 'swap_horiz' },
    { key: 'no_interesado',    label: 'No interesado',    color: 'text-red-400/70',    bg: 'bg-red-500/[0.10]',    icon: 'thumb_down' },
  ];

  const channels = [
    { key: 'instagram', label: 'Instagram', icon: 'photo_camera' },
    { key: 'whatsapp',  label: 'WhatsApp',  icon: 'chat' },
    { key: 'messenger', label: 'Messenger', icon: 'forum' },
  ];

  const statusFilters = [
    { key: 'todos',      label: 'Todos' },
    { key: 'unread',     label: 'Sin leer' },
    { key: 'attention',  label: 'Atención' },
    { key: 'waiting',    label: 'Esperando' },
    { key: 'done',       label: 'Finalizados' },
  ];

  const [activeChannel, setActiveChannel] = useState<string>('instagram');

  // Tick every minute for "time without reply" display
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchQuickReplies();
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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [selected?.messages]);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (labelMenuRef.current && !labelMenuRef.current.contains(e.target as Node)) setLabelMenuOpen(false);
      if (qrMenuRef.current && !qrMenuRef.current.contains(e.target as Node)) setQrMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+F → chat search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && selected) {
        e.preventDefault();
        setChatSearchOpen(v => !v);
      }
      if (e.key === 'Escape') { setChatSearchOpen(false); setChatSearch(''); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected]);

  async function fetchConversations() {
    setLoading(true);
    const { data, error } = await supabase.from('ig_messages').select('*').order('created_at', { ascending: false });
    const { data: labels } = await supabase.from('ig_conv_labels').select('conversation_id,done');
    if (error) { setLoading(false); return; }
    const doneMap = new Map((labels || []).map((l: { conversation_id: string; done: boolean }) => [l.conversation_id, l.done]));
    const convMap = new Map<string, Conversation>();
    for (const msg of (data || [])) {
      const cid = msg.conversation_id || msg.ig_sender_id;
      if (!convMap.has(cid)) convMap.set(cid, { conversation_id: cid, sender_id: cid, sender_name: msg.sender_name, sender_username: msg.sender_username, last_message: msg.message_text || '', last_message_time: msg.created_at, unread_count: 0, status: msg.assigned_to || 'agent', messages: [], done: doneMap.get(cid) || false });
      const conv = convMap.get(cid)!;
      conv.messages.push(msg);
      if (!conv.sender_name && msg.sender_name) conv.sender_name = msg.sender_name;
      if (!conv.sender_username && msg.sender_username) conv.sender_username = msg.sender_username;
      if (msg.status === 'unread' && msg.direction === 'inbound') conv.unread_count++;
    }
    const convList = Array.from(convMap.values()).map(c => ({ ...c, messages: c.messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) }));
    let filtered = convList;
    if (filterStatus === 'unread')     filtered = convList.filter(c => c.unread_count > 0);
    else if (filterStatus === 'done')  filtered = convList.filter(c => c.done);
    else if (filterStatus === 'waiting') filtered = convList.filter(c => {
      const last = c.messages[c.messages.length - 1];
      return last && last.direction === 'inbound';
    });
    else if (filterStatus === 'attention') filtered = convList.filter(c => {
      const last = c.messages[c.messages.length - 1];
      if (!last || last.direction !== 'inbound') return false;
      return (Date.now() - new Date(last.created_at).getTime()) > 2 * 3600000; // >2h
    });
    else if (filterStatus === 'todos') filtered = convList.filter(c => !c.done);
    if (search) filtered = filtered.filter(c => c.sender_name?.toLowerCase().includes(search.toLowerCase()) || c.sender_username?.toLowerCase().includes(search.toLowerCase()) || c.last_message.toLowerCase().includes(search.toLowerCase()));
    setConversations(filtered);
    if (selected) {
      const updated = convList.find(c => c.conversation_id === selected.conversation_id);
      if (updated) setSelected(updated);
    }
    setLoading(false);
  }

  async function fetchQuickReplies() {
    const { data } = await supabase.from('ig_quick_replies').select('*').order('sort_order');
    setQuickReplies(data || []);
  }

  async function selectConversation(conv: Conversation) {
    setSelected(conv);
    loadConvLabel(conv.conversation_id);
    setChatSearch(''); setChatSearchOpen(false);
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

  async function markDone(conv: Conversation) {
    const newDone = !convDone;
    setConvDone(newDone);
    await supabase.from('ig_conv_labels').upsert({ conversation_id: conv.conversation_id, label: convLabel || 'consulta', done: newDone, updated_at: new Date().toISOString() }, { onConflict: 'conversation_id' });
    fetchConversations();
  }

  // Load label + note
  async function loadConvLabel(convId: string) {
    const { data } = await supabase.from('ig_conv_labels').select('label,notes,done').eq('conversation_id', convId).single();
    setConvLabel(data?.label || 'consulta');
    setConvDone(data?.done || false);
    const n = data?.notes || '';
    setNoteSaved(n); setNoteText(n); setNoteVisible(!!n); setNoteEditing(false); setNotePos({ x: 24, y: 24 });
  }

  async function saveNote() {
    if (!selected) return;
    setNoteSaving(true);
    await supabase.from('ig_conv_labels').upsert({ conversation_id: selected.conversation_id, label: convLabel || 'consulta', notes: noteText, updated_at: new Date().toISOString() }, { onConflict: 'conversation_id' });
    setNoteSaved(noteText); setNoteSaving(false); setNoteEditing(false);
    if (!noteText.trim()) setNoteVisible(false);
  }

  function startDrag(e: React.MouseEvent) {
    e.preventDefault();
    dragState.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: notePos.x, origY: notePos.y };
    const onMove = (ev: MouseEvent) => {
      if (!dragState.current.dragging) return;
      setNotePos({ x: Math.max(0, dragState.current.origX + ev.clientX - dragState.current.startX), y: Math.max(0, dragState.current.origY + ev.clientY - dragState.current.startY) });
    };
    const onUp = () => { dragState.current.dragging = false; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  async function saveConvLabel(key: string) {
    if (!selected) return;
    setConvLabel(key); setLabelMenuOpen(false);
    await supabase.from('ig_conv_labels').upsert({ conversation_id: selected.conversation_id, label: key, updated_at: new Date().toISOString() }, { onConflict: 'conversation_id' });
  }

  // Quick replies
  function applyQuickReply(qr: QuickReply) {
    setReplyText(qr.body);
    setQrMenuOpen(false);
    setQrSearch('');
    setTimeout(() => replyRef.current?.focus(), 50);
  }

  async function saveQuickReply() {
    if (!qrForm.shortcut || !qrForm.body) return;
    const shortcut = qrForm.shortcut.startsWith('/') ? qrForm.shortcut : '/' + qrForm.shortcut;
    if (qrEditing) {
      await supabase.from('ig_quick_replies').update({ shortcut, title: qrForm.title || shortcut, body: qrForm.body }).eq('id', qrEditing.id);
    } else {
      await supabase.from('ig_quick_replies').insert({ shortcut, title: qrForm.title || shortcut, body: qrForm.body, sort_order: quickReplies.length });
    }
    await fetchQuickReplies();
    setQrForm({ shortcut: '', title: '', body: '' }); setQrEditing(null); setQrEditOpen(false);
  }

  async function deleteQuickReply(id: string) {
    await supabase.from('ig_quick_replies').delete().eq('id', id);
    fetchQuickReplies();
  }

  // Detect "/" in reply box → open quick replies
  function handleReplyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setReplyText(val);
    if (val === '/') { setQrMenuOpen(true); setQrSearch(''); }
    else if (val.startsWith('/') && !val.includes(' ')) { setQrMenuOpen(true); setQrSearch(val.slice(1)); }
    else setQrMenuOpen(false);
  }

  // Chat search matched messages
  const chatMatches = useCallback(() => {
    if (!selected || !chatSearch.trim()) return [];
    const q = chatSearch.toLowerCase();
    return selected.messages.map((m, i) => ({ ...m, idx: i })).filter(m => m.message_text?.toLowerCase().includes(q));
  }, [selected, chatSearch]);

  // Time without reply indicator
  function timeSinceLastInbound(conv: Conversation): { label: string; urgent: boolean } | null {
    const inbounds = conv.messages.filter(m => m.direction === 'inbound');
    if (!inbounds.length) return null;
    const last = inbounds[inbounds.length - 1];
    const afterLast = conv.messages.filter(m => m.direction === 'outbound' && new Date(m.created_at) > new Date(last.created_at));
    if (afterLast.length > 0) return null; // already replied
    const diff = now - new Date(last.created_at).getTime();
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    if (mins < 5) return null;
    if (hrs >= 1) return { label: `${hrs}h sin responder`, urgent: hrs >= 2 };
    return { label: `${mins}m sin responder`, urgent: false };
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
    setAttachments(prev => [...prev, ...files].slice(0, 5));
    e.target.value = '';
  }

  function removeAttachment(idx: number) { setAttachments(prev => prev.filter((_, i) => i !== idx)); }

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

  const filteredQR = quickReplies.filter(qr =>
    !qrSearch || qr.shortcut.includes(qrSearch) || qr.title.toLowerCase().includes(qrSearch.toLowerCase()) || qr.body.toLowerCase().includes(qrSearch.toLowerCase())
  );

  return (
    <div className="flex flex-1 overflow-hidden">

      {/* ── Conversation list ── */}
      <div className="w-72 shrink-0 flex flex-col border-r border-white/[0.06] bg-[#0e0e10]">

        {/* Channel tabs */}
        <div className="flex border-b border-white/[0.06]">
          {channels.map(ch => (
            <button key={ch.key} onClick={() => setActiveChannel(ch.key)} title={ch.label}
              className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative ${activeChannel === ch.key ? 'text-white/90' : 'text-white/30 hover:text-white/55'}`}>
              <span className="material-symbols-outlined text-[18px]">{ch.icon}</span>
              <span className="text-[9px] font-medium tracking-wide">{ch.label}</span>
              {activeChannel === ch.key && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] rounded-full bg-[#3eff8e]" />}
              {ch.key !== 'instagram' && <span className="absolute top-2 right-3 text-[8px] text-white/20 font-medium">pronto</span>}
            </button>
          ))}
        </div>

        {/* Search + filters */}
        <div className="p-3 border-b border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
            <span className="material-symbols-outlined text-white/40 text-base">search</span>
            <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="bg-transparent text-sm text-white/70 placeholder:text-white/35 outline-none w-full" />
          </div>
          <div className="flex gap-1 flex-wrap items-center">
            {statusFilters.map(f => (
              <button key={f.key} onClick={() => setFilterStatus(f.key)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-colors ${filterStatus === f.key ? 'bg-white/[0.1] text-white/85' : 'text-white/40 hover:text-white/60'}`}>
                {f.label}
              </button>
            ))}
            <button onClick={fetchConversations} className="ml-auto text-white/30 hover:text-white/55 transition-colors">
              <span className="material-symbols-outlined text-[15px]">refresh</span>
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {loading && <div className="flex items-center justify-center py-12"><div className="w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" /></div>}
          {!loading && conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <span className="material-symbols-outlined text-white/10 text-4xl mb-2">chat_bubble</span>
              <p className="text-sm text-white/50">Sin mensajes</p>
            </div>
          )}
          {conversations.map(conv => {
            const waitInfo = timeSinceLastInbound(conv);
            return (
              <button key={conv.conversation_id} onClick={() => selectConversation(conv)}
                className={`w-full text-left px-4 py-3.5 border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors ${selected?.conversation_id === conv.conversation_id ? 'bg-white/[0.05]' : ''} ${conv.done ? 'opacity-40' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.08] flex items-center justify-center text-[11px] font-semibold text-white/50 shrink-0">
                    {getInitials(conv.sender_name, conv.sender_username)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-white/75 truncate">{conv.sender_name || conv.sender_username || conv.sender_id.slice(0, 12) + '…'}</span>
                      <span className="text-[10px] text-white/45 shrink-0 ml-2">{formatTime(conv.last_message_time)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] text-white/55 truncate flex-1">{conv.last_message}</p>
                      {conv.unread_count > 0 && <span className="ml-2 w-4 h-4 rounded-full bg-white/20 text-white/80 text-[9px] font-bold flex items-center justify-center shrink-0">{conv.unread_count}</span>}
                    </div>
                    {/* Time without reply badge */}
                    {waitInfo && (
                      <span className={`mt-1 inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded-md ${waitInfo.urgent ? 'bg-red-500/15 text-red-400/80' : 'bg-amber-500/10 text-amber-400/70'}`}>
                        <span className="material-symbols-outlined text-[10px]">schedule</span>
                        {waitInfo.label}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Chat panel ── */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">

          {/* Chat header */}
          <div className="h-14 shrink-0 border-b border-white/[0.06] flex items-center justify-between px-6 bg-[#111114]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/[0.07] border border-white/[0.08] flex items-center justify-center text-[11px] font-semibold text-white/50 shrink-0">
                {getInitials(selected.sender_name, selected.sender_username)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/80 truncate">{selected.sender_name || selected.sender_username || 'Usuario'}</p>
                {selected.sender_username && <p className="text-[10px] text-white/55">@{selected.sender_username}</p>}
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-white/[0.06] text-white/40 shrink-0">
                {selected.status === 'agent' ? 'Agente IA' : 'Humano'}
              </span>

              {/* Label dropdown */}
              {(() => {
                const lbl = CONV_LABELS.find(l => l.key === convLabel) || CONV_LABELS[0];
                return (
                  <div className="relative shrink-0" ref={labelMenuRef}>
                    <button onClick={() => setLabelMenuOpen(v => !v)}
                      className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-md font-medium border border-white/[0.08] transition-colors hover:border-white/[0.14] ${lbl.color} ${lbl.bg}`}>
                      <span className="material-symbols-outlined text-[12px]">{lbl.icon}</span>
                      {lbl.label}
                      <span className="material-symbols-outlined text-[11px] text-white/30">expand_more</span>
                    </button>
                    {labelMenuOpen && (
                      <div className="absolute top-full left-0 mt-1.5 z-50 bg-[#1a1a22] border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden w-52">
                        <p className="px-3 pt-2.5 pb-1.5 text-[9px] uppercase tracking-[0.12em] text-white/30 font-semibold">Estado de conversación</p>
                        {CONV_LABELS.map(l => (
                          <button key={l.key} onClick={() => saveConvLabel(l.key)}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-colors hover:bg-white/[0.05] ${convLabel === l.key ? 'bg-white/[0.06]' : ''}`}>
                            <span className={`material-symbols-outlined text-[15px] ${l.color}`}>{l.icon}</span>
                            <span className={convLabel === l.key ? 'text-white/80 font-medium' : 'text-white/55'}>{l.label}</span>
                            {convLabel === l.key && <span className="material-symbols-outlined text-[13px] text-[#3eff8e]/70 ml-auto">check</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Chat search toggle */}
              <button onClick={() => setChatSearchOpen(v => !v)} title="Buscar en chat (Ctrl+F)"
                className={`p-1.5 rounded-lg transition-colors ${chatSearchOpen ? 'bg-white/[0.1] text-white/70' : 'text-white/35 hover:text-white/60 hover:bg-white/[0.06]'}`}>
                <span className="material-symbols-outlined text-[16px]">search</span>
              </button>

              {/* Note button */}
              <button onClick={() => { setNoteVisible(true); setNoteEditing(true); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-lg transition-colors ${noteVisible ? 'bg-[#3eff8e]/10 border-[#3eff8e]/20 text-[#3eff8e]/70' : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.08] text-white/55'}`}>
                <span className="material-symbols-outlined text-[14px]">sticky_note_2</span>
                {noteSaved ? 'Ver nota' : 'Nota'}
              </button>

              {/* Finalizar button */}
              <button onClick={() => markDone(selected)}
                className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-medium rounded-lg transition-colors ${convDone ? 'bg-[#3eff8e]/10 border-[#3eff8e]/20 text-[#3eff8e]/70' : 'bg-white/[0.06] hover:bg-white/[0.1] border-white/[0.08] text-white/55'}`}>
                <span className="material-symbols-outlined text-[14px]">{convDone ? 'undo' : 'check_circle'}</span>
                {convDone ? 'Reabrir' : 'Finalizar'}
              </button>

              {selected.status === 'agent' && (
                <button onClick={() => assignToHuman(selected)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white/60 text-xs font-medium rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[14px]">person_check</span>
                  Tomar
                </button>
              )}
            </div>
          </div>

          {/* Chat search bar */}
          {chatSearchOpen && (
            <div className="shrink-0 border-b border-white/[0.06] bg-[#111114] px-4 py-2 flex items-center gap-3">
              <span className="material-symbols-outlined text-[15px] text-white/40">search</span>
              <input autoFocus type="text" placeholder="Buscar en la conversación…" value={chatSearch} onChange={e => { setChatSearch(e.target.value); setChatSearchIdx(0); }}
                className="flex-1 bg-transparent text-sm text-white/70 placeholder:text-white/35 outline-none" />
              {chatSearch && (
                <>
                  <span className="text-[11px] text-white/40">{chatMatches().length > 0 ? `${chatSearchIdx + 1}/${chatMatches().length}` : 'Sin resultados'}</span>
                  <button onClick={() => setChatSearchIdx(i => Math.max(0, i - 1))} className="text-white/35 hover:text-white/60">
                    <span className="material-symbols-outlined text-[15px]">keyboard_arrow_up</span>
                  </button>
                  <button onClick={() => setChatSearchIdx(i => Math.min(chatMatches().length - 1, i + 1))} className="text-white/35 hover:text-white/60">
                    <span className="material-symbols-outlined text-[15px]">keyboard_arrow_down</span>
                  </button>
                </>
              )}
              <button onClick={() => { setChatSearchOpen(false); setChatSearch(''); }} className="text-white/30 hover:text-white/60">
                <span className="material-symbols-outlined text-[15px]">close</span>
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 relative overflow-y-auto p-6 space-y-3 bg-[#0d0d0f]">

            {/* Floating note */}
            {noteVisible && (
              <div ref={noteRef} style={{ left: notePos.x, top: notePos.y }}
                className="absolute z-20 w-56 rounded-xl border border-[#3eff8e]/20 bg-[#111c14]/80 backdrop-blur-md shadow-2xl">
                <div onMouseDown={startDrag} className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing border-b border-white/[0.07] select-none">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[13px] text-[#3eff8e]/60">sticky_note_2</span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#3eff8e]/50">Nota</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setNoteEditing(v => !v)} className="text-white/30 hover:text-white/60 transition-colors">
                      <span className="material-symbols-outlined text-[13px]">{noteEditing ? 'check' : 'edit'}</span>
                    </button>
                    <button onClick={() => { setNoteText(''); setNoteVisible(false); saveNote(); }} className="text-white/20 hover:text-red-400/60 transition-colors">
                      <span className="material-symbols-outlined text-[13px]">close</span>
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  {noteEditing
                    ? <textarea autoFocus value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} className="w-full bg-transparent text-xs text-white/70 placeholder:text-white/25 outline-none resize-none leading-relaxed" placeholder="Escribí una nota…" />
                    : <p className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{noteSaved || '(vacía)'}</p>
                  }
                </div>
                {noteEditing && (
                  <div className="px-3 pb-2.5 flex justify-end">
                    <button onClick={saveNote} disabled={noteSaving}
                      className="text-[10px] px-2.5 py-1 rounded-md bg-[#3eff8e]/15 text-[#3eff8e]/70 hover:bg-[#3eff8e]/25 transition-colors font-medium disabled:opacity-40">
                      {noteSaving ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {selected.messages.map((msg, idx) => {
              const matchIdx = chatMatches().findIndex(m => m.id === msg.id);
              const isHighlighted = chatSearch.trim() && msg.message_text?.toLowerCase().includes(chatSearch.toLowerCase());
              const isCurrentMatch = matchIdx !== -1 && matchIdx === chatSearchIdx;
              return (
                <div key={msg.id} id={`msg-${msg.id}`} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                  ref={isCurrentMatch ? (el) => { if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } : undefined}>
                  <div className={`max-w-sm lg:max-w-md px-4 py-2.5 rounded-2xl transition-colors ${
                    isCurrentMatch ? 'ring-1 ring-[#3eff8e]/40' : isHighlighted ? 'ring-1 ring-white/20' : ''
                  } ${msg.direction === 'outbound' ? 'bg-white/[0.12] text-white/80 rounded-br-sm' : 'bg-white/[0.05] border border-white/[0.06] text-white/70 rounded-bl-sm'}`}>
                    {msg.message_type === 'image' && msg.media_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={msg.media_url} alt="imagen" className="rounded-lg max-w-full max-h-60 object-cover mb-1" />
                    )}
                    {msg.message_type === 'share' && <p className="text-[11px] text-white/55 italic">Contenido compartido</p>}
                    {!['image','video','audio','share'].includes(msg.message_type) && msg.message_text && (
                      <p className="text-sm leading-relaxed">{msg.message_text}</p>
                    )}
                    <p className="text-[10px] text-white/45 mt-1">{formatTime(msg.created_at)}</p>
                  </div>
                </div>
              );
              void idx;
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick replies dropdown (above input) */}
          {qrMenuOpen && (
            <div ref={qrMenuRef} className="shrink-0 border-t border-white/[0.06] bg-[#111114]">
              <div className="px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[14px] text-[#3eff8e]/60">flash_on</span>
                  <span className="text-[10px] uppercase tracking-[0.1em] text-white/40 font-semibold">Respuestas rápidas</span>
                  {qrSearch && <span className="text-[10px] text-white/30">— &ldquo;{qrSearch}&rdquo;</span>}
                </div>
                <button onClick={() => { setQrEditOpen(true); setQrEditing(null); setQrForm({ shortcut: '', title: '', body: '' }); }}
                  className="text-[10px] text-white/30 hover:text-white/55 flex items-center gap-1 transition-colors">
                  <span className="material-symbols-outlined text-[13px]">add</span>
                  Nueva
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {filteredQR.length === 0 && <p className="px-4 pb-3 text-xs text-white/35">Sin resultados</p>}
                {filteredQR.map(qr => (
                  <div key={qr.id} className="group flex items-start gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => applyQuickReply(qr)}>
                    <span className="text-[10px] font-mono text-[#3eff8e]/60 mt-0.5 w-16 shrink-0">{qr.shortcut}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white/70">{qr.title}</p>
                      <p className="text-[11px] text-white/40 truncate">{qr.body}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setQrEditing(qr); setQrForm({ shortcut: qr.shortcut, title: qr.title, body: qr.body }); setQrEditOpen(true); setQrMenuOpen(false); }}
                        className="p-1 text-white/30 hover:text-white/60 transition-colors">
                        <span className="material-symbols-outlined text-[13px]">edit</span>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteQuickReply(qr.id); }}
                        className="p-1 text-white/30 hover:text-red-400/60 transition-colors">
                        <span className="material-symbols-outlined text-[13px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reply input */}
          <div className="shrink-0 border-t border-white/[0.06] bg-[#111114]">
            {attachments.length > 0 && (
              <div className="px-4 pt-3 flex flex-wrap gap-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1.5 max-w-[180px]">
                    <span className={`material-symbols-outlined text-[15px] shrink-0 ${file.type === 'application/pdf' ? 'text-red-400/70' : 'text-blue-400/70'}`}>{getFileIcon(file)}</span>
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
              <input ref={fileInputRef} type="file" multiple accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" />
              {/* Quick replies trigger */}
              <button onClick={() => { setQrMenuOpen(v => !v); setQrSearch(''); }}
                title="Respuestas rápidas (/)"
                className={`p-2.5 rounded-xl transition-colors shrink-0 ${qrMenuOpen ? 'bg-[#3eff8e]/10 text-[#3eff8e]/60' : 'text-white/35 hover:text-white/65 hover:bg-white/[0.06]'}`}>
                <span className="material-symbols-outlined text-[20px]">flash_on</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} title="Adjuntar"
                className="p-2.5 text-white/35 hover:text-white/65 hover:bg-white/[0.06] rounded-xl transition-colors shrink-0">
                <span className="material-symbols-outlined text-[20px]">attach_file</span>
              </button>
              <textarea ref={replyRef} value={replyText} onChange={handleReplyChange}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } if (e.key === 'Escape') { setQrMenuOpen(false); } }}
                placeholder="Escribí una respuesta… (/ para respuestas rápidas)"
                rows={2}
                className="flex-1 resize-none px-4 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white/70 placeholder:text-white/45 outline-none focus:border-white/[0.15] transition-colors"
              />
              <button onClick={sendReply} disabled={(!replyText.trim() && attachments.length === 0) || sending}
                className="p-2.5 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-white/60 rounded-xl disabled:opacity-30 transition-colors shrink-0">
                {sending ? <div className="w-5 h-5 border border-white/30 border-t-white/70 rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[20px]">send</span>}
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

      {/* Quick reply editor modal */}
      {qrEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
          <div className="bg-[#1a1a24] border border-white/[0.1] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-sm font-semibold text-white/80 mb-4">{qrEditing ? 'Editar respuesta rápida' : 'Nueva respuesta rápida'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/35 font-semibold block mb-1">Atajo</label>
                <input type="text" placeholder="/precio" value={qrForm.shortcut} onChange={e => setQrForm(f => ({ ...f, shortcut: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-white/[0.18] font-mono" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/35 font-semibold block mb-1">Nombre</label>
                <input type="text" placeholder="Precio iPhone" value={qrForm.title} onChange={e => setQrForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-white/[0.18]" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-white/35 font-semibold block mb-1">Mensaje</label>
                <textarea placeholder="Hola! El precio del…" value={qrForm.body} onChange={e => setQrForm(f => ({ ...f, body: e.target.value }))} rows={4}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/70 placeholder:text-white/30 outline-none focus:border-white/[0.18] resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => { setQrEditOpen(false); setQrEditing(null); setQrForm({ shortcut: '', title: '', body: '' }); }}
                className="px-4 py-2 text-xs text-white/50 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] rounded-xl transition-colors">Cancelar</button>
              <button onClick={saveQuickReply}
                className="px-4 py-2 text-xs text-black font-semibold bg-[#3eff8e] hover:bg-[#5affa0] rounded-xl transition-colors disabled:opacity-40" disabled={!qrForm.shortcut || !qrForm.body}>
                {qrEditing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
