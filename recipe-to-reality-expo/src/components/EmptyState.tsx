import React, { useEffect } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ThemedText, ThemedView } from '@/components/Themed';
import Colors, { radius, spacing, typography } from '@/constants/Colors';
import ModernButton from './ui/ModernButton';
import { Icon, IconProps } from './ui/Icon';

type IconName = IconProps['name'];

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryMessage?: string;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryMessage,
}: EmptyStateProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const iconProgress = useSharedValue(0);
  const contentProgress = useSharedValue(0);
  const buttonProgress = useSharedValue(0);

  useEffect(() => {
    iconProgress.value = withSpring(1, { damping: 12, stiffness: 80 });
    contentProgress.value = withDelay(150, withSpring(1, { damping: 15, stiffness: 100 }));
    buttonProgress.value = withDelay(300, withSpring(1, { damping: 15, stiffness: 100 }));
  }, []);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(iconProgress.value, [0, 1], [0.5, 1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(iconProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(contentProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(contentProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(buttonProgress.value, [0, 1], [20, 0], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(buttonProgress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <ThemedView style={styles.container}>
      {/* Animated Icon with Gradient Background */}
      <Animated.View style={[styles.iconWrapper, iconAnimatedStyle]}>
        <LinearGradient
          colors={[colors.accentSubtle, colors.tint + '15']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconBackground}
        >
          <Icon name={icon} size={48} color={colors.tint} />
        </LinearGradient>
      </Animated.View>

      {/* Text Content */}
      <Animated.View style={[styles.textContent, contentAnimatedStyle]}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={[styles.message, { color: colors.textTertiary }]}>
          {message}
        </ThemedText>
        {secondaryMessage && (
          <ThemedText style={[styles.secondaryMessage, { color: colors.tint }]}>
            {secondaryMessage}
          </ThemedText>
        )}
      </Animated.View>

      {/* Action Button */}
      {actionLabel && onAction && (
        <Animated.View style={[styles.buttonWrapper, buttonAnimatedStyle]}>
          <ModernButton
            title={actionLabel}
            onPress={onAction}
            variant="primary"
            size="large"
            icon="add"
          />
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['3xl'],
  },
  iconWrapper: {
    marginBottom: spacing['2xl'],
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: radius['2xl'],
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  title: {
    ...typography.titleLarge,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.bodyMedium,
    textAlign: 'center',
    lineHeight: 22,
  },
  secondaryMessage: {
    ...typography.labelMedium,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  buttonWrapper: {
    marginTop: spacing['2xl'],
  },
});
