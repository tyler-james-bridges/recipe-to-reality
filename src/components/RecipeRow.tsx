import React, { useRef, useCallback } from 'react';
import { StyleSheet, View, useColorScheme, Share, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemedText } from '@/components/Themed';
import { RecipeWithIngredients } from '../types';
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors';
import AnimatedPressable from './ui/AnimatedPressable';
import Badge from './ui/Badge';
import { Icon } from './ui/Icon';
import { HapticManager } from '../services/haptics';

interface RecipeRowProps {
  recipe: RecipeWithIngredients;
  onPress?: () => void;
  pantryMatchPercentage?: number;
  index?: number;
  onShare?: () => void;
  onAddToQueue?: () => void;
  onMarkAsCooked?: () => void;
  onDelete?: () => void;
  onAddToGroceryList?: () => void;
  enableLinkPreview?: boolean;
}

export default function RecipeRow({
  recipe,
  onPress,
  pantryMatchPercentage,
  index = 0,
  onShare,
  onAddToQueue,
  onMarkAsCooked,
  onDelete,
  onAddToGroceryList,
  enableLinkPreview = true,
}: RecipeRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const progress = useSharedValue(0);
  const swipeableRef = useRef<Swipeable>(null);

  React.useEffect(() => {
    progress.value = withDelay(
      index * 50,
      withSpring(1, {
        damping: 18,
        stiffness: 100,
      })
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [12, 0], Extrapolation.CLAMP) },
    ],
  }));

  // Handle swipe action for queue toggle
  const handleSwipeAction = useCallback(() => {
    HapticManager.success();
    onAddToQueue?.();
    swipeableRef.current?.close();
  }, [onAddToQueue]);

  // Render the left swipe action (revealed when swiping right)
  const renderLeftActions = useCallback(() => {
    const isInQueue = recipe.isInQueue;
    const backgroundColor = isInQueue ? '#FF3B30' : '#34C759';
    const iconName = isInQueue ? 'remove-circle-outline' : 'add-circle-outline';
    const actionText = isInQueue ? 'Remove' : 'Add';

    return (
      <Pressable
        onPress={handleSwipeAction}
        style={[
          styles.swipeAction,
          styles.swipeActionLeft,
          { backgroundColor },
        ]}
      >
        <Icon name={iconName} size={24} color="#FFFFFF" />
        <ThemedText style={styles.swipeActionText}>{actionText}</ThemedText>
      </Pressable>
    );
  }, [recipe.isInQueue, handleSwipeAction]);

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

  const getPantryMatchVariant = (percentage: number) => {
    if (percentage >= 70) return 'success';
    if (percentage >= 40) return 'warning';
    return 'neutral';
  };

  const handleShare = async () => {
    if (onShare) {
      onShare();
    } else {
      try {
        const shareMessage = 'Check out this recipe: ' + recipe.title + (recipe.sourceURL ? '\n' + recipe.sourceURL : '');
        await Share.share({ message: shareMessage });
      } catch {
        // Ignore share errors
      }
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
    }
  };

  const CardContent = () => (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
        },
      ]}
    >
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
      <View style={styles.chevronContainer}>
        <Icon name="chevron-forward" size={18} color={colors.textTertiary} />
      </View>
    </View>
  );

  // If Link.Preview is not enabled, use the original behavior with swipe
  if (!enableLinkPreview) {
    return (
      <Animated.View style={animatedStyle}>
        <Swipeable
          ref={swipeableRef}
          renderLeftActions={renderLeftActions}
          leftThreshold={80}
          overshootLeft={false}
          friction={2}
          onSwipeableOpen={(direction) => {
            if (direction === 'left') {
              handleSwipeAction();
            }
          }}
        >
          <AnimatedPressable
            onPress={onPress}
            hapticType="light"
            scaleOnPress={0.98}
            style={styles.pressable}
          >
            <CardContent />
          </AnimatedPressable>
        </Swipeable>
      </Animated.View>
    );
  }

  // Enhanced navigation with Link.Preview, context menu, and swipe gesture
  const recipeHref = `/recipe/${recipe.id}` as const;
  return (
    <Animated.View style={animatedStyle}>
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        leftThreshold={80}
        overshootLeft={false}
        friction={2}
        onSwipeableOpen={(direction) => {
          if (direction === 'left') {
            handleSwipeAction();
          }
        }}
      >
        <View style={styles.pressable}>
          <Link href={recipeHref} asChild>
            <Link.Trigger>
              <Pressable style={styles.linkTrigger}>
                <CardContent />
              </Pressable>
            </Link.Trigger>
            <Link.Preview />
            <Link.Menu>
              <Link.MenuAction
                title={recipe.isInQueue ? 'Remove from Queue' : 'Add to Queue'}
                icon={recipe.isInQueue ? 'minus.circle' : 'plus.circle'}
                onPress={() => onAddToQueue?.()}
              />
              <Link.MenuAction
                title="Add to Grocery List"
                icon="cart"
                onPress={() => onAddToGroceryList?.()}
              />
              <Link.MenuAction
                title="Mark as Cooked"
                icon="checkmark.circle"
                onPress={() => onMarkAsCooked?.()}
              />
              <Link.MenuAction
                title="Share"
                icon="square.and.arrow.up"
                onPress={handleShare}
              />
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={handleDelete}
              />
            </Link.Menu>
          </Link>
        </View>
      </Swipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
  },
  linkTrigger: {},
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
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 100,
    marginVertical: spacing.xs,
  },
  swipeActionLeft: {
    marginLeft: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderBottomLeftRadius: radius.lg,
  },
  swipeActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
