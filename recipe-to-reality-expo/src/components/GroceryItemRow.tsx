import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { GroceryItem } from '../types';
import { formatIngredient } from '../utils/quantity';

interface GroceryItemRowProps {
  item: GroceryItem;
  onToggle: () => void;
  onDelete: () => void;
}

export default function GroceryItemRow({ item, onToggle, onDelete }: GroceryItemRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Pressable
      style={[
        styles.container,
        { backgroundColor: isDark ? '#1f1f1f' : '#fff' },
        item.isChecked && styles.checkedContainer,
      ]}
      onPress={onToggle}
    >
      <View style={styles.checkbox}>
        <MaterialCommunityIcons
          name={item.isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={item.isChecked ? '#22c55e' : '#ccc'}
        />
      </View>

      <View style={styles.content}>
        <ThemedText
          style={[styles.name, item.isChecked && styles.checkedText]}
          numberOfLines={1}
        >
          {formatIngredient(item.name, item.quantity, item.unit)}
        </ThemedText>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={styles.deleteButton}
      >
        <MaterialCommunityIcons name="close" size={18} color="#999" />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  checkedContainer: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  deleteButton: {
    padding: 8,
    marginRight: -8,
  },
});
