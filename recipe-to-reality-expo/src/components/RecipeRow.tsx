import React from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/Themed';
import { RecipeWithIngredients } from '../types';
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors';
import AnimatedPressable from './ui/AnimatedPressable';
import Badge from './ui/Badge';
import { Icon } from './ui/Icon';

interface RecipeRowProps {
  recipe: RecipeWithIngredients;
  onPress: () => void;
  pantryMatchPercentage?: number;
  index?: number;
}

export default function RecipeRow({ recipe, onPress, pantryMatchPercentage, index = 0 }: RecipeRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      index * 50,
      withSpring(1, {
        damping: 18,
        stiffness: 100,
      })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [12, 0], Extrapolation.CLAMP) },
    ],
  }));

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
        return { name: 'pencil' as const, color: colors.textTertiary };
    }
  }, [recipe.sourceType, colors.text, colors.textTertiary]);

  // Pantry match badge variant
  const getPantryMatchVariant = (percentage: number) => {
    if (percentage >= 70) return 'success';
    if (percentage >= 40) return 'warning';
    return 'neutral';
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      hapticType="light"
      scaleOnPress={0.98}
      style={[styles.pressable, animatedStyle]}
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
          },
        ]}
      >
        {/* Thumbnail with gradient overlay */}
        {recipe.imageURL ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: recipe.imageURL }}
              style={styles.image}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {recipe.isInQueue && (
              <View style={styles.queueBadge}>
                <Icon name="checkmark-circle" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: colors.accentSubtle }]}>
            <LinearGradient
              colors={[colors.accentSubtle, colors.tint + '20']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Icon name="restaurant" size={24} color={colors.tint} />
            {recipe.isInQueue && (
              <View style={styles.queueBadge}>
                <Icon name="checkmark-circle" size={16} color="#FFFFFF" />
              </View>
            )}
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
                <Icon name="people" size={12} color={colors.textTertiary} />
                <ThemedText style={[styles.metaText, { color: colors.textTertiary }]}>
                  {recipe.servings}
                </ThemedText>
              </View>
            )}

            {recipe.cookTime && (
              <View style={styles.metaItem}>
                <Icon name="time-outline" size={12} color={colors.textTertiary} />
                <ThemedText style={[styles.metaText, { color: colors.textTertiary }]}>
                  {recipe.cookTime}
                </ThemedText>
              </View>
            )}

            <View style={styles.metaItem}>
              <Icon name={sourceIcon.name} size={12} color={sourceIcon.color} />
            </View>
          </View>

          {/* Pantry match badge */}
          {pantryMatchPercentage !== undefined && pantryMatchPercentage > 0 && (
            <View style={styles.badgeRow}>
              <Badge
                label={`${Math.round(pantryMatchPercentage)}% match`}
                variant={getPantryMatchVariant(pantryMatchPercentage)}
                size="small"
                icon="snow-outline"
              />
            </View>
          )}
        </View>

        {/* Chevron */}
        <View style={styles.chevronContainer}>
          <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.md,
    ...shadows.small,
  },
  imageWrapper: {
    position: 'relative',
  },
  image: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
  },
  imagePlaceholder: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  queueBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#34C759',
    borderRadius: radius.full,
    padding: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    gap: spacing.xs,
  },
  title: {
    ...typography.titleMedium,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  metaText: {
    ...typography.caption,
  },
  badgeRow: {
    marginTop: spacing.xs,
  },
  chevronContainer: {
    padding: spacing.xs,
  },
});
