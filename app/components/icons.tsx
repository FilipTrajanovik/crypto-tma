type IconProps = { className?: string };

export function DepositIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 4v12" strokeLinecap="round" />
      <path d="M7 12l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 20h16" strokeLinecap="round" />
    </svg>
  );
}

export function WithdrawIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M12 20V8" strokeLinecap="round" />
      <path d="M7 12l5-5 5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 4h16" strokeLinecap="round" />
    </svg>
  );
}

export function InvestIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 17l6-6 4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h6v6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ReleaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 7.5-2" strokeLinecap="round" />
    </svg>
  );
}

export function HistoryIconLg({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 4v5h5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
