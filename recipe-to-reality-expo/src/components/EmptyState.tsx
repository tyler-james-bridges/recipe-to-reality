import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText, ThemedView } from '@/components/Themed';
import Colors from '@/constants/Colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryMessage?: string;
}

/**
 * Matches SwiftUI ContentUnavailableView styling
 */
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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={56} color="#C7C7CC" />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
      {secondaryMessage && (
        <ThemedText style={[styles.secondaryMessage, { color: colors.tint }]}>
          {secondaryMessage}
        </ThemedText>
      )}
      {actionLabel && onAction && (
        <Pressable
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={onAction}
        >
          <ThemedText style={styles.buttonText}>{actionLabel}</ThemedText>
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  secondaryMessage: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
