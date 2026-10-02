import { useEffect, useState } from 'react';

export function initialsFor(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('') || 'BO';
}

export default function UserAvatar({
    name,
    src,
    className = 'h-12 w-12',
    textClassName = 'text-sm',
}) {
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => setImageFailed(false), [src]);

    return (
        <span
            className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-950 font-display font-semibold text-white ring-1 ring-black/10 dark:bg-white dark:text-zinc-950 dark:ring-white/20 ${textClassName} ${className}`}
            aria-label={`${name} profile photo`}
        >
            {src && !imageFailed ? (
                <img
                    src={src}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={() => setImageFailed(true)}
                />
            ) : (
                <span aria-hidden="true">{initialsFor(name)}</span>
            )}
        </span>
    );
}
