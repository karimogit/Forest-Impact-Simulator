import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number | undefined, props: IconProps) => ({
  xmlns: 'http://www.w3.org/2000/svg',
  width: size ?? 20,
  height: size ?? 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
});

export const MapPinIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const TreeIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 3 7 10h3l-4 6h5v5h2v-5h5l-4-6h3L12 3Z" />
  </svg>
);

export const SproutIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 22V12" />
    <path d="M12 12c0-4 3-7 8-7 0 4-3 7-8 7Z" />
    <path d="M12 16c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5Z" />
  </svg>
);

export const AxeIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9" />
    <path d="M15 13 9 7l4-4 6 6h3a8 8 0 0 1-7 7Z" />
  </svg>
);

export const ChartIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 3v18h18" />
    <path d="M7 15v-4" />
    <path d="M12 15V8" />
    <path d="M17 15v-6" />
  </svg>
);

export const SearchIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const ClockIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const XIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);

export const CheckIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="m5 12 5 5L20 7" />
  </svg>
);

export const ChevronDownIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

export const RefreshIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
    <path d="M3 21v-5h5" />
  </svg>
);

export const DownloadIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 3v12" />
    <path d="m7 10 5 5 5-5" />
    <path d="M4 21h16" />
  </svg>
);

export const LinkIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>
);

export const FileTextIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
    <path d="M14 3v5h5" />
    <path d="M9 13h6M9 17h6" />
  </svg>
);

export const TableIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 10h18M3 15h18M9 4v16M15 4v16" />
  </svg>
);

export const BracesIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1" />
    <path d="M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
  </svg>
);

export const GlobeIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18Z" />
  </svg>
);

export const InfoIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);

export const AlertIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const StarIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="m12 3 2.8 5.8 6.2.9-4.5 4.4 1.1 6.2L12 17.4 6.4 20.3l1.1-6.2L3 9.7l6.2-.9L12 3Z" />
  </svg>
);

export const LayersIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="m12 3 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 16 9 5 9-5" />
  </svg>
);

export const CrosshairIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
  </svg>
);

export const ThermometerIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0Z" />
  </svg>
);

export const DropletIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
  </svg>
);

export const WindIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M3 8h11a3 3 0 1 0-3-3" />
    <path d="M3 12h16a3 3 0 1 1-3 3" />
    <path d="M3 16h8a2 2 0 1 1-2 2" />
  </svg>
);

export const ShieldIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
  </svg>
);

export const UsersIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7" />
    <path d="M17.5 14a6 6 0 0 1 4 6" />
  </svg>
);

export const BriefcaseIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M3 13h18" />
  </svg>
);

export const LandscapeIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="m3 19 6-9 4 6 3-4 5 7H3Z" />
    <circle cx="17" cy="7" r="2" />
  </svg>
);

export const LeafIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="M4 20c0-9 6-15 16-16 0 10-6 16-16 16Z" />
    <path d="M4 20 14 10" />
  </svg>
);

export const RulerIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <path d="m3 17 14-14 4 4L7 21l-4-4Z" />
    <path d="m7 13 2 2M10 10l2 2M13 7l2 2" />
  </svg>
);

export const CalendarIcon = ({ size, ...props }: IconProps) => (
  <svg {...base(size, props)}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

export const GitHubIcon = ({ size, ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size ?? 20}
    height={size ?? 20}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export const Spinner = ({ size = 20, className = '', ...props }: IconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    className={`animate-spin ${className}`}
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
