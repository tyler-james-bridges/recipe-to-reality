import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ThemedView, ThemedText } from '@/components/Themed';
import { useRecipeStore } from '@/src/stores/recipeStore';
import { usePurchaseStore } from '@/src/stores/purchaseStore';
import { useSettingsStore } from '@/src/stores/settingsStore';
import { extractRecipe } from '@/src/services/extraction/recipeExtraction';
import { ExtractedRecipe, Ingredient, INGREDIENT_CATEGORIES, IngredientCategory } from '@/src/types';

type InputMode = 'url' | 'manual';

export default function AddRecipeScreen() {
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

  const triggerHaptic = (type: 'light' | 'success' | 'error') => {
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
          headerLeft: () => (
            <Pressable onPress={() => router.back()}>
              <ThemedText style={styles.cancelButton}>Cancel</ThemedText>
            </Pressable>
          ),
          headerRight: () =>
            mode === 'manual' ? (
              <Pressable onPress={handleSaveManual}>
                <ThemedText style={styles.saveButton}>Save</ThemedText>
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Mode Toggle */}
          <View style={styles.modeToggle}>
            <Pressable
              style={[styles.modeButton, mode === 'url' && styles.modeButtonActive]}
              onPress={() => setMode('url')}
            >
              <MaterialCommunityIcons
                name="link-variant"
                size={20}
                color={mode === 'url' ? '#fff' : '#666'}
              />
              <ThemedText style={[styles.modeText, mode === 'url' && styles.modeTextActive]}>
                From URL
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.modeButton, mode === 'manual' && styles.modeButtonActive]}
              onPress={() => setMode('manual')}
            >
              <MaterialCommunityIcons
                name="pencil"
                size={20}
                color={mode === 'manual' ? '#fff' : '#666'}
              />
              <ThemedText style={[styles.modeText, mode === 'manual' && styles.modeTextActive]}>
                Manual
              </ThemedText>
            </Pressable>
          </View>

          {mode === 'url' ? (
            <View style={styles.urlSection}>
              {!isPremium && (
                <View style={styles.limitBanner}>
                  <MaterialCommunityIcons name="information" size={18} color="#FF6B35" />
                  <ThemedText style={styles.limitText}>
                    {remainingFreeExtractions} free extractions remaining
                  </ThemedText>
                </View>
              )}

              <ThemedText style={styles.label}>Recipe URL</ThemedText>
              <TextInput
                style={styles.input}
                value={url}
                onChangeText={setUrl}
                placeholder="https://example.com/recipe"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <ThemedText style={styles.hint}>
                Paste a link from any recipe website, YouTube, TikTok, or Instagram
              </ThemedText>

              <Pressable
                style={[styles.extractButton, isExtracting && styles.extractButtonDisabled]}
                onPress={handleExtractFromURL}
                disabled={isExtracting}
              >
                {isExtracting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="auto-fix" size={20} color="#fff" />
                    <ThemedText style={styles.extractButtonText}>Extract Recipe</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          ) : (
            <View style={styles.manualSection}>
              <ThemedText style={styles.label}>Recipe Title *</ThemedText>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter recipe title"
                placeholderTextColor="#999"
              />

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <ThemedText style={styles.label}>Servings</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={servings}
                    onChangeText={setServings}
                    placeholder="4"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                  />
                </View>
                <View style={styles.halfField}>
                  <ThemedText style={styles.label}>Prep Time</ThemedText>
                  <TextInput
                    style={styles.input}
                    value={prepTime}
                    onChangeText={setPrepTime}
                    placeholder="15 min"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <ThemedText style={styles.label}>Cook Time</ThemedText>
              <TextInput
                style={styles.input}
                value={cookTime}
                onChangeText={setCookTime}
                placeholder="30 min"
                placeholderTextColor="#999"
              />

              <ThemedText style={styles.label}>Ingredients (one per line)</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={ingredientText}
                onChangeText={setIngredientText}
                placeholder="2 cups flour&#10;1 tsp salt&#10;1/2 cup butter"
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <ThemedText style={styles.label}>Instructions (one step per line)</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={instructionText}
                onChangeText={setInstructionText}
                placeholder="Preheat oven to 350F&#10;Mix dry ingredients&#10;Add wet ingredients"
                placeholderTextColor="#999"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <ThemedText style={styles.label}>Notes (optional)</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: '#FF6B35',
  },
  modeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeTextActive: {
    color: '#fff',
  },
  urlSection: {},
  limitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF5F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  limitText: {
    fontSize: 14,
    color: '#FF6B35',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 24,
  },
  extractButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF6B35',
    paddingVertical: 16,
    borderRadius: 12,
  },
  extractButtonDisabled: {
    opacity: 0.7,
  },
  extractButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualSection: {},
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  cancelButton: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: '600',
  },
});
