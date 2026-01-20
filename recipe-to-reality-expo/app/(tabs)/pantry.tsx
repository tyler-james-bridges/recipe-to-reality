import React, { useCallback, useState } from 'react';
import { StyleSheet, FlatList, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { ThemedView, ThemedText } from '@/components/Themed';
import { usePantryStore } from '@/src/stores/pantryStore';
import { PantryItem, INGREDIENT_CATEGORIES, IngredientCategory } from '@/src/types';
import PantryItemRow from '@/src/components/PantryItemRow';
import EmptyState from '@/src/components/EmptyState';
import SearchBar from '@/src/components/SearchBar';

export default function PantryScreen() {
  const { items, loadItems, deleteItem } = usePantryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<IngredientCategory | 'All'>('All');

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, [loadItems])
  );

  const filteredItems = React.useMemo(() => {
    let result = items;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => item.name.toLowerCase().includes(query));
    }

    if (selectedCategory !== 'All') {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Sort by expiration date (soonest first), then by name
    return [...result].sort((a, b) => {
      if (a.expirationDate && b.expirationDate) {
        return a.expirationDate - b.expirationDate;
      }
      if (a.expirationDate) return -1;
      if (b.expirationDate) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [items, searchQuery, selectedCategory]);

  const expiringSoonCount = items.filter((item) => {
    if (!item.expirationDate) return false;
    const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000;
    return item.expirationDate <= threeDaysFromNow && item.expirationDate > Date.now();
  }).length;

  const renderItem = ({ item }: { item: PantryItem }) => (
    <PantryItemRow item={item} onDelete={() => deleteItem(item.id)} />
  );

  const categories: (IngredientCategory | 'All')[] = ['All', ...INGREDIENT_CATEGORIES];

  return (
    <ThemedView style={styles.container}>
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search pantry..."
      />

      {expiringSoonCount > 0 && (
        <View style={styles.warningBanner}>
          <MaterialCommunityIcons name="alert" size={20} color="#f59e0b" />
          <ThemedText style={styles.warningText}>
            {expiringSoonCount} item{expiringSoonCount > 1 ? 's' : ''} expiring soon
          </ThemedText>
        </View>
      )}

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={styles.categoryList}
        contentContainerStyle={styles.categoryContent}
        renderItem={({ item: category }) => (
          <Pressable
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <ThemedText
              style={[
                styles.categoryText,
                selectedCategory === category && styles.categoryTextActive,
              ]}
            >
              {category}
            </ThemedText>
          </Pressable>
        )}
      />

      {filteredItems.length === 0 ? (
        <EmptyState
          icon="fridge-outline"
          title="Pantry is empty"
          message="Add items to track what you have"
          actionLabel="Add Item"
          onAction={() => router.push('/pantry/add')}
        />
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={styles.fabContainer}>
        <Pressable style={styles.fabSecondary} onPress={() => router.push('/what-can-i-make')}>
          <MaterialCommunityIcons name="chef-hat" size={24} color="#FF6B35" />
        </Pressable>
        <Pressable style={styles.fab} onPress={() => router.push('/pantry/add')}>
          <MaterialCommunityIcons name="plus" size={28} color="#fff" />
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    gap: 8,
  },
  warningText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryList: {
    maxHeight: 48,
    marginVertical: 8,
  },
  categoryContent: {
    gap: 8,
    paddingRight: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#fff',
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
