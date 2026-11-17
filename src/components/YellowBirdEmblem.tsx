interface YellowBirdEmblemProps {
  size?: number;
  className?: string;
}

export function YellowBirdEmblem({ size = 44, className = '' }: YellowBirdEmblemProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Tail feathers */}
      <path
        d="M15 30L5 25L8 32L4 37L16 37Z"
        fill="#EAB308"
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Body */}
      <ellipse cx="31" cy="32" rx="20" ry="16" fill="#FACC15" stroke="#1E293B" strokeWidth="2.5" />
      {/* Belly highlight */}
      <ellipse cx="33" cy="38" rx="14" ry="8" fill="#FEF08A" />
      {/* Cheek */}
      <ellipse cx="37" cy="37" rx="4" ry="2.5" fill="#FB7185" fillOpacity="0.45" />
      {/* Eye */}
      <circle cx="39" cy="27" r="6" fill="#FFFFFF" stroke="#1E293B" strokeWidth="2.2" />
      <circle cx="40.8" cy="27" r="2.6" fill="#0F172A" />
      <circle cx="41.8" cy="25.8" r="1" fill="#FFFFFF" />
      {/* Upper Beak */}
      <path
        d="M45 30C51 30 57 30 57 34L45 35Z"
        fill="#F97316"
        stroke="#1E293B"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Lower Beak */}
      <path
        d="M45 35H55C54 39 50 40 45 39.5Z"
        fill="#EA580C"
        stroke="#1E293B"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Wing */}
      <ellipse
        cx="26"
        cy="34"
        rx="10.5"
        ry="6.5"
        transform="rotate(-8 26 34)"
        fill="#FEF9C3"
        stroke="#1E293B"
        strokeWidth="2.3"
      />
    </svg>
  );
}
