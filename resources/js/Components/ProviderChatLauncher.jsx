import { Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

const CHAT_EMOJIS = [
    '😊',
    '😂',
    '👍',
    '🙏',
    '❤️',
    '👋',
    '😀',
    '🔥',
    '✅',
    '💡',
    '🛠️',
    '📍',
];

function ChatIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-6 w-6"
            aria-hidden="true"
        >
            <path d="M8 18.5 4 20l1.5-4A8 8 0 1 1 8 18.5Z" />
            <path d="m14.5 7.5 2 2-5.75 5.75-2.75.75.75-2.75L14.5 7.5Z" />
        </svg>
    );
}

function formatMessageTime(value) {
    return new Intl.DateTimeFormat(undefined, {
        hour: '2-digit',
        minute: '2-digit',
    }).format(new Date(value));
}

export default function ProviderChatLauncher({
    provider,
    canChat,
    isAuthenticated,
    thread,
    initiallyOpen = false,
}) {
    const { auth } = usePage().props;
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    const [isEmojiOpen, setIsEmojiOpen] = useState(false);
    const [isProviderTyping, setIsProviderTyping] = useState(false);
    const [otherReadAt, setOtherReadAt] = useState(thread?.otherReadAt);
    const messageListRef = useRef(null);
    const messageInputRef = useRef(null);
    const mediaInputRef = useRef(null);
    const channelRef = useRef(null);
    const typingTimerRef = useRef(null);
    const remoteTypingTimerRef = useRef(null);
    const { data, setData, post, processing, errors, reset } = useForm({
        body: '',
        media: null,
    });

    useEffect(() => {
        if (!isOpen || !thread) {
            return undefined;
        }

        const interval = window.setInterval(() => {
            router.reload({
                only: ['chatThread'],
                preserveScroll: true,
                preserveState: true,
            });
        }, window.Echo ? 15000 : 2500);

        return () => window.clearInterval(interval);
    }, [isOpen, thread?.id]);

    useEffect(() => {
        if (!isOpen || !thread || !window.Echo) {
            return undefined;
        }

        const channelName = `job-request.${thread.id}`;
        const channel = window.Echo.private(channelName);
        channelRef.current = channel;

        axios.post(route('inbox.read', thread.id));

        channel.listen('.message.sent', () => {
            axios.post(route('inbox.read', thread.id));
            setIsProviderTyping(false);
            router.reload({
                only: ['chatThread'],
                preserveScroll: true,
                preserveState: true,
            });
        });

        channel.listen('.conversation.read', (event) => {
            if (event.readerId === provider.id) {
                setOtherReadAt(event.readAt);
            }
        });

        channel.listenForWhisper('typing', (event) => {
            if (event.userId !== provider.id) return;

            window.clearTimeout(remoteTypingTimerRef.current);
            setIsProviderTyping(Boolean(event.isTyping));

            if (event.isTyping) {
                remoteTypingTimerRef.current = window.setTimeout(
                    () => setIsProviderTyping(false),
                    2200,
                );
            }
        });

        return () => {
            window.clearTimeout(remoteTypingTimerRef.current);
            channelRef.current = null;
            window.Echo.leave(channelName);
        };
    }, [isOpen, provider.id, thread?.id]);

    useEffect(() => {
        setOtherReadAt(thread?.otherReadAt);
    }, [thread?.otherReadAt]);

    useEffect(() => {
        if (!isOpen || !messageListRef.current) {
            return;
        }

        messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }, [isOpen, thread?.messages.length]);

    useEffect(() => {
        const messageInput = messageInputRef.current;

        if (!messageInput) {
            return;
        }

        messageInput.style.height = 'auto';
        messageInput.style.height = `${Math.min(messageInput.scrollHeight, 112)}px`;
    }, [data.body, isOpen]);

    const submit = (event) => {
        event.preventDefault();

        if (thread?.canMessage === false) return;

        post(route('providers.chat.store', provider.id), {
            forceFormData: true,
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                reset();
                setIsEmojiOpen(false);
                channelRef.current?.whisper('typing', {
                    userId: auth.user.id,
                    isTyping: false,
                });

                if (mediaInputRef.current) {
                    mediaInputRef.current.value = '';
                }
            },
        });
    };

    const appendEmoji = (emoji) => {
        updateBody(`${data.body}${emoji}`);
        setIsEmojiOpen(false);
    };

    const updateBody = (value) => {
        setData('body', value);

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

    if (!canChat && isAuthenticated) {
        return null;
    }

    if (!canChat) {
        return (
            <Link
                href={route('login')}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-950 bg-zinc-950 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                aria-label={`Log in to chat with ${provider.businessName}`}
                title="Log in to chat"
            >
                <ChatIcon />
            </Link>
        );
    }

    return (
        <>
            {isOpen ? (
                <section
                    id="provider-chat-composer"
                    className="fixed bottom-24 right-4 z-50 flex max-h-[calc(100dvh-7.5rem)] w-[calc(100%-2rem)] max-w-sm flex-col overflow-hidden rounded-[1.7rem] border border-zinc-200 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.24)] sm:right-6 dark:border-white/10 dark:bg-zinc-950 dark:text-white"
                    aria-label={`Chat with ${provider.businessName}`}
                >
                    <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-white/10">
                        <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950">
                                {provider.businessName
                                    .split(' ')
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((part) => part[0]?.toUpperCase() ?? '')
                                    .join('')}
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                                    {thread ? 'Provider chat' : 'New message'}
                                </p>
                                <p className="truncate font-display text-base font-semibold text-zinc-950 dark:text-white">
                                    {provider.businessName}
                                </p>
                                {isProviderTyping ? (
                                    <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                                        Typing...
                                    </p>
                                ) : null}
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
                            aria-label="Close chat composer"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="h-5 w-5"
                                aria-hidden="true"
                            >
                                <path d="m6 6 12 12M18 6 6 18" />
                            </svg>
                        </button>
                    </div>

                    {thread?.messages.length ? (
                        <div
                            ref={messageListRef}
                            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-zinc-50/80 p-4 dark:bg-black/20"
                            aria-live="polite"
                        >
                            {thread.messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${
                                        message.isOwn ? 'justify-end' : 'justify-start'
                                    }`}
                                >
                                    <div
                                        className={`max-w-[82%] rounded-[1.15rem] px-4 py-2.5 text-sm leading-6 ${
                                            message.isOwn
                                                ? 'rounded-br-md bg-zinc-950 text-white dark:bg-white dark:text-zinc-950'
                                                : 'rounded-bl-md border border-zinc-200 bg-white text-zinc-800 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-200'
                                        }`}
                                    >
                                        {message.attachment ? (
                                            <a
                                                href={message.attachment.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mb-2 block overflow-hidden rounded-xl border border-current/10"
                                            >
                                                {message.attachment.isImage ? (
                                                    <img
                                                        src={message.attachment.url}
                                                        alt={message.attachment.name}
                                                        className="max-h-48 w-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex items-center gap-2 px-3 py-3 text-xs font-semibold">
                                                        <svg
                                                            viewBox="0 0 24 24"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            strokeWidth="2"
                                                            className="h-5 w-5 shrink-0"
                                                            aria-hidden="true"
                                                        >
                                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                                                            <path d="M14 2v6h6" />
                                                        </svg>
                                                        <span className="truncate">
                                                            {message.attachment.name}
                                                        </span>
                                                    </span>
                                                )}
                                            </a>
                                        ) : null}
                                        {message.body ? <p>{message.body}</p> : null}
                                        <p
                                            className={`mt-1 text-right text-[10px] ${
                                                message.isOwn
                                                    ? 'text-white/60 dark:text-zinc-500'
                                                    : 'text-zinc-400 dark:text-zinc-500'
                                            }`}
                                        >
                                            {formatMessageTime(message.createdAt)}
                                            {message.isOwn ? (
                                                <span
                                                    className="ml-1 font-semibold"
                                                    title={
                                                        otherReadAt &&
                                                        new Date(message.createdAt) <=
                                                            new Date(otherReadAt)
                                                            ? 'Read'
                                                            : 'Delivered'
                                                    }
                                                >
                                                    {otherReadAt &&
                                                    new Date(message.createdAt) <=
                                                        new Date(otherReadAt)
                                                        ? '\u2713\u2713'
                                                        : '\u2713'}
                                                </span>
                                            ) : null}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : null}

                    <form
                        onSubmit={submit}
                        className="shrink-0 border-t border-zinc-200 p-4 dark:border-white/10"
                    >
                        {thread?.isMuted ? (
                            <p className="mb-3 rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                                Messaging is paused while the safety team reviews this conversation.
                            </p>
                        ) : null}
                        {data.media ? (
                            <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                                <span className="truncate">{data.media.name}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setData('media', null);

                                        if (mediaInputRef.current) {
                                            mediaInputRef.current.value = '';
                                        }
                                    }}
                                    className="shrink-0 font-semibold underline underline-offset-2"
                                >
                                    Remove
                                </button>
                            </div>
                        ) : null}

                        {errors.body || errors.media ? (
                            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                                {errors.body ?? errors.media}
                            </p>
                        ) : null}

                        <div className="flex items-end gap-2">
                            <input
                                ref={mediaInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                                className="hidden"
                                onChange={(event) =>
                                    setData('media', event.target.files?.[0] ?? null)
                                }
                            />
                            <button
                                type="button"
                                onClick={() => mediaInputRef.current?.click()}
                                disabled={thread?.canMessage === false}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-950 transition hover:bg-zinc-100 dark:text-white dark:hover:bg-white/10"
                                aria-label="Attach an image or PDF"
                                title="Attach media"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path d="M12 5v14M5 12h14" />
                                </svg>
                            </button>

                            <div className="relative flex min-w-0 flex-1 items-end rounded-[1.35rem] bg-zinc-100 px-1 dark:bg-zinc-900">
                                <textarea
                                    ref={messageInputRef}
                                    value={data.body}
                                    onChange={(event) =>
                                        updateBody(event.target.value)
                                    }
                                    disabled={thread?.canMessage === false}
                                    onKeyDown={(event) => {
                                        if (
                                            event.key === 'Enter' &&
                                            !event.shiftKey &&
                                            !event.nativeEvent.isComposing
                                        ) {
                                            event.preventDefault();

                                            if (data.body.trim() || data.media) {
                                                event.currentTarget.form?.requestSubmit();
                                            }
                                        }
                                    }}
                                    rows={1}
                                    maxLength={2000}
                                    autoFocus
                                    className="min-h-10 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-sm leading-5 text-zinc-950 placeholder:text-zinc-500 focus:ring-0 dark:text-white dark:placeholder:text-zinc-500"
                                    placeholder="Write a message..."
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsEmojiOpen((open) => !open)}
                                    className="mb-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-zinc-950 dark:hover:bg-white/10 dark:hover:text-white"
                                    aria-label="Choose an emoji"
                                    aria-expanded={isEmojiOpen}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                    >
                                        <circle cx="12" cy="12" r="9" />
                                        <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
                                    </svg>
                                </button>

                                {isEmojiOpen ? (
                                    <div className="absolute bottom-12 right-0 z-10 grid w-52 grid-cols-6 gap-1 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-950">
                                        {CHAT_EMOJIS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => appendEmoji(emoji)}
                                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-zinc-100 dark:hover:bg-white/10"
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>

                            <button
                                type="submit"
                                disabled={
                                    processing || (!data.body.trim() && !data.media)
                                    || thread?.canMessage === false
                                }
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                                aria-label="Send message"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                >
                                    <path d="m4 4 16 8-16 8 3-8-3-8Z" />
                                    <path d="M7 12h13" />
                                </svg>
                            </button>
                        </div>
                    </form>
                </section>
            ) : null}

            <button
                type="button"
                onClick={() => setIsOpen((open) => !open)}
                className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-zinc-950 bg-zinc-950 text-white shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition hover:-translate-y-1 hover:bg-zinc-800 dark:border-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                aria-label={`${isOpen ? 'Close' : 'Open'} chat with ${provider.businessName}`}
                aria-expanded={isOpen}
                aria-controls="provider-chat-composer"
                title="Chat with provider"
            >
                <ChatIcon />
            </button>
        </>
    );
}
