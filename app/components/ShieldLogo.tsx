export default function ShieldLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2.5l7.5 3v5.2c0 4.85-3.2 9.34-7.5 10.8-4.3-1.46-7.5-5.95-7.5-10.8V5.5l7.5-3z"
        fill="#c9a84c"
        stroke="#c9a84c"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 12.2l2 2 4-4.4"
        stroke="#0a1628"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
