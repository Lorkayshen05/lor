import type { SVGProps } from 'react';

const PATHS = {
  home: 'M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10',
  menu: 'M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5zM8 16.5h11M9 8.5h6',
  discover: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5 5-2z',
  cart: 'M5 8h14l-1 12H6L5 8zM9 8V6.5a3 3 0 0 1 6 0V8',
  orders: 'M6 3.5h12v17l-3-2-3 2-3-2-3 2v-17zM9 8h6M9 12h6',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.6 5.6 3.6 9S14.500 18.400 12 21M12 3C9.500 5.600 8.400 8.600 8.400 12S9.500 18.400 12 21',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  chevron: 'M9 6l6 6-6 6',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l1 13h8l1-13',
} as const;

export type IconName = keyof typeof PATHS;

interface Props extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  /** Mirror in right-to-left layouts (arrows, chevrons). */
  directional?: boolean;
}

export function Icon({ name, size = 22, directional = false, className = '', ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={`icon ${directional ? 'icon-dir' : ''} ${className}`}
      {...rest}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
