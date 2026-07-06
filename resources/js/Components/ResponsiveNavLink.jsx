import { Link } from '@inertiajs/react';

export default function ResponsiveNavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={`flex w-full items-start border-l-4 py-2 pe-4 ps-3 ${
                active
                    ? 'border-zinc-950 bg-zinc-100 text-zinc-950 focus:border-zinc-700 focus:bg-zinc-200 focus:text-zinc-950 dark:border-white dark:bg-white/10 dark:text-white dark:focus:border-zinc-300 dark:focus:bg-white/15'
                    : 'border-transparent text-zinc-600 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 focus:border-zinc-300 focus:bg-zinc-50 focus:text-zinc-900 dark:text-zinc-400 dark:hover:border-white/10 dark:hover:bg-white/5 dark:hover:text-white dark:focus:border-white/10 dark:focus:bg-white/5 dark:focus:text-white'
            } text-base font-medium transition duration-150 ease-in-out focus:outline-none ${className}`}
        >
            {children}
        </Link>
    );
}
