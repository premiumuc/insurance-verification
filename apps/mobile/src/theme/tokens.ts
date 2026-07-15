/**
 * Design tokens (light + dark). The shared design system grows from here across
 * milestones (see docs/05 §5). Kept as plain objects so both native and web consume
 * them identically.
 */
export const palette = {
  brand: '#0E7C7B', // calm teal — trust anchor
  brandDark: '#0A5E5D',
  emergency: '#C1121F',
  warning: '#E09F3E',
  success: '#2A9D8F',
};

export type ThemeMode = 'light' | 'dark';

export interface Theme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  border: string;
  brand: string;
  brandDark: string;
  emergency: string;
  warning: string;
  success: string;
}

export const lightTheme: Theme = {
  mode: 'light',
  bg: '#FFFFFF',
  surface: '#F5F7F7',
  text: '#0B1F1F',
  textMuted: '#4A5B5B',
  border: '#DDE5E5',
  ...palette,
};

export const darkTheme: Theme = {
  mode: 'dark',
  bg: '#0B1414',
  surface: '#121F1F',
  text: '#EAF2F2',
  textMuted: '#9BB0B0',
  border: '#233333',
  ...palette,
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 20, pill: 999 } as const;
