import { Link } from '@inertiajs/react';

export default function NavLink({
    active = false,
    className = '',
    children,
    ...props
}) {
    return (
        <Link
            {...props}
            className={
                'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium leading-5 transition duration-150 ease-in-out focus:outline-none ' +
                (active
                    ? 'border-zinc-950 text-zinc-950 focus:border-zinc-700 dark:border-white dark:text-white dark:focus:border-zinc-300'
                    : 'border-transparent text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 focus:border-zinc-300 focus:text-zinc-700 dark:text-zinc-400 dark:hover:border-white/15 dark:hover:text-zinc-100 dark:focus:border-white/15 dark:focus:text-zinc-100') +
                className
            }
        >
            {children}
        </Link>
    );
}
