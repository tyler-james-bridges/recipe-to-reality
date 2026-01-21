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
  Dimensions,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack, Href } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeInDown,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { scaleQuantity, formatIngredient } from '@/src/utils/quantity';
import { RecipeWithIngredients, Ingredient } from '@/src/types';
import Colors, { shadows, radius, spacing, typography, gradients } from '@/constants/Colors';
import AnimatedPressable from '@/src/components/ui/AnimatedPressable';
import ModernButton from '@/src/components/ui/ModernButton';
import Badge from '@/src/components/ui/Badge';
import SkeletonLoader from '@/src/components/ui/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_IMAGE_HEIGHT = 280;
const SERVING_PRESETS = [2, 4, 6, 8];

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const themeGradients = gradients[colorScheme ?? 'light'];
  const { getRecipe, toggleQueue, markAsCooked, deleteRecipe, loadRecipes } = useRecipeStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const [recipe, setRecipe] = useState<RecipeWithIngredients | undefined>();
  const [selectedServings, setSelectedServings] = useState(4);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(0);

  useEffect(() => {
    setIsLoading(true);
    loadRecipes().then(() => {
      const found = getRecipe(id);
      setRecipe(found);
      if (found?.servings) {
        setSelectedServings(found.servings);
      }
      setIsLoading(false);
      headerOpacity.value = withDelay(200, withSpring(1));
    });
  }, [id, getRecipe, loadRecipes]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, HEADER_IMAGE_HEIGHT - 100],
      [0, 1],
      Extrapolation.CLAMP
    ),
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-100, 0, HEADER_IMAGE_HEIGHT],
          [-50, 0, HEADER_IMAGE_HEIGHT * 0.5],
          Extrapolation.CLAMP
        ),
      },
      {
        scale: interpolate(
          scrollY.value,
          [-100, 0],
          [1.3, 1],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

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

  if (isLoading || !recipe) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <SkeletonLoader width={SCREEN_WIDTH} height={HEADER_IMAGE_HEIGHT} borderRadius={0} />
        <View style={styles.loadingContent}>
          <SkeletonLoader width="80%" height={28} style={{ marginBottom: spacing.md }} />
          <SkeletonLoader width="50%" height={18} style={{ marginBottom: spacing['2xl'] }} />
          <SkeletonLoader width="100%" height={48} style={{ marginBottom: spacing.md }} />
          <SkeletonLoader width="100%" height={48} />
        </View>
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
          headerBlurEffect: colorScheme === 'dark' ? 'dark' : 'light',
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
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
                    { text: 'Delete', style: 'destructive', onPress: handleDelete },
                    { text: 'Cancel', style: 'cancel' },
                  ]
                );
              }}
              hapticType="selection"
              style={styles.headerButton}
            >
              <View style={[styles.headerButtonBackground, { backgroundColor: colors.glass }]}>
                <Ionicons name="ellipsis-horizontal-circle" size={26} color={colors.tint} />
              </View>
            </AnimatedPressable>
          ),
        }}
      />

      {/* Copied Toast */}
      {showCopiedToast && (
        <Animated.View
          entering={FadeIn.duration(200)}
          style={styles.toastContainer}
        >
          <View style={[styles.toast, { backgroundColor: colors.card }, shadows.medium]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <ThemedText style={styles.toastText}>Ingredients copied</ThemedText>
          </View>
        </Animated.View>
      )}

      <AnimatedScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Image with Parallax */}
        <View style={styles.imageContainer}>
          {recipe.imageURL ? (
            <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
              <Image
                source={{ uri: recipe.imageURL }}
                style={styles.image}
                contentFit="cover"
                transition={300}
              />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                style={styles.imageGradient}
              />
            </Animated.View>
          ) : (
            <LinearGradient
              colors={themeGradients.hero}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.placeholderImage}
            >
              <Ionicons name="restaurant" size={64} color={colors.tint} />
            </LinearGradient>
          )}
        </View>

        {/* Content Card */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(400)}
          style={[styles.contentCard, { backgroundColor: colors.card }]}
        >
          {/* Title Section */}
          <View style={styles.titleSection}>
            {recipe.isInQueue && (
              <Badge label="In Queue" variant="success" icon="checkmark-circle" />
            )}
            <ThemedText style={styles.title}>{recipe.title}</ThemedText>

            <View style={styles.metaRow}>
              {recipe.servings && (
                <View style={styles.metaItem}>
                  <Ionicons name="people" size={16} color={colors.textTertiary} />
                  <ThemedText style={[styles.metaText, { color: colors.textTertiary }]}>
                    {recipe.servings} servings
                  </ThemedText>
                </View>
              )}
              {recipe.prepTime && (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={16} color={colors.textTertiary} />
                  <ThemedText style={[styles.metaText, { color: colors.textTertiary }]}>
                    {recipe.prepTime}
                  </ThemedText>
                </View>
              )}
              {recipe.cookTime && (
                <View style={styles.metaItem}>
                  <Ionicons name="flame" size={16} color={colors.tint} />
                  <ThemedText style={[styles.metaText, { color: colors.textTertiary }]}>
                    {recipe.cookTime}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <ModernButton
              title={recipe.isInQueue ? 'In Queue' : 'Add to Queue'}
              icon={recipe.isInQueue ? 'checkmark-circle' : 'add-circle-outline'}
              variant={recipe.isInQueue ? 'primary' : 'secondary'}
              onPress={handleToggleQueue}
              style={styles.actionButton}
            />
            <ModernButton
              title="Add to List"
              icon="cart"
              variant="primary"
              onPress={() => router.push({ pathname: '/grocery/add-from-recipe', params: { recipeId: recipe.id } } as any)}
              style={styles.actionButton}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

          {/* Ingredients Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={styles.sectionTitle}>Ingredients</ThemedText>
              <AnimatedPressable onPress={handleCopyIngredients} hapticType="light">
                <Ionicons name="copy-outline" size={20} color={colors.textTertiary} />
              </AnimatedPressable>
            </View>

            {/* Serving Presets */}
            {recipe.servings && (
              <View style={styles.servingSection}>
                <View style={styles.presetButtons}>
                  {SERVING_PRESETS.map((preset) => (
                    <AnimatedPressable
                      key={preset}
                      hapticType="selection"
                      onPress={() => setSelectedServings(preset)}
                      style={[
                        styles.presetButton,
                        {
                          backgroundColor: selectedServings === preset
                            ? colors.tint
                            : colorScheme === 'dark' ? colors.cardElevated : colors.skeleton,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.presetText,
                          { color: selectedServings === preset ? '#FFFFFF' : colors.text },
                        ]}
                      >
                        {preset}
                      </ThemedText>
                    </AnimatedPressable>
                  ))}
                </View>

                <View style={styles.servingAdjuster}>
                  <AnimatedPressable
                    hapticType="light"
                    onPress={() => selectedServings > 1 && setSelectedServings(selectedServings - 1)}
                    disabled={selectedServings <= 1}
                  >
                    <Ionicons
                      name="remove-circle"
                      size={28}
                      color={selectedServings <= 1 ? colors.textTertiary : colors.tint}
                    />
                  </AnimatedPressable>
                  <ThemedText style={styles.servingCount}>{selectedServings}</ThemedText>
                  <AnimatedPressable
                    hapticType="light"
                    onPress={() => setSelectedServings(selectedServings + 1)}
                  >
                    <Ionicons name="add-circle" size={28} color={colors.tint} />
                  </AnimatedPressable>
                </View>
              </View>
            )}

            {selectedServings !== recipe.servings && recipe.servings && (
              <ThemedText style={[styles.scaledNote, { color: colors.textTertiary }]}>
                Scaled from {recipe.servings} servings
              </ThemedText>
            )}

            {/* Ingredient List */}
            {recipe.ingredients.map((ingredient, index) => (
              <Animated.View
                key={ingredient.id || index}
                entering={FadeInDown.delay(100 + index * 30).duration(300)}
                style={styles.ingredientRow}
              >
                <View style={[styles.ingredientBullet, { backgroundColor: colors.tint }]} />
                <ThemedText style={styles.ingredientText}>
                  {scaleIngredient(ingredient)}
                </ThemedText>
              </Animated.View>
            ))}
          </View>

          {/* Instructions Section */}
          {instructions.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Instructions</ThemedText>

                {instructions.map((step, index) => (
                  <Animated.View
                    key={index}
                    entering={FadeInDown.delay(200 + index * 50).duration(300)}
                    style={styles.instructionRow}
                  >
                    <LinearGradient
                      colors={themeGradients.primary}
                      style={styles.stepNumber}
                    >
                      <ThemedText style={styles.stepNumberText}>{index + 1}</ThemedText>
                    </LinearGradient>
                    <ThemedText style={styles.instructionText}>{step}</ThemedText>
                  </Animated.View>
                ))}
              </View>
            </>
          )}

          {/* Source Section */}
          {recipe.sourceURL && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
              <View style={styles.section}>
                <ThemedText style={styles.sectionTitle}>Source</ThemedText>

                <AnimatedPressable
                  hapticType="light"
                  onPress={handleOpenSource}
                  style={[styles.sourceLink, { backgroundColor: colors.accentSubtle }]}
                >
                  <Ionicons name={sourceIcon as any} size={20} color={colors.tint} />
                  <ThemedText
                    style={[styles.sourceLinkText, { color: colors.tint }]}
                    numberOfLines={1}
                  >
                    {new URL(recipe.sourceURL).hostname}
                  </ThemedText>
                  <Ionicons name="open-outline" size={18} color={colors.tint} />
                </AnimatedPressable>
              </View>
            </>
          )}
        </Animated.View>

        <View style={styles.bottomPadding} />
      </AnimatedScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingContent: {
    padding: spacing.lg,
  },
  content: {
    paddingBottom: spacing['5xl'],
  },
  headerButton: {
    padding: spacing.xs,
  },
  headerButtonBackground: {
    borderRadius: radius.full,
    padding: spacing.xs,
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    gap: spacing.sm,
  },
  toastText: {
    ...typography.labelMedium,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: HEADER_IMAGE_HEIGHT,
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
    top: '50%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentCard: {
    marginTop: -spacing['3xl'],
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing['2xl'],
    minHeight: 400,
  },
  titleSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.displayMedium,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.bodyMedium,
  },
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xl,
  },
  section: {
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.titleLarge,
  },
  servingSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  presetButton: {
    width: 40,
    height: 36,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetText: {
    ...typography.labelLarge,
  },
  servingAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  servingCount: {
    ...typography.titleMedium,
    minWidth: 28,
    textAlign: 'center',
  },
  scaledNote: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  ingredientBullet: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    marginTop: 7,
    marginRight: spacing.md,
  },
  ingredientText: {
    flex: 1,
    ...typography.bodyLarge,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  stepNumber: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  stepNumberText: {
    color: '#FFFFFF',
    ...typography.labelLarge,
  },
  instructionText: {
    flex: 1,
    ...typography.bodyLarge,
    lineHeight: 26,
  },
  sourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.lg,
    gap: spacing.md,
  },
  sourceLinkText: {
    flex: 1,
    ...typography.labelLarge,
  },
  bottomPadding: {
    height: spacing['5xl'],
  },
});
