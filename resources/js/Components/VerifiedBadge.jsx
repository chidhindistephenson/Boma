import badgeDark from '../../images/Badgeblack.png';
import badgeLight from '../../images/badgewhite.png';

export default function VerifiedBadge({ className = '' }) {
    return (
        <span
            className={`inline-flex items-center ${className}`}
            aria-label="Verified"
            title="Verified"
        >
            <img
                src={badgeDark}
                alt="Verified"
                className="h-7 w-auto dark:hidden"
            />
            <img
                src={badgeLight}
                alt="Verified"
                className="hidden h-7 w-auto dark:block"
            />
        </span>
    );
}
