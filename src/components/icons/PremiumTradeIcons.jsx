import React from "react";

function IconCanvas({ size = 24, strokeWidth = 1.65, children, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PipeworkMark(props) {
  return (
    <IconCanvas {...props}>
      <path d="M4 4v5.5A4.5 4.5 0 0 0 8.5 14H15a4 4 0 0 1 4 4v2" />
      <path d="M2.5 4h3M17.5 20h3" />
      <path d="M8 11.5V16M16 12v4" />
    </IconCanvas>
  );
}

export function BoilerMark(props) {
  return (
    <IconCanvas {...props}>
      <rect x="4" y="2.5" width="16" height="19" rx="2" />
      <path d="M4 7.5h16M7 18.5h10" />
      <circle cx="8" cy="5" r=".8" />
      <path d="M12 10.5c1.7 1.6 2.3 2.8 2.3 4a2.3 2.3 0 0 1-4.6 0c0-1.2.7-2.5 2.3-4Z" />
    </IconCanvas>
  );
}

export function ConsumerUnitMark(props) {
  return (
    <IconCanvas {...props}>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path d="M2.5 8h19M8 8v12" />
      <path d="M5.3 11.2v3.5M11.5 11h3M13 9.5v3M17 11h2M18 11v3" />
      <path d="m11.5 17 1.6-2.4v1.8h1.4L13 19" />
    </IconCanvas>
  );
}

export function ExperienceMark(props) {
  return (
    <IconCanvas {...props}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="m9.2 14-1 7 3.8-2 3.8 2-1-7" />
      <path d="m12 5.8.9 1.8 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.1 8l2-.3Z" />
    </IconCanvas>
  );
}

export function CompletedJobsMark(props) {
  return (
    <IconCanvas {...props}>
      <path d="M6 2.8h8l4 4V21H6Z" />
      <path d="M14 2.8V7h4M8.7 11.8l1.4 1.4 2.8-3M9 16.5h6" />
    </IconCanvas>
  );
}

export function CustomerLaurelMark(props) {
  return (
    <IconCanvas {...props}>
      <path d="M4 4.5h16v12H9l-5 3v-15Z" />
      <path d="M12 13.5s-4-2.2-4-5a2.1 2.1 0 0 1 4-1 2.1 2.1 0 0 1 4 1c0 2.8-4 5-4 5Z" />
    </IconCanvas>
  );
}

export function RapidResponseMark(props) {
  return (
    <IconCanvas {...props}>
      <path d="M6.2 18.2A8 8 0 1 1 18 17.8" />
      <path d="M12 4v2M4 12H2M5 7 3.5 5.5" />
      <path d="m13.2 8-3.4 5h3L11.7 18l4.2-6h-3.1Z" />
    </IconCanvas>
  );
}

export function CoverageMark(props) {
  return (
    <IconCanvas {...props}>
      <circle cx="12" cy="12" r="2.2" />
      <circle cx="12" cy="12" r="6" strokeDasharray="2.2 2.2" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
    </IconCanvas>
  );
}

export function InsuranceMark(props) {
  return (
    <IconCanvas {...props}>
      <path d="M12 2.5 19 5v5.8c0 4.5-2.7 8.2-7 10.7-4.3-2.5-7-6.2-7-10.7V5Z" />
      <path d="m8.5 11.8 2.2 2.2 4.8-5" />
    </IconCanvas>
  );
}

export function CraftMark(props) {
  return (
    <IconCanvas {...props}>
      <path d="m7 4 3 3-5 5-3-3ZM17 4l-3 3 5 5 3-3ZM8 13l4 4 4-4M12 17v4" />
    </IconCanvas>
  );
}
