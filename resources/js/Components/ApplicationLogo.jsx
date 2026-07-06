export default function ApplicationLogo(props) {
    return (
        <svg
            {...props}
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
        >
            <path
                d="M32 6C21.23 6 12.5 14.44 12.5 24.85C12.5 38.64 28.65 52.55 31 54.5C31.58 54.98 32.42 54.98 33 54.5C35.35 52.55 51.5 38.64 51.5 24.85C51.5 14.44 42.77 6 32 6Z"
                fill="currentColor"
                opacity="0.18"
            />
            <path
                d="M32 7.5C22.04 7.5 14 15.3 14 24.95C14 37.09 27.31 49.45 32 53.38C36.69 49.45 50 37.09 50 24.95C50 15.3 41.96 7.5 32 7.5Z"
                fill="currentColor"
            />
            <path
                d="M32 18.5C28.41 18.5 25.5 21.41 25.5 25C25.5 28.59 28.41 31.5 32 31.5C35.59 31.5 38.5 28.59 38.5 25C38.5 21.41 35.59 18.5 32 18.5Z"
                fill="white"
            />
            <path
                d="M44.25 42.25L49 47M19.75 42.25L15 47M22.5 12L18 7.5M41.5 12L46 7.5"
                stroke="currentColor"
                strokeLinecap="round"
                strokeWidth="3"
            />
        </svg>
    );
}
