type AvaliaRealLogoProps = {
  className?: string;
  title?: string;
};

export function AvaliaRealLogo({
  className = "size-9",
  title = "AvaliaReal",
}: AvaliaRealLogoProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="avaliareal-neon" x1="18" y1="14" x2="48" y2="50">
          <stop stopColor="var(--brand-light)" />
          <stop offset="0.48" stopColor="var(--safe)" />
          <stop offset="1" stopColor="var(--brand)" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="31" fill="var(--paper)" />
      <circle cx="32" cy="32" r="29.5" fill="none" stroke="var(--border)" />
      <path
        d="M18 42.5 29.7 18h5.2l11.4 24.5h-7l-2.1-5.1H27l-2.2 5.1H18Zm11.6-11.4h5l-2.5-6.2-2.5 6.2Z"
        fill="url(#avaliareal-neon)"
      />
      <path
        d="m37.8 23.5 4.1 4.1 7.7-8"
        fill="none"
        stroke="url(#avaliareal-neon)"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}