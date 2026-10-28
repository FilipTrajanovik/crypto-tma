import type { SVGProps } from "react";

// Custom action icons: 24px grid, 1.8 stroke, rounded joins, one soft
// duotone fill per icon. Colour comes from currentColor.
type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function DepositIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 15.5v2.2A2.3 2.3 0 0 0 6.3 20h11.4a2.3 2.3 0 0 0 2.3-2.3v-2.2" />
      <path d="M12 3.5v11" />
      <path d="m7.8 10.6 4.2 4.2 4.2-4.2" />
    </svg>
  );
}

export function WithdrawIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 15.5v2.2A2.3 2.3 0 0 0 6.3 20h11.4a2.3 2.3 0 0 0 2.3-2.3v-2.2" />
      <path d="M12 14.5v-11" />
      <path d="m7.8 7.7 4.2-4.2 4.2 4.2" />
    </svg>
  );
}

export function AuthorizedIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M12 2.8 4.6 5.6v5.7c0 4.6 3.1 8.2 7.4 9.9 4.3-1.7 7.4-5.3 7.4-9.9V5.6L12 2.8Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <circle cx="12" cy="9.8" r="2.3" />
      <path d="M7.9 16.4c.7-2 2.2-3 4.1-3s3.4 1 4.1 3" />
    </svg>
  );
}

export function ReleaseIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2.6" fill="currentColor" fillOpacity="0.16" />
      <path d="M8 10.5V7.6a4 4 0 0 1 7.7-1.5" />
      <circle cx="12" cy="15.4" r="1.2" />
      <path d="M12 16.6v1.7" />
    </svg>
  );
}

export function DocumentsIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path
        d="M14 3H8.2A2.2 2.2 0 0 0 6 5.2v13.6A2.2 2.2 0 0 0 8.2 21h7.6a2.2 2.2 0 0 0 2.2-2.2V7l-4-4Z"
        fill="currentColor"
        fillOpacity="0.16"
      />
      <path d="M14 3v3a1 1 0 0 0 1 1h3" />
      <path d="M9.5 12.5h5M9.5 16h5" />
    </svg>
  );
}

export function ShopIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5.2 8.5h13.6l1 11a1.5 1.5 0 0 1-1.5 1.6H5.7a1.5 1.5 0 0 1-1.5-1.6l1-11Z" fill="currentColor" fillOpacity="0.16" />
      <path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7" />
    </svg>
  );
}
