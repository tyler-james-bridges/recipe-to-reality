import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  Share,
  Alert,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { scaleQuantity, formatIngredient } from '@/src/utils/quantity';
import { RecipeWithIngredients, Ingredient } from '@/src/types';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getRecipe, toggleQueue, markAsCooked, deleteRecipe, loadRecipes } = useRecipeStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const [recipe, setRecipe] = useState<RecipeWithIngredients | undefined>();
  const [servingMultiplier, setServingMultiplier] = useState(1);

  useEffect(() => {
    loadRecipes().then(() => {
      const found = getRecipe(id);
      setRecipe(found);
    });
  }, [id, getRecipe, loadRecipes]);

  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'success') => {
      if (!hapticFeedback) return;
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
      }
    },
    [hapticFeedback]
  );

  if (!recipe) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  const instructions: string[] = (() => {
    try {
      return typeof recipe.instructions === 'string'
        ? JSON.parse(recipe.instructions)
        : recipe.instructions || [];
    } catch {
      return [];
    }
  })();

  const handleToggleQueue = async () => {
    triggerHaptic('light');
    await toggleQueue(recipe.id);
    setRecipe({ ...recipe, isInQueue: !recipe.isInQueue });
  };

  const handleMarkAsCooked = async () => {
    triggerHaptic('success');
    await markAsCooked(recipe.id);
    setRecipe({ ...recipe, dateCooked: Date.now() });
  };

  const handleDelete = () => {
    Alert.alert('Delete Recipe', 'Are you sure you want to delete this recipe?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteRecipe(recipe.id);
          router.back();
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this recipe: ${recipe.title}${recipe.sourceURL ? `\n${recipe.sourceURL}` : ''}`,
      });
    } catch {
      // Ignore share errors
    }
  };

  const handleOpenSource = () => {
    if (recipe.sourceURL) {
      Linking.openURL(recipe.sourceURL);
    }
  };

  const adjustServings = (delta: number) => {
    triggerHaptic('light');
    const newMultiplier = Math.max(0.5, servingMultiplier + delta * 0.5);
    setServingMultiplier(newMultiplier);
  };

  const scaledServings = recipe.servings
    ? Math.round(recipe.servings * servingMultiplier)
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: recipe.title,
          headerRight: () => (
            <View style={styles.headerButtons}>
              <Pressable onPress={handleShare} style={styles.headerButton}>
                <MaterialCommunityIcons name="share-variant" size={22} color="#FF6B35" />
              </Pressable>
              <Pressable onPress={handleDelete} style={styles.headerButton}>
                <MaterialCommunityIcons name="delete-outline" size={22} color="#ef4444" />
              </Pressable>
            </View>
          ),
        }}
      />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {recipe.imageURL && (
          <Image source={{ uri: recipe.imageURL }} style={styles.image} contentFit="cover" />
        )}

        <View style={styles.section}>
          <ThemedText style={styles.title}>{recipe.title}</ThemedText>

          <View style={styles.metaRow}>
            {recipe.prepTime && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
                <ThemedText style={styles.metaText}>Prep: {recipe.prepTime}</ThemedText>
              </View>
            )}
            {recipe.cookTime && (
              <View style={styles.metaItem}>
                <MaterialCommunityIcons name="fire" size={16} color="#666" />
                <ThemedText style={styles.metaText}>Cook: {recipe.cookTime}</ThemedText>
              </View>
            )}
          </View>

          {recipe.sourceURL && (
            <Pressable style={styles.sourceLink} onPress={handleOpenSource}>
              <MaterialCommunityIcons name="link-variant" size={16} color="#FF6B35" />
              <ThemedText style={styles.sourceLinkText}>View Original</ThemedText>
            </Pressable>
          )}
        </View>

        <View style={styles.actionRow}>
          <Pressable
            style={[styles.actionButton, recipe.isInQueue && styles.actionButtonActive]}
            onPress={handleToggleQueue}
          >
            <MaterialCommunityIcons
              name={recipe.isInQueue ? 'playlist-check' : 'playlist-plus'}
              size={20}
              color={recipe.isInQueue ? '#fff' : '#FF6B35'}
            />
            <ThemedText
              style={[styles.actionText, recipe.isInQueue && styles.actionTextActive]}
            >
              {recipe.isInQueue ? 'In Queue' : 'Add to Queue'}
            </ThemedText>
          </Pressable>

          <Pressable style={styles.actionButton} onPress={handleMarkAsCooked}>
            <MaterialCommunityIcons name="check-circle-outline" size={20} color="#22c55e" />
            <ThemedText style={styles.actionText}>Mark Cooked</ThemedText>
          </Pressable>
        </View>

        {/* Ingredients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>

            {recipe.servings && (
              <View style={styles.servingAdjuster}>
                <Pressable onPress={() => adjustServings(-1)} style={styles.servingButton}>
                  <MaterialCommunityIcons name="minus" size={18} color="#666" />
                </Pressable>
                <ThemedText style={styles.servingText}>
                  {scaledServings} servings
                </ThemedText>
                <Pressable onPress={() => adjustServings(1)} style={styles.servingButton}>
                  <MaterialCommunityIcons name="plus" size={18} color="#666" />
                </Pressable>
              </View>
            )}
          </View>

          {recipe.ingredients.map((ingredient, index) => (
            <View key={ingredient.id || index} style={styles.ingredientRow}>
              <View style={styles.ingredientBullet} />
              <ThemedText style={styles.ingredientText}>
                {formatIngredient(
                  ingredient.name,
                  ingredient.quantity
                    ? scaleQuantity(ingredient.quantity, servingMultiplier)
                    : null,
                  ingredient.unit
                )}
                {ingredient.isOptional && (
                  <ThemedText style={styles.optionalText}> (optional)</ThemedText>
                )}
              </ThemedText>
            </View>
          ))}
        </View>

        {/* Instructions Section */}
        {instructions.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>

            {instructions.map((step, index) => (
              <View key={index} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                </View>
                <ThemedText style={styles.instructionText}>{step}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Notes Section */}
        {recipe.notes && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Notes</ThemedText>
            <ThemedText style={styles.notesText}>{recipe.notes}</ThemedText>
          </View>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingBottom: 40,
  },
  image: {
    width: '100%',
    height: 240,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: '#666',
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  sourceLinkText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  actionButtonActive: {
    backgroundColor: '#FF6B35',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  actionTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  servingAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  servingButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  servingText: {
    fontSize: 14,
    color: '#666',
    minWidth: 80,
    textAlign: 'center',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  ingredientBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginTop: 6,
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  optionalText: {
    color: '#999',
    fontStyle: 'italic',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  bottomPadding: {
    height: 40,
  },
});
