// iOS System Orange color matching SwiftUI .orange
const tintColorLight = '#FF9500';
const tintColorDark = '#FF9F0A';

export default {
  light: {
    text: '#000',
    background: '#F2F2F7', // iOS system background
    tint: tintColorLight,
    tabIconDefault: '#8E8E93', // iOS system gray
    tabIconSelected: tintColorLight,
    card: '#fff',
    border: '#C6C6C8', // iOS separator color
    secondaryBackground: '#F2F2F7',
    tertiaryBackground: '#fff',
    groupedBackground: '#F2F2F7',
    secondaryLabel: '#3C3C43', // with 60% opacity typically
    success: '#34C759', // iOS system green
    warning: '#FF9500', // iOS system orange
    error: '#FF3B30', // iOS system red
  },
  dark: {
    text: '#fff',
    background: '#000',
    tint: tintColorDark,
    tabIconDefault: '#636366',
    tabIconSelected: tintColorDark,
    card: '#1C1C1E',
    border: '#38383A',
    secondaryBackground: '#1C1C1E',
    tertiaryBackground: '#2C2C2E',
    groupedBackground: '#000',
    secondaryLabel: '#EBEBF5', // with 60% opacity typically
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
  },
};

// Named exports for direct access
export const orange = tintColorLight;
export const orangeDark = tintColorDark;
