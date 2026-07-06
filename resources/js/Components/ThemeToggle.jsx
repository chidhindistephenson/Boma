import { useEffect, useState } from 'react';

const STORAGE_KEY = 'boma-theme';

function currentTheme() {
    if (typeof document === 'undefined') {
        return 'light';
    }

    return document.documentElement.classList.contains('dark')
        ? 'dark'
        : 'light';
}

function applyTheme(theme) {
    const root = document.documentElement;

    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    try {
        window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
        // Ignore storage failures and keep the document theme in sync.
    }

    window.dispatchEvent(
        new CustomEvent('boma-theme-change', { detail: theme }),
    );
}

export default function ThemeToggle({ className = '' }) {
    const [theme, setTheme] = useState(currentTheme);

    useEffect(() => {
        const syncTheme = () => {
            setTheme(currentTheme());
        };

        window.addEventListener('storage', syncTheme);
        window.addEventListener('boma-theme-change', syncTheme);

        return () => {
            window.removeEventListener('storage', syncTheme);
            window.removeEventListener('boma-theme-change', syncTheme);
        };
    }, []);

    const isDark = theme === 'dark';
    const nextTheme = isDark ? 'light' : 'dark';

    return (
        <button
            type="button"
            onClick={() => {
                applyTheme(nextTheme);
                setTheme(nextTheme);
            }}
            aria-label={`Switch to ${nextTheme} mode`}
            className={
                `inline-flex items-center gap-2 rounded-full border border-zinc-300/90 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-900 backdrop-blur transition hover:border-zinc-400 hover:bg-white dark:border-white/10 dark:bg-zinc-950/80 dark:text-zinc-100 dark:hover:border-white/20 dark:hover:bg-zinc-900 ${className}`
            }
        >
            <span className="relative flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-950">
                {isDark ? (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="4" />
                        <path d="M12 2v2.5M12 19.5V22M4.93 4.93l1.77 1.77M17.3 17.3l1.77 1.77M2 12h2.5M19.5 12H22M4.93 19.07l1.77-1.77M17.3 6.7l1.77-1.77" />
                    </svg>
                ) : (
                    <svg
                        viewBox="0 0 24 24"
                        className="h-3.5 w-3.5"
                        fill="currentColor"
                    >
                        <path d="M21 15.2A9 9 0 0 1 8.8 3a.75.75 0 0 0-.93-.96A10.5 10.5 0 1 0 22 16.13a.75.75 0 0 0-.96-.93H21Z" />
                    </svg>
                )}
            </span>
            <span>{isDark ? 'Light' : 'Dark'}</span>
        </button>
    );
}
