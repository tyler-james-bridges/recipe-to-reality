import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable, SectionList } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useGroceryStore } from '@/src/stores/groceryStore';
import { GroceryItem, IngredientCategory, INGREDIENT_CATEGORIES } from '@/src/types';
import GroceryItemRow from '@/src/components/GroceryItemRow';
import EmptyState from '@/src/components/EmptyState';

export default function GroceryScreen() {
  const { currentList, loadCurrentList, toggleItem, deleteItem, clearChecked } = useGroceryStore();

  useFocusEffect(
    useCallback(() => {
      loadCurrentList();
    }, [loadCurrentList])
  );

  const items = currentList?.items || [];
  const checkedCount = items.filter((i) => i.isChecked).length;
  const progress = items.length > 0 ? checkedCount / items.length : 0;

  // Group items by category
  const sections = React.useMemo(() => {
    const grouped: Record<string, GroceryItem[]> = {};

    items.forEach((item) => {
      const category = item.category || 'Other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    // Sort categories by the order in INGREDIENT_CATEGORIES
    return INGREDIENT_CATEGORIES.filter((cat) => grouped[cat]?.length > 0).map((category) => ({
      title: category,
      data: grouped[category].sort((a, b) => {
        // Unchecked items first
        if (a.isChecked !== b.isChecked) {
          return a.isChecked ? 1 : -1;
        }
        return a.name.localeCompare(b.name);
      }),
    }));
  }, [items]);

  const renderItem = ({ item }: { item: GroceryItem }) => (
    <GroceryItemRow
      item={item}
      onToggle={() => toggleItem(item.id)}
      onDelete={() => deleteItem(item.id)}
    />
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      {items.length > 0 && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <ThemedText style={styles.progressText}>
              {checkedCount} of {items.length} items
            </ThemedText>
            {checkedCount > 0 && (
              <Pressable onPress={clearChecked}>
                <ThemedText style={styles.clearText}>Clear checked</ThemedText>
              </Pressable>
            )}
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </View>
      )}

      {items.length === 0 ? (
        <EmptyState
          icon="cart-outline"
          title="Grocery list is empty"
          message="Generate a list from your recipes or add items manually"
          actionLabel="Generate List"
          onAction={() => router.push('/grocery/generate')}
        />
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}

      <View style={styles.fabContainer}>
        <Pressable style={styles.fabSecondary} onPress={() => router.push('/grocery/generate')}>
          <MaterialCommunityIcons name="auto-fix" size={24} color="#FF6B35" />
        </Pressable>
        <Pressable style={styles.fab} onPress={() => router.push('/grocery/add')}>
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    borderRadius: 3,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    paddingBottom: 100,
  },
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    gap: 12,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});
