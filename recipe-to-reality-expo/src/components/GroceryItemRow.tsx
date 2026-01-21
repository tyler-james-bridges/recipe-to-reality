import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { GroceryItem } from '../types';
import { formatIngredient } from '../utils/quantity';
import Colors from '@/constants/Colors';

interface GroceryItemRowProps {
  item: GroceryItem;
  onToggle: () => void;
  onDelete: () => void;
}

/**
 * Matches SwiftUI GroceryItemRow styling
 */
export default function GroceryItemRow({ item, onToggle, onDelete }: GroceryItemRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: colorScheme === 'dark' ? colors.card : '#fff' },
      ]}
      onPress={onToggle}
    >
      <Pressable onPress={onToggle} style={styles.checkbox}>
        <Ionicons
          name={item.isChecked ? 'checkmark-circle' : 'ellipse-outline'}
          size={24}
          color={item.isChecked ? colors.success : '#C7C7CC'}
        />
      </Pressable>

      <View style={styles.content}>
        <ThemedText
          style={[
            styles.name,
            item.isChecked && styles.checkedText,
          ]}
          numberOfLines={1}
        >
          {formatIngredient(item.name, item.quantity, item.unit)}
        </ThemedText>

        {item.sourceRecipeIds && item.sourceRecipeIds.length > 1 && (
          <ThemedText style={styles.sourceCount}>
            From {item.sourceRecipeIds.length} recipes
          </ThemedText>
        )}
      </View>
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
  checkbox: {
    marginRight: 12,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#8E8E93',
  },
  sourceCount: {
    fontSize: 11,
    color: '#8E8E93',
  },
});
