/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const AppTheme = {
  colors: {
    background: "#07080A",
    backgroundElevated: "#101217",
    surface: "#151820",
    surfaceSoft: "#1C202A",
    surfaceRaised: "#222632",
    border: "#2A2F3A",
    borderSoft: "#1E2330",
    text: "#F8F4EA",
    textMuted: "#A8AFBD",
    textSubtle: "#6F7787",
    accent: "#C9A46A",
    accentSoft: "#2A231A",
    accentMuted: "#A8854F",
    danger: "#E15B64",
    success: "#4FB286",
    live: "#F25555",
    input: "#11141A",
    scrim: "rgba(7,8,10,0.62)",
    scrimHeavy: "rgba(7,8,10,0.82)",
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    pill: 999,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  typography: {
    display: {
      fontSize: 34,
      lineHeight: 40,
      fontWeight: "900" as const,
      letterSpacing: 0.2,
    },
    title: {
      fontSize: 26,
      lineHeight: 32,
      fontWeight: "900" as const,
    },
    heading: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800" as const,
    },
    subtitle: {
      fontSize: 17,
      lineHeight: 23,
      fontWeight: "800" as const,
    },
    body: {
      fontSize: 15,
      lineHeight: 22,
      fontWeight: "500" as const,
    },
    label: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "700" as const,
    },
    caption: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: "700" as const,
    },
    kicker: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: "900" as const,
      letterSpacing: 1.4,
    },
  },
  elevation: {
    flat: {},
    low: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    medium: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 6,
    },
    high: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 10,
    },
  },
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
