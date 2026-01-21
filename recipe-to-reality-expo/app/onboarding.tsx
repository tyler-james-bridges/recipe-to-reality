import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  useColorScheme,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import Colors, { gradients, shadows, radius, typography, spacing, animation } from '@/constants/Colors';
import { ThemedText } from '@/components/Themed';
import { ModernButton, AnimatedPressable, GlassCard } from '@/src/components/ui';
import { useSettingsStore } from '@/src/stores/settingsStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOTAL_PAGES = 5;

// Onboarding slide data
const SLIDES = [
  {
    id: 'welcome',
    title: 'Recipe to Reality',
    subtitle: 'Turn any recipe into tonight\'s dinner',
    description: 'Extract recipes from anywhere, plan your meals, and never waste an ingredient.',
    icon: 'restaurant-outline' as const,
    iconFamily: 'ionicons' as const,
    accentColor: '#FF9500',
  },
  {
    id: 'extract',
    title: 'AI-Powered Extraction',
    subtitle: 'From any source, instantly',
    description: 'Paste a URL or share from TikTok, Instagram, YouTube, or any recipe website. Our AI does the rest.',
    icon: 'sparkles' as const,
    iconFamily: 'ionicons' as const,
    accentColor: '#AF52DE',
  },
  {
    id: 'mealplan',
    title: 'Smart Meal Planning',
    subtitle: 'Your week, organized',
    description: 'Drag recipes to your calendar, manage your cooking queue, and never stress about "what\'s for dinner?"',
    icon: 'calendar' as const,
    iconFamily: 'ionicons' as const,
    accentColor: '#007AFF',
  },
  {
    id: 'grocery',
    title: 'Intelligent Grocery Lists',
    subtitle: 'Shop smarter, waste less',
    description: 'Auto-consolidated ingredients, pantry integration, and smart suggestions to skip items you already have.',
    icon: 'cart' as const,
    iconFamily: 'ionicons' as const,
    accentColor: '#34C759',
  },
  {
    id: 'getstarted',
    title: 'Ready to Cook?',
    subtitle: 'Your culinary journey starts now',
    description: 'Join thousands of home cooks who\'ve simplified their meal planning.',
    icon: 'rocket' as const,
    iconFamily: 'ionicons' as const,
    accentColor: '#FF9500',
  },
];

// Animated floating icon component
function FloatingIcon({
  name,
  color,
  size = 24,
  delay = 0,
  family = 'ionicons'
}: {
  name: string;
  color: string;
  size?: number;
  delay?: number;
  family?: 'ionicons' | 'material';
}) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 1500 }),
          withTiming(8, { duration: 1500 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const IconComponent = family === 'material' ? MaterialCommunityIcons : Ionicons;

  return (
    <Animated.View style={animatedStyle}>
      <IconComponent name={name as any} size={size} color={color} />
    </Animated.View>
  );
}

// Animated hero illustration for each slide
function SlideIllustration({ slide, isActive }: { slide: typeof SLIDES[0]; isActive: boolean }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const scale = useSharedValue(0.8);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    if (isActive) {
      scale.value = withSpring(1, { damping: 12, stiffness: 100 });
      rotation.value = withRepeat(
        withSequence(
          withTiming(-3, { duration: 2000 }),
          withTiming(3, { duration: 2000 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(0.8, { duration: 300 });
    }
  }, [isActive]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  const renderIllustration = () => {
    switch (slide.id) {
      case 'welcome':
        return (
          <View style={styles.illustrationContainer}>
            {/* Animated cooking pot with floating ingredients */}
            <Animated.View style={[styles.heroIconContainer, animatedStyle]}>
              <LinearGradient
                colors={[slide.accentColor, `${slide.accentColor}CC`]}
                style={styles.heroIconGradient}
              >
                <Ionicons name="restaurant" size={64} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            {/* Floating decorative icons */}
            <View style={[styles.floatingIcon, { top: 20, left: 30 }]}>
              <FloatingIcon name="flame" color={colors.error} size={28} delay={200} />
            </View>
            <View style={[styles.floatingIcon, { top: 40, right: 40 }]}>
              <FloatingIcon name="leaf" color={colors.success} size={24} delay={400} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 30, left: 50 }]}>
              <FloatingIcon name="heart" color="#FF2D55" size={22} delay={600} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 50, right: 30 }]}>
              <FloatingIcon name="star" color="#FFD60A" size={26} delay={300} />
            </View>
          </View>
        );

      case 'extract':
        return (
          <View style={styles.illustrationContainer}>
            <Animated.View style={[styles.heroIconContainer, animatedStyle]}>
              <LinearGradient
                colors={[slide.accentColor, `${slide.accentColor}CC`]}
                style={styles.heroIconGradient}
              >
                <Ionicons name="sparkles" size={64} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            {/* Social media icons floating */}
            <View style={[styles.floatingIcon, { top: 10, left: 20 }]}>
              <FloatingIcon name="logo-tiktok" color="#000000" size={26} delay={100} />
            </View>
            <View style={[styles.floatingIcon, { top: 30, right: 25 }]}>
              <FloatingIcon name="logo-instagram" color="#E1306C" size={28} delay={200} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 40, left: 35 }]}>
              <FloatingIcon name="logo-youtube" color="#FF0000" size={28} delay={300} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 20, right: 40 }]}>
              <FloatingIcon name="link" color={colors.tint} size={24} delay={400} />
            </View>
          </View>
        );

      case 'mealplan':
        return (
          <View style={styles.illustrationContainer}>
            <Animated.View style={[styles.heroIconContainer, animatedStyle]}>
              <LinearGradient
                colors={[slide.accentColor, `${slide.accentColor}CC`]}
                style={styles.heroIconGradient}
              >
                <Ionicons name="calendar" size={64} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            {/* Calendar-related floating icons */}
            <View style={[styles.floatingIcon, { top: 15, left: 25 }]}>
              <FloatingIcon name="today" color={slide.accentColor} size={26} delay={150} />
            </View>
            <View style={[styles.floatingIcon, { top: 35, right: 30 }]}>
              <FloatingIcon name="time" color={colors.textSecondary} size={24} delay={250} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 35, left: 40 }]}>
              <FloatingIcon name="checkmark-circle" color={colors.success} size={28} delay={350} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 25, right: 35 }]}>
              <FloatingIcon name="notifications" color="#FFD60A" size={24} delay={450} />
            </View>
          </View>
        );

      case 'grocery':
        return (
          <View style={styles.illustrationContainer}>
            <Animated.View style={[styles.heroIconContainer, animatedStyle]}>
              <LinearGradient
                colors={[slide.accentColor, `${slide.accentColor}CC`]}
                style={styles.heroIconGradient}
              >
                <Ionicons name="cart" size={64} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            {/* Grocery-related floating icons */}
            <View style={[styles.floatingIcon, { top: 20, left: 30 }]}>
              <FloatingIcon name="nutrition" color="#FF9500" size={26} delay={100} />
            </View>
            <View style={[styles.floatingIcon, { top: 25, right: 25 }]}>
              <FloatingIcon name="pricetag" color={colors.success} size={24} delay={200} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 30, left: 45 }]}>
              <FloatingIcon name="checkbox" color={slide.accentColor} size={26} delay={300} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 45, right: 30 }]}>
              <FloatingIcon name="basket" color="#AF52DE" size={24} delay={400} />
            </View>
          </View>
        );

      case 'getstarted':
        return (
          <View style={styles.illustrationContainer}>
            <Animated.View style={[styles.heroIconContainer, animatedStyle]}>
              <LinearGradient
                colors={[slide.accentColor, `${slide.accentColor}CC`]}
                style={styles.heroIconGradient}
              >
                <Ionicons name="rocket" size={64} color="#FFFFFF" />
              </LinearGradient>
            </Animated.View>
            {/* Celebratory floating icons */}
            <View style={[styles.floatingIcon, { top: 10, left: 35 }]}>
              <FloatingIcon name="star" color="#FFD60A" size={28} delay={50} />
            </View>
            <View style={[styles.floatingIcon, { top: 20, right: 30 }]}>
              <FloatingIcon name="heart" color="#FF2D55" size={26} delay={150} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 25, left: 40 }]}>
              <FloatingIcon name="flash" color={slide.accentColor} size={26} delay={250} />
            </View>
            <View style={[styles.floatingIcon, { bottom: 35, right: 35 }]}>
              <FloatingIcon name="trophy" color="#FFD60A" size={24} delay={350} />
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return renderIllustration();
}

// Individual slide component
function OnboardingSlide({
  slide,
  index,
  currentPage,
  scrollX,
}: {
  slide: typeof SLIDES[0];
  index: number;
  currentPage: number;
  scrollX: SharedValue<number>;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isActive = currentPage === index;

  const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

  const animatedContainerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollX.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      scrollX.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolation.CLAMP
    );
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
      <Animated.View style={[styles.slideContent, animatedContainerStyle]}>
        {/* Hero Illustration */}
        <View style={styles.illustrationWrapper}>
          <SlideIllustration slide={slide} isActive={isActive} />
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Animated.Text
            entering={isActive ? FadeInDown.delay(200).duration(500) : undefined}
            style={[
              styles.title,
              typography.displayLarge,
              { color: colors.text },
            ]}
          >
            {slide.title}
          </Animated.Text>

          <Animated.Text
            entering={isActive ? FadeInDown.delay(300).duration(500) : undefined}
            style={[
              styles.subtitle,
              typography.titleMedium,
              { color: slide.accentColor },
            ]}
          >
            {slide.subtitle}
          </Animated.Text>

          <Animated.Text
            entering={isActive ? FadeInDown.delay(400).duration(500) : undefined}
            style={[
              styles.description,
              typography.bodyLarge,
              { color: colors.textSecondary },
            ]}
          >
            {slide.description}
          </Animated.Text>
        </View>
      </Animated.View>
    </View>
  );
}

// Animated page indicator dots
function PageIndicator({
  currentPage,
  totalPages,
  scrollX
}: {
  currentPage: number;
  totalPages: number;
  scrollX: SharedValue<number>;
}) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View style={styles.paginationContainer}>
      {Array.from({ length: totalPages }).map((_, index) => {
        const animatedDotStyle = useAnimatedStyle(() => {
          const inputRange = [
            (index - 1) * SCREEN_WIDTH,
            index * SCREEN_WIDTH,
            (index + 1) * SCREEN_WIDTH,
          ];
          const width = interpolate(
            scrollX.value,
            inputRange,
            [8, 24, 8],
            Extrapolation.CLAMP
          );
          const opacity = interpolate(
            scrollX.value,
            inputRange,
            [0.4, 1, 0.4],
            Extrapolation.CLAMP
          );
          return {
            width,
            opacity,
          };
        });

        return (
          <Animated.View
            key={index}
            style={[
              styles.paginationDot,
              { backgroundColor: colors.tint },
              animatedDotStyle,
            ]}
          />
        );
      })}
    </View>
  );
}

// Main onboarding screen
export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollX = useSharedValue(0);
  const setHasCompletedOnboarding = useSettingsStore((state) => state.setHasCompletedOnboarding);
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const triggerHaptic = useCallback(() => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [hapticFeedback]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    scrollX.value = offsetX;
    const newPage = Math.round(offsetX / SCREEN_WIDTH);
    if (newPage !== currentPage) {
      setCurrentPage(newPage);
      triggerHaptic();
    }
  };

  const handleSkip = useCallback(async () => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  }, [setHasCompletedOnboarding, hapticFeedback]);

  const handleNext = useCallback(() => {
    if (currentPage < TOTAL_PAGES - 1) {
      triggerHaptic();
      scrollViewRef.current?.scrollTo({
        x: (currentPage + 1) * SCREEN_WIDTH,
        animated: true,
      });
    }
  }, [currentPage, triggerHaptic]);

  const handleGetStarted = useCallback(async () => {
    if (hapticFeedback) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await setHasCompletedOnboarding(true);
    router.replace('/(tabs)');
  }, [setHasCompletedOnboarding, hapticFeedback]);

  const isLastPage = currentPage === TOTAL_PAGES - 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background gradient */}
      <LinearGradient
        colors={
          colorScheme === 'dark'
            ? ['#000000', '#1C1C1E', '#000000']
            : ['#FFFFFF', '#F8F8F8', '#FFFFFF']
        }
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Skip button */}
      {!isLastPage && (
        <Animated.View
          entering={FadeIn.delay(500)}
          style={[styles.skipButton, { top: insets.top + spacing.md }]}
        >
          <AnimatedPressable onPress={handleSkip} hapticType="light">
            <ThemedText style={[typography.labelLarge, { color: colors.textTertiary }]}>
              Skip
            </ThemedText>
          </AnimatedPressable>
        </Animated.View>
      )}

      {/* Slides */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {SLIDES.map((slide, index) => (
          <OnboardingSlide
            key={slide.id}
            slide={slide}
            index={index}
            currentPage={currentPage}
            scrollX={scrollX}
          />
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + spacing.xl }]}>
        {/* Page indicators */}
        <PageIndicator
          currentPage={currentPage}
          totalPages={TOTAL_PAGES}
          scrollX={scrollX}
        />

        {/* Action buttons */}
        <View style={styles.buttonContainer}>
          {isLastPage ? (
            <Animated.View
              entering={FadeInUp.duration(400)}
              style={styles.getStartedButton}
            >
              <ModernButton
                title="Get Started"
                onPress={handleGetStarted}
                variant="primary"
                size="large"
                icon="arrow-forward"
                iconPosition="right"
                fullWidth
              />
            </Animated.View>
          ) : (
            <View style={styles.navigationButtons}>
              <View style={styles.nextButtonWrapper}>
                <ModernButton
                  title="Next"
                  onPress={handleNext}
                  variant="primary"
                  size="large"
                  icon="arrow-forward"
                  iconPosition="right"
                  fullWidth
                />
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  skipButton: {
    position: 'absolute',
    right: spacing.xl,
    zIndex: 10,
    padding: spacing.sm,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 60,
  },
  illustrationWrapper: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  illustrationContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  heroIconContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroIconGradient: {
    width: 140,
    height: 140,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
  },
  floatingIcon: {
    position: 'absolute',
    padding: spacing.sm,
    borderRadius: radius.full,
  },
  textContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    maxWidth: 340,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  paginationDot: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    width: '100%',
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  nextButtonWrapper: {
    flex: 1,
    maxWidth: 320,
  },
  getStartedButton: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
});
