import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

const CHAT_EMOJIS = [
    '\u{1F60A}',
    '\u{1F602}',
    '\u{1F44D}',
    '\u{1F64F}',
    '\u{2764}\u{FE0F}',
    '\u{1F44B}',
    '\u{1F525}',
    '\u{2705}',
    '\u{1F4A1}',
    '\u{1F6E0}\u{FE0F}',
    '\u{1F4CD}',
    '\u{1F4F7}',
];

function initialsFor(name) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

function formatTime(value) {
    if (!value) return '';

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? value
        : new Intl.DateTimeFormat(undefined, {
              hour: '2-digit',
              minute: '2-digit',
          }).format(date);
}

function formatThreadTime(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    return new Intl.DateTimeFormat(undefined, isToday
        ? { hour: '2-digit', minute: '2-digit' }
        : { month: 'short', day: 'numeric' }).format(date);
}

function DeliveryMark({ message, otherReadAt }) {
    if (!message.isOwn) return null;

    const isRead = otherReadAt
        && new Date(message.createdAt).getTime() <= new Date(otherReadAt).getTime();

    return (
        <span
            className="ml-1 text-[10px] font-semibold"
            aria-label={isRead ? 'Read' : 'Delivered'}
            title={isRead ? 'Read' : 'Delivered'}
        >
            {isRead ? '\u2713\u2713' : '\u2713'}
        </span>
    );
}

function Attachment({ attachment }) {
    if (!attachment) return null;

    return (
        <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="mb-2 block overflow-hidden rounded-xl border border-current/15"
        >
            {attachment.isImage ? (
                <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="max-h-72 w-full object-cover"
                />
            ) : (
                <span className="flex items-center gap-2 px-3 py-3 text-xs font-semibold">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 shrink-0" aria-hidden="true">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                        <path d="M14 2v6h6" />
                    </svg>
                    <span className="truncate">{attachment.name}</span>
                </span>
            )}
        </a>
    );
}

export default function Index({ filters, threads, selectedThread, reportReasons }) {
    const { auth } = usePage().props;
    const [search, setSearch] = useState(filters.q ?? '');
    const [messages, setMessages] = useState(selectedThread?.messages ?? []);
    const [hasOlderMessages, setHasOlderMessages] = useState(
        selectedThread?.hasOlderMessages ?? false,
    );
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [otherReadAt, setOtherReadAt] = useState(selectedThread?.otherReadAt);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const channelRef = useRef(null);
    const typingTimerRef = useRef(null);
    const remoteTypingTimerRef = useRef(null);
    const messageListRef = useRef(null);
    const messageEndRef = useRef(null);
    const messageInputRef = useRef(null);
    const mediaInputRef = useRef(null);

    const messageForm = useForm({ body: '', media: null });
    const reportForm = useForm({ reason: '', details: '' });

    useEffect(() => {
        setMessages(selectedThread?.messages ?? []);
        setHasOlderMessages(selectedThread?.hasOlderMessages ?? false);
        setOtherReadAt(selectedThread?.otherReadAt);
        setIsOtherTyping(false);
        setIsReportOpen(false);
    }, [selectedThread?.id]);

    useEffect(() => {
        if (!selectedThread || !messageListRef.current) return;

        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }, [selectedThread?.id]);

    useEffect(() => {
        const input = messageInputRef.current;
        if (!input) return;

        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    }, [messageForm.data.body]);

    useEffect(() => {
        if (!selectedThread || !window.Echo) return undefined;

        const channelName = `job-request.${selectedThread.id}`;
        const channel = window.Echo.private(channelName);
        channelRef.current = channel;

        channel
            .listen('.conversation.read', (event) => {
                if (event.readerId === selectedThread.otherParticipant.id) {
                    setOtherReadAt(event.readAt);
                }
            })
            .listenForWhisper('typing', (event) => {
                if (event.userId !== selectedThread.otherParticipant.id) return;

                window.clearTimeout(remoteTypingTimerRef.current);
                setIsOtherTyping(Boolean(event.isTyping));

                if (event.isTyping) {
                    remoteTypingTimerRef.current = window.setTimeout(
                        () => setIsOtherTyping(false),
                        2200,
                    );
                }
            });

        return () => {
            window.clearTimeout(remoteTypingTimerRef.current);
            channelRef.current = null;
            window.Echo.leave(channelName);
        };
    }, [selectedThread?.id, selectedThread?.otherParticipant.id]);

    useEffect(() => {
        if (!window.Echo) return undefined;

        const channelName = `user.${auth.user.id}`;
        const channel = window.Echo.private(channelName);
        const handleMessage = (event) => {
            if (event.jobRequestId === selectedThread?.id) {
                setMessages((current) => current.some((item) => item.id === event.message.id)
                    ? current
                    : [...current, {
                        ...event.message,
                        isOwn: event.message.sender.id === auth.user.id,
                    }]);
                setIsOtherTyping(false);
                axios.post(route('inbox.read', event.jobRequestId));
                window.setTimeout(() => messageEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 40);
            }

            router.reload({
                only: ['threads', 'auth'],
                preserveState: true,
                preserveScroll: true,
            });
        };

        channel.listen('.message.sent', handleMessage);

        return () => channel.stopListening('.message.sent', handleMessage);
    }, [auth.user.id, selectedThread?.id]);

    useEffect(() => () => {
        window.clearTimeout(typingTimerRef.current);
        channelRef.current?.whisper('typing', {
            userId: auth.user.id,
            isTyping: false,
        });
    }, [auth.user.id]);

    const submitSearch = (event) => {
        event.preventDefault();
        router.get(route('inbox.index'), { q: search }, { preserveState: true, replace: true });
    };

    const handleBodyChange = (value) => {
        messageForm.setData('body', value);

        if (!channelRef.current) return;

        channelRef.current.whisper('typing', {
            userId: auth.user.id,
            isTyping: value.trim().length > 0,
        });
        window.clearTimeout(typingTimerRef.current);
        typingTimerRef.current = window.setTimeout(() => {
            channelRef.current?.whisper('typing', {
                userId: auth.user.id,
                isTyping: false,
            });
        }, 1600);
    };

    const submitMessage = (event) => {
        event.preventDefault();
        if (!selectedThread) return;

        messageForm.post(route('inbox.messages.store', selectedThread.id), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                messageForm.reset();
                setIsEmojiOpen(false);
                channelRef.current?.whisper('typing', {
                    userId: auth.user.id,
                    isTyping: false,
                });
                if (mediaInputRef.current) mediaInputRef.current.value = '';
            },
        });
    };

    const loadOlderMessages = async () => {
        if (!selectedThread || !messages.length || loadingOlder) return;

        const list = messageListRef.current;
        const previousHeight = list?.scrollHeight ?? 0;
        setLoadingOlder(true);

        try {
            const response = await axios.get(
                route('inbox.messages.index', selectedThread.id),
                { params: { before: messages[0].id } },
            );
            setMessages((current) => [...response.data.messages, ...current]);
            setHasOlderMessages(response.data.hasOlderMessages);
            window.requestAnimationFrame(() => {
                if (list) list.scrollTop = list.scrollHeight - previousHeight;
            });
        } finally {
            setLoadingOlder(false);
        }
    };

    const submitReport = (event) => {
        event.preventDefault();
        reportForm.post(route('inbox.reports.store', selectedThread.id), {
            preserveScroll: true,
            onSuccess: () => {
                reportForm.reset();
                setIsReportOpen(false);
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Inbox" />

            <div className="px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
                <section className="mx-auto grid min-h-[calc(100dvh-7rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/90 shadow-[0_24px_80px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-zinc-950/90 dark:shadow-[0_24px_80px_rgba(0,0,0,0.38)] lg:grid-cols-[340px_minmax(0,1fr)]">
                    <aside className={`${selectedThread ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-r border-zinc-200 dark:border-white/10`}>
                        <div className="border-b border-zinc-200 p-5 dark:border-white/10">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">Messages</p>
                                    <h1 className="mt-1 font-display text-3xl font-semibold text-zinc-950 dark:text-white">Inbox</h1>
                                </div>
                                {auth.messages?.unreadCount ? (
                                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">
                                        {auth.messages.unreadCount} unread
                                    </span>
                                ) : null}
                            </div>
                            <form onSubmit={submitSearch} className="relative mt-4">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" aria-hidden="true">
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m20 20-3.5-3.5" />
                                </svg>
                                <input
                                    type="search"
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search conversations"
                                    className="w-full rounded-full border border-zinc-300 bg-zinc-50 py-2.5 pl-10 pr-4 text-sm text-zinc-950 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-500/20 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                                />
                            </form>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto p-2">
                            {threads.data.length ? threads.data.map((thread) => (
                                <Link
                                    key={thread.id}
                                    href={route('inbox.show', thread.id)}
                                    className={`mb-1 flex gap-3 rounded-[1.35rem] p-3 transition ${selectedThread?.id === thread.id
                                        ? 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                                        : thread.unreadCount
                                          ? 'bg-zinc-100 text-zinc-950 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800'
                                          : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.06]'}`}
                                >
                                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${selectedThread?.id === thread.id ? 'bg-white/15 dark:bg-zinc-950/10' : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'}`}>
                                        {initialsFor(thread.otherName)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="flex items-start justify-between gap-2">
                                            <span className="truncate text-sm font-semibold">{thread.otherName}</span>
                                            <span className={`shrink-0 text-[10px] ${selectedThread?.id === thread.id ? 'opacity-70' : 'text-zinc-500 dark:text-zinc-400'}`}>{formatThreadTime(thread.lastMessageAt)}</span>
                                        </span>
                                        <span className={`mt-1 flex items-center gap-2 text-xs ${selectedThread?.id === thread.id ? 'opacity-75' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                            <span className="truncate">{thread.lastMessage}</span>
                                            {thread.unreadCount ? (
                                                <span className={`ml-auto inline-flex min-h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 ${selectedThread?.id === thread.id ? 'bg-white text-zinc-950 dark:bg-zinc-950 dark:text-white' : 'bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'}`}>{thread.unreadCount}</span>
                                            ) : null}
                                        </span>
                                    </span>
                                </Link>
                            )) : (
                                <div className="px-5 py-14 text-center">
                                    <p className="font-display text-xl font-semibold text-zinc-950 dark:text-white">No conversations</p>
                                    <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Start a chat from a provider profile and it will appear here.</p>
                                </div>
                            )}
                        </div>
                    </aside>

                    {selectedThread ? (
                        <div className="flex min-h-[calc(100dvh-7rem)] min-w-0 flex-col lg:min-h-0">
                            <header className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3.5 dark:border-white/10 sm:px-6">
                                <div className="flex min-w-0 items-center gap-3">
                                    <Link href={route('inbox.index')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 lg:hidden dark:border-white/10 dark:text-zinc-300" aria-label="Back to conversations">
                                        <span aria-hidden="true">&larr;</span>
                                    </Link>
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">
                                        {initialsFor(selectedThread.otherParticipant.name)}
                                    </span>
                                    <div className="min-w-0">
                                        <h2 className="truncate font-display text-lg font-semibold text-zinc-950 dark:text-white">{selectedThread.otherParticipant.name}</h2>
                                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{isOtherTyping ? 'Typing...' : selectedThread.category}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Link href={selectedThread.requestUrl} className="hidden rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 hover:border-zinc-500 dark:border-white/10 dark:text-zinc-300 sm:inline-flex">View request</Link>
                                    <button type="button" onClick={() => setIsReportOpen((open) => !open)} className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-300 text-zinc-600 hover:border-zinc-500 dark:border-white/10 dark:text-zinc-300" aria-label="Conversation safety options" title="Safety options">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M12 8v4M12 16h.01" /></svg>
                                    </button>
                                </div>
                            </header>

                            {isReportOpen ? (
                                <form onSubmit={submitReport} className="border-b border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-zinc-900 sm:p-5">
                                    <div className="grid gap-3 sm:grid-cols-[220px_minmax(0,1fr)_auto]">
                                        <select value={reportForm.data.reason} onChange={(event) => reportForm.setData('reason', event.target.value)} className="rounded-xl border-zinc-300 bg-white text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white" required>
                                            <option value="">Select a concern</option>
                                            {Object.entries(reportReasons).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                                        </select>
                                        <input value={reportForm.data.details} onChange={(event) => reportForm.setData('details', event.target.value)} className="rounded-xl border-zinc-300 bg-white text-sm text-zinc-950 dark:border-white/10 dark:bg-zinc-950 dark:text-white" placeholder="Optional details for the safety team" maxLength={1000} />
                                        <button type="submit" disabled={reportForm.processing || selectedThread.hasReported} className="rounded-xl bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-zinc-950">{selectedThread.hasReported ? 'Reported' : 'Submit report'}</button>
                                    </div>
                                    {reportForm.errors.reason || reportForm.errors.details ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{reportForm.errors.reason || reportForm.errors.details}</p> : null}
                                </form>
                            ) : null}

                            <div ref={messageListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-zinc-50/70 px-4 py-5 dark:bg-black/20 sm:px-6" aria-live="polite">
                                {hasOlderMessages ? (
                                    <div className="text-center"><button type="button" onClick={loadOlderMessages} disabled={loadingOlder} className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-700 disabled:opacity-50 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">{loadingOlder ? 'Loading...' : 'Load older messages'}</button></div>
                                ) : null}
                                {messages.map((message) => (
                                    <div key={message.id} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[84%] rounded-[1.3rem] px-4 py-2.5 text-sm leading-6 sm:max-w-[68%] ${message.isOwn ? 'rounded-br-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950' : 'rounded-bl-md border border-zinc-200 bg-zinc-200 text-zinc-950 dark:border-white/10 dark:bg-zinc-800 dark:text-white'}`}>
                                            <Attachment attachment={message.attachment} />
                                            {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                                            <p className={`mt-1 text-right text-[10px] ${message.isOwn ? 'opacity-65' : 'text-zinc-500 dark:text-zinc-400'}`}>
                                                {formatTime(message.createdAt)}
                                                <DeliveryMark message={message} otherReadAt={otherReadAt} />
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {isOtherTyping ? (
                                    <div className="flex justify-start"><div className="flex gap-1 rounded-full bg-zinc-200 px-4 py-3 dark:bg-zinc-800"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:120ms]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500 [animation-delay:240ms]" /></div></div>
                                ) : null}
                                <div ref={messageEndRef} />
                            </div>

                            {selectedThread.canMessage ? (
                                <form onSubmit={submitMessage} className="border-t border-zinc-200 bg-white p-3 dark:border-white/10 dark:bg-zinc-950 sm:p-4">
                                    {messageForm.data.media ? <div className="mb-2 flex items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"><span className="truncate">{messageForm.data.media.name}</span><button type="button" onClick={() => { messageForm.setData('media', null); if (mediaInputRef.current) mediaInputRef.current.value = ''; }} className="font-semibold">Remove</button></div> : null}
                                    <div className="flex items-end gap-2">
                                        <label className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10" title="Attach image or PDF">
                                            <input ref={mediaInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,application/pdf" className="sr-only" onChange={(event) => messageForm.setData('media', event.target.files?.[0] ?? null)} />
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m21.4 11.6-8.9 8.9a6 6 0 0 1-8.5-8.5l9.6-9.6a4 4 0 0 1 5.7 5.7l-9.6 9.6a2 2 0 0 1-2.8-2.8l8.9-8.9" /></svg>
                                        </label>
                                        <div className="relative flex min-w-0 flex-1 items-end rounded-[1.35rem] border border-zinc-300 bg-zinc-100 px-1 dark:border-white/10 dark:bg-zinc-900">
                                            <textarea ref={messageInputRef} rows={1} maxLength={2000} value={messageForm.data.body} onChange={(event) => handleBodyChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (messageForm.data.body.trim() || messageForm.data.media) event.currentTarget.form?.requestSubmit(); } }} placeholder="Write a message..." className="min-h-10 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-sm leading-5 text-zinc-950 placeholder:text-zinc-500 focus:ring-0 dark:text-white" />
                                            <button type="button" onClick={() => setIsEmojiOpen((open) => !open)} className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 hover:bg-white dark:hover:bg-white/10" aria-label="Choose emoji">{CHAT_EMOJIS[0]}</button>
                                            {isEmojiOpen ? <div className="absolute bottom-12 right-0 z-10 grid w-52 grid-cols-6 gap-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-950">{CHAT_EMOJIS.map((emoji) => <button key={emoji} type="button" onClick={() => { handleBodyChange(`${messageForm.data.body}${emoji}`); setIsEmojiOpen(false); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-zinc-100 dark:hover:bg-white/10">{emoji}</button>)}</div> : null}
                                        </div>
                                        <button type="submit" disabled={messageForm.processing || (!messageForm.data.body.trim() && !messageForm.data.media)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white disabled:opacity-40 dark:bg-white dark:text-zinc-950" aria-label="Send message"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Z" /><path d="M7 12h13" /></svg></button>
                                    </div>
                                    {messageForm.errors.body || messageForm.errors.media ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{messageForm.errors.body || messageForm.errors.media}</p> : null}
                                </form>
                            ) : (
                                <div className="border-t border-zinc-200 bg-zinc-100 px-5 py-4 text-sm text-zinc-600 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                    {selectedThread.isMuted ? 'Messaging is paused while the safety team reviews this conversation.' : 'This conversation is read-only because the request is closed.'}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="hidden items-center justify-center p-10 text-center lg:flex">
                            <div className="max-w-sm">
                                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7" aria-hidden="true"><path d="M8 18.5 4 20l1.5-4A8 8 0 1 1 8 18.5Z" /></svg></span>
                                <h2 className="mt-5 font-display text-2xl font-semibold text-zinc-950 dark:text-white">Your conversations live here</h2>
                                <p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Messages with customers and providers stay private and connected to the relevant request.</p>
                            </div>
                        </div>
                    )}
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
