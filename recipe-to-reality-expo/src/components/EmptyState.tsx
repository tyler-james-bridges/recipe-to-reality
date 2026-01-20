import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText, ThemedView } from '@/components/Themed';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon,
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons name={icon} size={64} color="#d4d4d4" />
      </View>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <ThemedText style={styles.message}>{message}</ThemedText>
      {actionLabel && onAction && (
        <Pressable style={styles.button} onPress={onAction}>
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
