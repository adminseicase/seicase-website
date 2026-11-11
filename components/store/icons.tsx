import type { SVGProps } from "react";

/** Thin-line brand + trust icons (lucide v1 no longer ships brand logos). */
type P = SVGProps<SVGSVGElement>;
const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export const InstagramIcon = (p: P) => (
  <svg {...base} {...p} aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
  </svg>
);
export const PinterestIcon = (p: P) => (
  <svg {...base} {...p} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M10.6 8.6c1.9-1.1 5.1-.4 5.1 2.4 0 2.3-1.6 3.7-3.2 3.7-1 0-1.5-.6-1.5-.6L9.8 19.5" />
    <path d="M11 14.1c-.9-.4-1.3-1.3-1.3-2.3" />
  </svg>
);
export const YoutubeIcon = (p: P) => (
  <svg {...base} {...p} aria-hidden="true">
    <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
    <path d="m10 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" />
  </svg>
);
export const FacebookIcon = (p: P) => (
  <svg {...base} {...p} aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M13.5 21v-7.5H16l.4-2.8h-2.9V9c0-.8.3-1.4 1.5-1.4h1.5V5.2a19 19 0 0 0-2.2-.1c-2.2 0-3.6 1.3-3.6 3.7v1.9H8.3v2.8h2.4V21" />
  </svg>
);
export const WhatsappIcon = (p: P) => (
  <svg {...base} {...p} aria-hidden="true">
    <path d="M4 20.5 5.3 16A8.5 8.5 0 1 1 8.4 19z" />
    <path d="M9 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.2 0 .5-.1.6l-.5.6c-.1.2-.1.4 0 .6.6 1.1 1.5 2 2.6 2.6.2.1.4.1.6 0l.6-.6c.2-.2.4-.2.6-.1l1.6.7c.3.1.4.3.4.5v.5c0 .3 0 .6-.5.8-.6.3-1.6.6-3-.1-1.8-.9-3.2-2.3-4.1-4-.7-1.5-.5-2.4-.2-3z" />
  </svg>
);

/** Small leather hide icon used in the trust strip */
export const LeatherIcon = (p: P) => (
  <svg {...base} {...p} aria-hidden="true">
    <path d="M7 3c1 1.2 2.6 1.6 5 1.6S16 4.2 17 3c1 1.5 2.6 2 4 2-.6 2.4-.4 4.4.6 6-1.2 1-1.6 2.4-1.6 4 0 2.6-2 5-4.4 5-1 0-2.6-.6-3.6-.6S9 20 8 20c-2.4 0-4.4-2.4-4.4-5 0-1.6-.4-3-1.6-4 1-1.6 1.2-3.6.6-6 1.4 0 3-.5 4.4-2z" />
    <path d="M8 9.5h8M8 13.5h8" strokeDasharray="1.5 2" />
  </svg>
);
