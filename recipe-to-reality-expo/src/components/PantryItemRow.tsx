import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { PantryItem } from '../types';
import { isExpired, isExpiringSoon } from '../utils/pantryMatching';
import { formatIngredient } from '../utils/quantity';
import Colors from '@/constants/Colors';

interface PantryItemRowProps {
  item: PantryItem;
  onDelete: () => void;
  onPress?: () => void;
}

/**
 * Matches SwiftUI PantryItemRow styling
 */
export default function PantryItemRow({ item, onDelete, onPress }: PantryItemRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const expired = isExpired(item);
  const expiringSoon = isExpiringSoon(item);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: colorScheme === 'dark' ? colors.card : '#fff' },
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <ThemedText style={[styles.name, expired && { color: colors.error }]}>
          {formatIngredient(item.name, item.quantity, item.unit)}
        </ThemedText>

        <View style={styles.metaRow}>
          {item.expirationDate && (
            <View style={styles.expirationContainer}>
              {expired ? (
                <View style={[styles.badge, { backgroundColor: colors.error + '26' }]}>
                  <Ionicons name="alert-circle" size={12} color={colors.error} />
                  <ThemedText style={[styles.badgeText, { color: colors.error }]}>
                    Expired
                  </ThemedText>
                </View>
              ) : expiringSoon ? (
                <View style={[styles.badge, { backgroundColor: colors.warning + '26' }]}>
                  <Ionicons name="time" size={12} color={colors.warning} />
                  <ThemedText style={[styles.badgeText, { color: colors.warning }]}>
                    {formatDate(item.expirationDate)}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.expirationText}>
                  Exp: {formatDate(item.expirationDate)}
                </ThemedText>
              )}
            </View>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expirationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expirationText: {
    fontSize: 13,
    color: '#8E8E93',
  },
});
