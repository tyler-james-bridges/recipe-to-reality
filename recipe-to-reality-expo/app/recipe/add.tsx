import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { Icon } from '@/src/components/ui/Icon';
import * as Haptics from 'expo-haptics';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { usePurchaseStore } from '@/src/stores/purchaseStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { extractRecipe } from '@/src/services/extraction/recipeExtraction';
import { ExtractedRecipe, Ingredient, IngredientCategory } from '@/src/types';
import Colors from '@/constants/Colors';

type InputMode = 'url' | 'manual';

export default function AddRecipeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { addRecipe } = useRecipeStore();
  const { canExtract, recordExtraction, isPremium, remainingFreeExtractions } = usePurchaseStore();
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback);

  const [mode, setMode] = useState<InputMode>('url');
  const [url, setUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);

  // Manual input fields
  const [title, setTitle] = useState('');
  const [servings, setServings] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [ingredientText, setIngredientText] = useState('');
  const [instructionText, setInstructionText] = useState('');
  const [notes, setNotes] = useState('');

  const triggerHaptic = (type: 'light' | 'success' | 'error' | 'selection') => {
    if (!hapticFeedback) return;
    switch (type) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'success':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'error':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case 'selection':
        Haptics.selectionAsync();
        break;
    }
  };

  const handleExtractFromURL = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'Please enter a URL');
      return;
    }

    // Check extraction limit
    if (!canExtract) {
      router.push('/paywall');
      return;
    }

    triggerHaptic('light');
    setIsExtracting(true);

    try {
      const extracted = await extractRecipe(url.trim());
      await recordExtraction();
      await saveExtractedRecipe(extracted);
      triggerHaptic('success');
      router.back();
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Extraction Failed', (error as Error).message);
    } finally {
      setIsExtracting(false);
    }
  };

  const saveExtractedRecipe = async (extracted: ExtractedRecipe) => {
    const ingredients: Ingredient[] = extracted.ingredients.map((ing, index) => ({
      id: `temp-${index}`,
      recipeId: '',
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      category: ing.category,
      isOptional: false,
    }));

    await addRecipe({
      title: extracted.title,
      sourceURL: extracted.sourceURL,
      sourceType: extracted.sourceType,
      imageURL: extracted.imageURL,
      servings: extracted.servings,
      prepTime: extracted.prepTime,
      cookTime: extracted.cookTime,
      instructions: JSON.stringify(extracted.instructions),
      notes: null,
      isInQueue: false,
      dateCooked: null,
      ingredients,
    });
  };

  const handleSaveManual = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a recipe title');
      return;
    }

    triggerHaptic('light');

    // Parse ingredients from text (one per line)
    const ingredientLines = ingredientText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const ingredients: Ingredient[] = ingredientLines.map((line, index) => ({
      id: `temp-${index}`,
      recipeId: '',
      name: line,
      quantity: null,
      unit: null,
      category: 'Other' as IngredientCategory,
      isOptional: false,
    }));

    // Parse instructions from text (one per line)
    const instructions = instructionText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    try {
      await addRecipe({
        title: title.trim(),
        sourceURL: null,
        sourceType: 'manual',
        imageURL: null,
        servings: servings ? parseInt(servings, 10) : null,
        prepTime: prepTime || null,
        cookTime: cookTime || null,
        instructions: JSON.stringify(instructions),
        notes: notes || null,
        isInQueue: false,
        dateCooked: null,
        ingredients,
      });
      triggerHaptic('success');
      router.back();
    } catch (error) {
      triggerHaptic('error');
      Alert.alert('Error', 'Failed to save recipe');
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Add Recipe',
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <ThemedText style={[styles.headerButtonText, { color: colors.tint }]}>
                Cancel
              </ThemedText>
            </Pressable>
          ),
          headerRight: () =>
            mode === 'manual' ? (
              <Pressable onPress={handleSaveManual}>
                <ThemedText style={[styles.headerButtonText, styles.headerButtonBold, { color: colors.tint }]}>
                  Save
                </ThemedText>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {mode === 'url' ? (
            <View style={styles.urlSection}>
              {/* Extraction Limit Banner */}
              {!isPremium && (
                <Pressable
                  style={[styles.limitBanner, { backgroundColor: colors.tint + '1A' }]}
                  onPress={() => router.push('/paywall')}
                >
                  <Icon name="sparkles" size={18} color={colors.tint} />
                  <ThemedText style={[styles.limitText, { color: colors.tint }]}>
                    {remainingFreeExtractions} free extractions remaining
                  </ThemedText>
                  <Icon name="chevron-forward" size={18} color={colors.tint} />
                </Pressable>
              )}

              {/* URL Input - grouped style */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.inputLabel}>Recipe URL</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={url}
                  onChangeText={setUrl}
                  placeholder="https://example.com/recipe"
                  placeholderTextColor="#8E8E93"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>

              <ThemedText style={styles.hint}>
                Works with recipe websites, YouTube, TikTok, and Instagram videos.
              </ThemedText>

              {/* Extract Button */}
              <Pressable
                style={[
                  styles.extractButton,
                  { backgroundColor: colors.tint },
                  isExtracting && styles.extractButtonDisabled,
                ]}
                onPress={handleExtractFromURL}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Icon name="sparkles" size={20} color="#fff" />
                    <ThemedText style={styles.extractButtonText}>Extract Recipe</ThemedText>
                  </>
                )}
              </Pressable>

              {/* Manual Entry Link */}
              <Pressable
                style={styles.manualEntryLink}
                onPress={() => {
                  triggerHaptic('selection');
                  setMode('manual');
                }}
              >
                <ThemedText style={styles.manualEntryLinkText}>
                  Enter manually instead
                </ThemedText>
              </Pressable>
            </View>
          ) : (
            <View style={styles.manualSection}>
              {/* Back to URL Link */}
              <Pressable
                style={styles.backToUrlLink}
                onPress={() => {
                  triggerHaptic('selection');
                  setMode('url');
                }}
              >
                <Icon name="arrow-back" size={16} color={colors.tint} />
                <ThemedText style={[styles.backToUrlLinkText, { color: colors.tint }]}>
                  Back to URL
                </ThemedText>
              </Pressable>

              {/* Title */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.inputLabel}>Recipe Title</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter recipe title"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Servings & Time Row */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, styles.halfWidth, { backgroundColor: colors.card }]}>
                  <ThemedText style={styles.inputLabel}>Servings</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={servings}
                    onChangeText={setServings}
                    placeholder="4"
                    placeholderTextColor="#8E8E93"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={[styles.inputGroup, styles.halfWidth, { backgroundColor: colors.card }]}>
                  <ThemedText style={styles.inputLabel}>Prep Time</ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={prepTime}
                    onChangeText={setPrepTime}
                    placeholder="15 min"
                    placeholderTextColor="#8E8E93"
                  />
                </View>
              </View>

              {/* Cook Time */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.inputLabel}>Cook Time</ThemedText>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={cookTime}
                  onChangeText={setCookTime}
                  placeholder="30 min"
                  placeholderTextColor="#8E8E93"
                />
              </View>

              {/* Ingredients */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.inputLabel}>Ingredients (one per line)</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text }]}
                  value={ingredientText}
                  onChangeText={setIngredientText}
                  placeholder={'2 cups flour\n1 tsp salt\n1/2 cup butter'}
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Instructions */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.inputLabel}>Instructions (one step per line)</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text }]}
                  value={instructionText}
                  onChangeText={setInstructionText}
                  placeholder={'Preheat oven to 350F\nMix dry ingredients\nAdd wet ingredients'}
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>

              {/* Notes */}
              <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                <ThemedText style={styles.inputLabel}>Notes (optional)</ThemedText>
                <TextInput
                  style={[styles.input, styles.textAreaSmall, { color: colors.text }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional notes..."
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerButtonText: {
    fontSize: 17,
  },
  headerButtonBold: {
    fontWeight: '600',
  },
  urlSection: {},
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  limitText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  inputGroup: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 6,
  },
  input: {
    fontSize: 17,
  },
  textArea: {
    height: 120,
    paddingTop: 0,
  },
  textAreaSmall: {
    height: 80,
    paddingTop: 0,
  },
  hint: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 24,
    textAlign: 'center',
  },
  extractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 10,
  },
  extractButtonDisabled: {
    opacity: 0.7,
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  manualSection: {},
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  manualEntryLink: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  manualEntryLinkText: {
    fontSize: 15,
    color: '#8E8E93',
  },
  backToUrlLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
  },
  backToUrlLinkText: {
    fontSize: 15,
    fontWeight: '500',
  },
});
