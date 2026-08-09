// InkQuest brand logo: a fountain-pen nib (iridescent ink) with a game controller
// embedded in it — “gamify your life” in one mark.
let logoUid = 0;

export function InkQuestLogo({ size = 40, className = '' }: { size?: number; className?: string }) {
  const uid = `il${++logoUid}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${uid}-nib`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#8b5fc9" />
          <stop offset="0.35" stopColor="#4a7fc9" />
          <stop offset="0.7" stopColor="#3f9a9e" />
          <stop offset="1" stopColor="#d29a45" />
        </linearGradient>
      </defs>

      {/* nib */}
      <path
        d="M32 4.5 C38 13.5, 47.5 19.5, 52 31 L53 47 Q 32 52.5 11 47 L12 31 C16.5 19.5, 26 13.5, 32 4.5 Z"
        fill={`url(#${uid}-nib)`}
        stroke="#2c2a26"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      {/* gloss highlight */}
      <path d="M20 33.5 C22 26.5, 26 20, 30.5 11.5" stroke="rgba(255,255,255,0.5)" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* slit */}
      <path d="M32 4.5 L32 22.5" stroke="#2c2a26" strokeWidth="1.4" strokeLinecap="round" />
      {/* breather hole */}
      <circle cx="32" cy="25.5" r="3.4" fill="#2c2a26" />
      <circle cx="32" cy="25.5" r="2.1" fill="#d29a45" />
      {/* gold ring band along the base */}
      <path d="M17 45.4 Q 32 48.6 47 45.4" stroke="#e0a94e" strokeWidth="3.6" fill="none" strokeLinecap="round" />

      {/* controller window (dark inlay on the nib) */}
      <rect x="20.5" y="29.5" width="23" height="15" rx="3.2" fill="rgba(26,24,21,0.92)" stroke="#2c2a26" strokeWidth="0.9" />
      {/* controller body */}
      <rect x="23.6" y="32.4" width="16.8" height="10.4" rx="5" fill="#f1ecdf" stroke="#2c2a26" strokeWidth="0.9" />
      {/* joysticks */}
      <circle cx="27.6" cy="35.3" r="2" fill="#2d2a26" />
      <circle cx="36.4" cy="35.3" r="2" fill="#2d2a26" />
      {/* d-pad */}
      <g fill="#2d2a26">
        <rect x="26.7" y="38.7" width="1.8" height="2.9" rx="0.4" />
        <rect x="25.7" y="39.6" width="3.8" height="1.7" rx="0.4" />
      </g>
      {/* face buttons */}
      <circle cx="35.3" cy="38.3" r="1.1" fill="#e34f4f" />
      <circle cx="37.9" cy="38.3" r="1.1" fill="#6fbf73" />
      <circle cx="36.6" cy="37.1" r="1.1" fill="#f2c94c" />
      <circle cx="36.6" cy="39.5" r="1.1" fill="#5f9fd6" />
    </svg>
  );
}
