export type ThemeColors = {
  primary: string;
  primaryDark: string;
  secondary: string;
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  white: string;
  black: string;
  overlay: string;
  glass: string;
  glassBorder: string;
};

export const darkColors: ThemeColors = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  secondary: '#FF6584',
  background: '#0F0F23',
  surface: '#1A1A3E',
  card: '#252550',
  text: '#FFFFFF',
  textSecondary: '#B0B0CC',
  textMuted: '#6B6B8A',
  border: '#2D2D5E',
  error: '#FF4757',
  success: '#2ED573',
  warning: '#FFA502',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.5)',
  glass: 'rgba(255,255,255,0.05)',
  glassBorder: 'rgba(255,255,255,0.1)',
};

export const lightColors: ThemeColors = {
  primary: '#6C63FF',
  primaryDark: '#5A52D5',
  secondary: '#FF6584',
  background: '#F5F5FA',
  surface: '#FFFFFF',
  card: '#EEEEF5',
  text: '#1A1A2E',
  textSecondary: '#5A5A7A',
  textMuted: '#9A9AB0',
  border: '#D5D5E0',
  error: '#FF4757',
  success: '#2ED573',
  warning: '#FFA502',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(0,0,0,0.3)',
  glass: 'rgba(255,255,255,0.8)',
  glassBorder: 'rgba(0,0,0,0.05)',
};

export const colors = darkColors;

export const fonts = {
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    xxl: 28,
    title: 34,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
