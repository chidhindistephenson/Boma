function toneClasses(tone) {
    switch (tone) {
        case 'success':
            return 'border-zinc-950 bg-zinc-950 text-white dark:border-white dark:bg-white dark:text-zinc-950';
        case 'danger':
            return 'border-zinc-300 bg-white text-zinc-950 dark:border-white/10 dark:bg-zinc-900 dark:text-white';
        case 'accent':
            return 'border-zinc-950/15 bg-zinc-100 text-zinc-950 dark:border-white/10 dark:bg-white/10 dark:text-white';
        default:
            return 'border-zinc-300 bg-white text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300';
    }
}

export default function VerificationTimeline({
    entries = [],
    title = 'Verification timeline',
    subtitle = 'Recent verification activity across uploads, submissions, and reviews.',
    emptyMessage = 'No verification activity has been recorded yet.',
    compact = false,
}) {
    return (
        <section
            className={`rounded-[2rem] border border-zinc-200/80 bg-white/88 shadow-[0_18px_50px_rgba(0,0,0,0.08)] dark:border-white/10 dark:bg-zinc-950/82 dark:shadow-[0_18px_50px_rgba(0,0,0,0.34)] ${
                compact ? 'p-5' : 'p-8'
            }`}
        >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">
                        Verification timeline
                    </p>
                    <h3
                        className={`mt-2 font-display font-semibold text-zinc-950 dark:text-white ${
                            compact ? 'text-xl' : 'text-2xl'
                        }`}
                    >
                        {title}
                    </h3>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                        {subtitle}
                    </p>
                </div>

                <span className="rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-300">
                    {entries.length} event{entries.length === 1 ? '' : 's'}
                </span>
            </div>

            {entries.length ? (
                <div className="mt-6 space-y-4">
                    {entries.map((entry) => (
                        <div
                            key={entry.id}
                            className="rounded-[1.4rem] border border-zinc-200 bg-zinc-50/85 p-5 dark:border-white/10 dark:bg-white/[0.03]"
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="max-w-3xl">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span
                                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${toneClasses(
                                                entry.tone,
                                            )}`}
                                        >
                                            {entry.title}
                                        </span>
                                        {entry.actorName ? (
                                            <span className="inline-flex rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
                                                {entry.actorName}
                                            </span>
                                        ) : null}
                                    </div>
                                    <p className="mt-3 text-sm leading-7 text-zinc-600 dark:text-zinc-400">
                                        {entry.summary}
                                    </p>
                                </div>

                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                                    {entry.createdAt}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-300 bg-zinc-50/85 p-6 text-sm leading-7 text-zinc-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                    {emptyMessage}
                </div>
            )}
        </section>
    );
}
