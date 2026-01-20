import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { RecipeWithIngredients } from '../types';

interface RecipeRowProps {
  recipe: RecipeWithIngredients;
  onPress: () => void;
}

export default function RecipeRow({ recipe, onPress }: RecipeRowProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const sourceIcon = React.useMemo(() => {
    switch (recipe.sourceType) {
      case 'youtube':
        return 'youtube';
      case 'tiktok':
        return 'music-note';
      case 'instagram':
        return 'instagram';
      case 'url':
        return 'web';
      default:
        return 'pencil';
    }
  }, [recipe.sourceType]);

  return (
    <Pressable
      style={[styles.container, { backgroundColor: isDark ? '#1f1f1f' : '#fff' }]}
      onPress={onPress}
    >
      {recipe.imageURL ? (
        <Image
          source={{ uri: recipe.imageURL }}
          style={styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
          <MaterialCommunityIcons name="food" size={24} color="#999" />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.header}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {recipe.title}
          </ThemedText>
          {recipe.isInQueue && (
            <View style={styles.queueBadge}>
              <MaterialCommunityIcons name="playlist-check" size={14} color="#FF6B35" />
            </View>
          )}
        </View>

        <View style={styles.meta}>
          <MaterialCommunityIcons name={sourceIcon} size={14} color="#999" />
          {recipe.servings && (
            <>
              <View style={styles.dot} />
              <ThemedText style={styles.metaText}>{recipe.servings} servings</ThemedText>
            </>
          )}
          {recipe.prepTime && (
            <>
              <View style={styles.dot} />
              <ThemedText style={styles.metaText}>{recipe.prepTime}</ThemedText>
            </>
          )}
        </View>

        <ThemedText style={styles.ingredientCount}>
          {recipe.ingredients.length} ingredients
        </ThemedText>
      </View>

      <MaterialCommunityIcons name="chevron-right" size={24} color="#ccc" />
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
  image: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  queueBadge: {
    marginLeft: 8,
    backgroundColor: '#FFF5F0',
    padding: 4,
    borderRadius: 4,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ccc',
    marginHorizontal: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
  ingredientCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});
