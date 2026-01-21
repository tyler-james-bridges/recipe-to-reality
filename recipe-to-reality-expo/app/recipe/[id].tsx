import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Pressable,
  Share,
  Alert,
  Linking,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { scaleQuantity, formatIngredient } from '@/src/utils/quantity';
import { RecipeWithIngredients, Ingredient } from '@/src/types';
import Colors from '@/constants/Colors';

const SERVING_PRESETS = [2, 4, 6, 8];

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { getRecipe, toggleQueue, markAsCooked, deleteRecipe, loadRecipes } = useRecipeStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const [recipe, setRecipe] = useState<RecipeWithIngredients | undefined>();
  const [selectedServings, setSelectedServings] = useState(4);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  useEffect(() => {
    loadRecipes().then(() => {
      const found = getRecipe(id);
      setRecipe(found);
      if (found?.servings) {
        setSelectedServings(found.servings);
      }
    });
  }, [id, getRecipe, loadRecipes]);

  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'success' | 'selection' | 'warning') => {
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
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
    triggerHaptic('medium');
    await toggleQueue(recipe.id);
    setRecipe({ ...recipe, isInQueue: !recipe.isInQueue });
    if (!recipe.isInQueue) {
      triggerHaptic('success');
    }
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

  const handleCopyIngredients = async () => {
    triggerHaptic('success');
    const ingredientsList = recipe.ingredients
      .map((ing) => scaleIngredient(ing))
      .join('\n');
    const header = `Ingredients for ${recipe.title} (${selectedServings} servings):\n\n`;
    await Clipboard.setStringAsync(header + ingredientsList);

    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  };

  const handleOpenSource = () => {
    if (recipe.sourceURL) {
      Linking.openURL(recipe.sourceURL);
    }
  };

  const scaleIngredient = (ingredient: Ingredient): string => {
    const originalServings = recipe.servings;
    if (!originalServings || originalServings <= 0 || selectedServings === originalServings) {
      return formatIngredient(ingredient.name, ingredient.quantity, ingredient.unit);
    }

    const scale = selectedServings / originalServings;
    const scaledQuantity = ingredient.quantity
      ? scaleQuantity(ingredient.quantity, scale)
      : null;

    return formatIngredient(ingredient.name, scaledQuantity, ingredient.unit);
  };

  const sourceIcon = React.useMemo(() => {
    switch (recipe.sourceType) {
      case 'youtube':
        return 'play-circle';
      case 'tiktok':
        return 'musical-notes';
      case 'instagram':
        return 'camera';
      default:
        return 'link';
    }
  }, [recipe.sourceType]);

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerTransparent: true,
          headerRight: () => (
            <Pressable
              onPress={() => {
                // Show action menu
                Alert.alert(
                  recipe.title,
                  undefined,
                  [
                    {
                      text: recipe.isInQueue ? 'Remove from Queue' : 'Add to Queue',
                      onPress: handleToggleQueue,
                    },
                    { text: 'Mark as Cooked', onPress: handleMarkAsCooked },
                    { text: 'Copy Ingredients', onPress: handleCopyIngredients },
                    { text: 'Share', onPress: handleShare },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
              style={styles.headerButton}
            >
              <View style={styles.headerButtonBackground}>
                <Ionicons name="ellipsis-horizontal-circle" size={28} color={colors.tint} />
              </View>
            </Pressable>
          ),
        }}
      />

      {/* Copied Toast */}
      {showCopiedToast && (
        <View style={styles.toastContainer}>
          <View style={[styles.toast, { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#fff' }]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <ThemedText style={styles.toastText}>Ingredients copied to clipboard</ThemedText>
          </View>
        </View>
      )}

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header Image */}
        {recipe.imageURL ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: recipe.imageURL }} style={styles.image} contentFit="cover" />
          </View>
        ) : (
          <LinearGradient
            colors={[colors.tint + '4D', colors.tint + '1A']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.placeholderImage}
          >
            <Ionicons name="restaurant" size={60} color={colors.tint + '80'} />
          </LinearGradient>
        )}

        {/* Title Section */}
        <View style={styles.section}>
          <ThemedText style={styles.title}>{recipe.title}</ThemedText>

          <View style={styles.metaRow}>
            {recipe.servings && (
              <View style={styles.metaItem}>
                <Ionicons name="people" size={16} color="#8E8E93" />
                <ThemedText style={styles.metaText}>{recipe.servings} servings</ThemedText>
              </View>
            )}
            {recipe.prepTime && (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color="#8E8E93" />
                <ThemedText style={styles.metaText}>{recipe.prepTime}</ThemedText>
              </View>
            )}
            {recipe.cookTime && (
              <View style={styles.metaItem}>
                <Ionicons name="flame" size={16} color="#8E8E93" />
                <ThemedText style={styles.metaText}>{recipe.cookTime}</ThemedText>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <Pressable
            style={[
              styles.actionButton,
              recipe.isInQueue && { backgroundColor: colors.tint },
              !recipe.isInQueue && { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA' },
            ]}
            onPress={handleToggleQueue}
          >
            <Ionicons
              name={recipe.isInQueue ? 'checkmark-circle' : 'add-circle-outline'}
              size={20}
              color={recipe.isInQueue ? '#fff' : colors.text}
            />
            <ThemedText
              style={[
                styles.actionButtonText,
                recipe.isInQueue && { color: '#fff' },
              ]}
            >
              {recipe.isInQueue ? 'In Queue' : 'Add to Queue'}
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.tint }]}
            onPress={() => router.push({ pathname: '/grocery/add-from-recipe', params: { recipeId: recipe.id } })}
          >
            <Ionicons name="cart" size={20} color="#fff" />
            <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
              Add to List
            </ThemedText>
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Ingredients Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>
            <Pressable onPress={handleCopyIngredients}>
              <Ionicons name="copy-outline" size={20} color="#8E8E93" />
            </Pressable>
          </View>

          {/* Serving Presets */}
          {recipe.servings && (
            <View style={styles.servingPresets}>
              <View style={styles.presetButtons}>
                {SERVING_PRESETS.map((preset) => (
                  <Pressable
                    key={preset}
                    style={[
                      styles.presetButton,
                      selectedServings === preset && { backgroundColor: colors.tint },
                      selectedServings !== preset && { backgroundColor: colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA' },
                    ]}
                    onPress={() => {
                      triggerHaptic('selection');
                      setSelectedServings(preset);
                    }}
                  >
                    <ThemedText
                      style={[
                        styles.presetText,
                        selectedServings === preset && { color: '#fff' },
                      ]}
                    >
                      {preset}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>

              <View style={styles.servingAdjuster}>
                <Pressable
                  style={styles.adjustButton}
                  onPress={() => {
                    if (selectedServings > 1) {
                      triggerHaptic('selection');
                      setSelectedServings(selectedServings - 1);
                    }
                  }}
                  disabled={selectedServings <= 1}
                >
                  <Ionicons
                    name="remove-circle"
                    size={28}
                    color={selectedServings <= 1 ? '#C7C7CC' : colors.tint}
                  />
                </Pressable>
                <ThemedText style={styles.servingCount}>{selectedServings}</ThemedText>
                <Pressable
                  style={styles.adjustButton}
                  onPress={() => {
                    triggerHaptic('selection');
                    setSelectedServings(selectedServings + 1);
                  }}
                >
                  <Ionicons name="add-circle" size={28} color={colors.tint} />
                </Pressable>
              </View>
            </View>
          )}

          {selectedServings !== recipe.servings && recipe.servings && (
            <ThemedText style={styles.scaledNote}>
              Scaled from {recipe.servings} servings
            </ThemedText>
          )}

          {/* Ingredient List */}
          {recipe.ingredients.map((ingredient, index) => (
            <View key={ingredient.id || index} style={styles.ingredientRow}>
              <View style={[styles.ingredientBullet, { backgroundColor: colors.tint }]} />
              <ThemedText style={styles.ingredientText}>
                {scaleIngredient(ingredient)}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Instructions Section */}
        {instructions.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>

            {instructions.map((step, index) => (
              <View key={index} style={styles.instructionRow}>
                <View style={[styles.stepNumber, { backgroundColor: colors.tint }]}>
                  <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                </View>
                <ThemedText style={styles.instructionText}>{step}</ThemedText>
              </View>
            ))}
          </View>
        )}

        {/* Source Section */}
        {recipe.sourceURL && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Source</ThemedText>

              <Pressable
                style={[styles.sourceLink, { backgroundColor: colors.tint + '1A' }]}
                onPress={handleOpenSource}
              >
                <Ionicons name={sourceIcon as any} size={18} color={colors.tint} />
                <ThemedText style={[styles.sourceLinkText, { color: colors.tint }]} numberOfLines={1}>
                  {new URL(recipe.sourceURL).hostname}
                </ThemedText>
                <Ionicons name="arrow-up-circle-outline" size={18} color={colors.tint} />
              </Pressable>
            </View>
          </>
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
  headerButton: {
    padding: 4,
  },
  headerButtonBackground: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 2,
  },
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  toastText: {
    fontSize: 15,
    fontWeight: '500',
  },
  imageContainer: {
    width: '100%',
    height: 250,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  servingPresets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    width: 40,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetText: {
    fontSize: 15,
    fontWeight: '500',
  },
  servingAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  adjustButton: {
    padding: 4,
  },
  servingCount: {
    fontSize: 15,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  scaledNote: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 12,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  instructionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  sourceLinkText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});
