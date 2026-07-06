export default function Checkbox({ className = '', ...props }) {
    return (
        <input
            {...props}
            type="checkbox"
            className={
                'rounded border-zinc-300 text-zinc-950 shadow-sm focus:ring-zinc-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-400 ' +
                className
            }
        />
    );
}
