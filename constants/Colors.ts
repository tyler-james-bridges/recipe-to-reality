// Modern 2026 Design System Colors
// Inspired by iOS 18+ with enhanced depth and vibrancy

// Shadow presets for elevation system - React Native compatible
import { Platform } from 'react-native'

const tintColorLight = '#FF9500'
const tintColorDark = '#FF9F0A'

// Subtle gradient backgrounds for glassmorphism effects
export const gradients = {
  light: {
    primary: ['#FF9500', '#FF7A00'] as const,
    secondary: ['#F8F8F8', '#F0F0F0'] as const,
    success: ['#34C759', '#30B350'] as const,
    card: ['#FFFFFF', '#FAFAFA'] as const,
    hero: ['#FFF5E6', '#FFE8CC'] as const,
  },
  dark: {
    primary: ['#FF9F0A', '#FF8500'] as const,
    secondary: ['#1C1C1E', '#161618'] as const,
    success: ['#30D158', '#28B84C'] as const,
    card: ['#2C2C2E', '#242426'] as const,
    hero: ['#2A2015', '#1F1810'] as const,
  },
}
export const shadows = {
  small: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  large: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
}

// Modern spacing scale (4px base)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const

// Typography scale with modern font weights
export const typography = {
  // Display - for hero sections
  displayLarge: {
    fontSize: 34,
    fontWeight: '800' as const,
    letterSpacing: -0.5,
    lineHeight: 41,
  },
  displayMedium: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.4,
    lineHeight: 34,
  },
  // Title - for section headers
  titleLarge: {
    fontSize: 22,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  titleMedium: {
    fontSize: 17,
    fontWeight: '600' as const,
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  titleSmall: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  // Body - for content
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    letterSpacing: -0.1,
    lineHeight: 24,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 18,
  },
  // Label - for buttons, badges
  labelLarge: {
    fontSize: 15,
    fontWeight: '600' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.2,
    lineHeight: 18,
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600' as const,
    letterSpacing: 0.3,
    lineHeight: 14,
  },
  // Caption - for secondary info
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
} as const

// Border radius scale
export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const

// Border radius with continuous curve (iOS squircle) for native feel
export const borderRadius = {
  sm: { borderRadius: radius.sm, borderCurve: 'continuous' as const },
  md: { borderRadius: radius.md, borderCurve: 'continuous' as const },
  lg: { borderRadius: radius.lg, borderCurve: 'continuous' as const },
  xl: { borderRadius: radius.xl, borderCurve: 'continuous' as const },
  '2xl': { borderRadius: radius['2xl'], borderCurve: 'continuous' as const },
  full: { borderRadius: radius.full, borderCurve: 'continuous' as const },
}

// Animation durations
export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
} as const

export default {
  light: {
    text: '#000000',
    textSecondary: '#3C3C43',
    textTertiary: '#8E8E93',
    background: '#F2F2F7',
    tint: tintColorLight,
    tabIconDefault: '#8E8E93',
    tabIconSelected: tintColorLight,
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    border: '#E5E5EA',
    borderSubtle: '#F0F0F0',
    secondaryBackground: '#F2F2F7',
    tertiaryBackground: '#FFFFFF',
    groupedBackground: '#F2F2F7',
    secondaryLabel: '#3C3C43',
    success: '#34C759',
    successBackground: '#34C75915',
    warning: '#FF9500',
    warningBackground: '#FF950015',
    error: '#FF3B30',
    errorBackground: '#FF3B3015',
    info: '#007AFF',
    infoBackground: '#007AFF15',
    // New modern additions
    overlay: 'rgba(0, 0, 0, 0.4)',
    glass: 'rgba(255, 255, 255, 0.8)',
    glassSubtle: 'rgba(255, 255, 255, 0.6)',
    shimmer: '#E8E8ED',
    accent: '#FF9500',
    accentSubtle: '#FF950020',
    skeleton: '#E5E5EA',
    skeletonHighlight: '#F2F2F7',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#EBEBF5',
    textTertiary: '#8E8E93',
    background: '#000000',
    tint: tintColorDark,
    tabIconDefault: '#636366',
    tabIconSelected: tintColorDark,
    card: '#1C1C1E',
    cardElevated: '#2C2C2E',
    border: '#38383A',
    borderSubtle: '#2C2C2E',
    secondaryBackground: '#1C1C1E',
    tertiaryBackground: '#2C2C2E',
    groupedBackground: '#000000',
    secondaryLabel: '#EBEBF5',
    success: '#30D158',
    successBackground: '#30D15820',
    warning: '#FF9F0A',
    warningBackground: '#FF9F0A20',
    error: '#FF453A',
    errorBackground: '#FF453A20',
    info: '#0A84FF',
    infoBackground: '#0A84FF20',
    // New modern additions
    overlay: 'rgba(0, 0, 0, 0.6)',
    glass: 'rgba(44, 44, 46, 0.85)',
    glassSubtle: 'rgba(44, 44, 46, 0.7)',
    shimmer: '#2C2C2E',
    accent: '#FF9F0A',
    accentSubtle: '#FF9F0A25',
    skeleton: '#2C2C2E',
    skeletonHighlight: '#3A3A3C',
  },
}

// Named exports for direct access
export const orange = tintColorLight
export const orangeDark = tintColorDark
