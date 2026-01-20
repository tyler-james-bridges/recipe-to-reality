import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { PantryItem } from '../types';
import { isExpired, isExpiringSoon } from '../utils/pantryMatching';
import { formatIngredient } from '../utils/quantity';

interface PantryItemRowProps {
  item: PantryItem;
  onDelete: () => void;
  onPress?: () => void;
}

export default function PantryItemRow({ item, onDelete, onPress }: PantryItemRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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
        { backgroundColor: isDark ? '#1f1f1f' : '#fff' },
        expired && styles.expiredContainer,
      ]}
      onPress={onPress}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={[styles.name, expired && styles.expiredText]}>
            {formatIngredient(item.name, item.quantity, item.unit)}
          </ThemedText>
          {expired && (
            <View style={styles.expiredBadge}>
              <MaterialCommunityIcons name="alert-circle" size={12} color="#ef4444" />
              <ThemedText style={styles.expiredBadgeText}>Expired</ThemedText>
            </View>
          )}
          {expiringSoon && !expired && (
            <View style={styles.expiringSoonBadge}>
              <MaterialCommunityIcons name="clock-alert" size={12} color="#f59e0b" />
              <ThemedText style={styles.expiringSoonBadgeText}>Expiring soon</ThemedText>
            </View>
          )}
        </View>

        <View style={styles.meta}>
          <View style={[styles.categoryBadge, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
            <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
          </View>
          {item.expirationDate && (
            <ThemedText style={[styles.expirationText, expired && styles.expiredText]}>
              Exp: {formatDate(item.expirationDate)}
            </ThemedText>
          )}
        </View>
      </View>

      <Pressable onPress={onDelete} style={styles.deleteButton}>
        <MaterialCommunityIcons name="delete-outline" size={22} color="#999" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  expiredContainer: {
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
  },
  expiredText: {
    color: '#ef4444',
  },
  expiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  expiredBadgeText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
  expiringSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  expiringSoonBadgeText: {
    fontSize: 11,
    color: '#92400e',
    fontWeight: '500',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    color: '#666',
  },
  expirationText: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    padding: 8,
  },
});
