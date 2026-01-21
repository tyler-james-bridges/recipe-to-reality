import React from 'react';
import { StyleSheet, View, Pressable, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/Themed';
import { RecipeWithIngredients } from '../types';
import Colors from '@/constants/Colors';

interface RecipeRowProps {
  recipe: RecipeWithIngredients;
  onPress: () => void;
  pantryMatchPercentage?: number;
}

export default function RecipeRow({ recipe, onPress, pantryMatchPercentage }: RecipeRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const sourceIcon = React.useMemo(() => {
    switch (recipe.sourceType) {
      case 'youtube':
        return { name: 'play-circle' as const, color: '#FF0000' };
      case 'tiktok':
        return { name: 'musical-notes' as const, color: colors.text };
      case 'instagram':
        return { name: 'camera' as const, color: '#833AB4' };
      case 'url':
        return { name: 'link' as const, color: '#007AFF' };
      case 'video':
        return { name: 'videocam' as const, color: '#007AFF' };
      default:
        return { name: 'pencil' as const, color: '#8E8E93' };
    }
  }, [recipe.sourceType, colors.text]);

  // Pantry match badge color
  const getPantryMatchColor = (percentage: number) => {
    if (percentage >= 70) return colors.success;
    if (percentage >= 40) return colors.tint;
    return '#8E8E93';
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
      onPress={onPress}
    >
      {/* Thumbnail - 60x60 matching SwiftUI */}
      {recipe.imageURL ? (
        <Image
          source={{ uri: recipe.imageURL }}
          style={styles.image}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA' }]}>
          <Ionicons name="restaurant" size={24} color="#8E8E93" />
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        <ThemedText style={styles.title} numberOfLines={2}>
          {recipe.title}
        </ThemedText>

        <View style={styles.metaRow}>
          {recipe.servings && (
            <View style={styles.metaItem}>
              <Ionicons name="people" size={12} color="#8E8E93" />
              <ThemedText style={styles.metaText}>{recipe.servings}</ThemedText>
            </View>
          )}

          {recipe.cookTime && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color="#8E8E93" />
              <ThemedText style={styles.metaText}>{recipe.cookTime}</ThemedText>
            </View>
          )}

          <Ionicons name={sourceIcon.name} size={12} color={sourceIcon.color} />
        </View>
      </View>

      {/* Right side indicators */}
      <View style={styles.rightContent}>
        {/* Pantry match badge */}
        {pantryMatchPercentage !== undefined && pantryMatchPercentage > 0 && (
          <View style={[
            styles.pantryBadge,
            { backgroundColor: getPantryMatchColor(pantryMatchPercentage) + '26' }
          ]}>
            <Ionicons
              name="snow-outline"
              size={10}
              color={getPantryMatchColor(pantryMatchPercentage)}
            />
            <ThemedText style={[
              styles.pantryText,
              { color: getPantryMatchColor(pantryMatchPercentage) }
            ]}>
              {Math.round(pantryMatchPercentage)}%
            </ThemedText>
          </View>
        )}

        {/* Queue indicator */}
        {recipe.isInQueue && (
          <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pantryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 2,
  },
  pantryText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
