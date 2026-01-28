import React, { useState, useCallback, useEffect } from 'react'
import {
  StyleSheet,
  ScrollView,
  View,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Alert,
} from 'react-native'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { Icon } from '@/src/components/ui/Icon'
import * as Haptics from 'expo-haptics'
import Animated, { FadeIn, FadeInDown, FadeOut, Layout } from 'react-native-reanimated'
import DateTimePicker from '@react-native-community/datetimepicker'

import { ThemedView, ThemedText } from '@/components/Themed'
import { usePantryStore } from '@/src/stores/pantryStore'
import { useSettingsStore } from '@/src/stores/settingsStore'
import { IngredientCategory } from '@/src/types'
import AnimatedPressable from '@/src/components/ui/AnimatedPressable'
import ModernButton from '@/src/components/ui/ModernButton'
import SectionHeader from '@/src/components/ui/SectionHeader'
import Colors, { shadows, radius, spacing, typography } from '@/constants/Colors'

// Simplified categories for the picker (matching iOS)
const SIMPLE_CATEGORIES: IngredientCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Meat & Seafood',
  'Pantry',
  'Spices & Seasonings',
  'Other',
]

export default function EditPantryItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const colorScheme = useColorScheme()
  const colors = Colors[colorScheme ?? 'light']

  const { items, updateItem, deleteItem } = usePantryStore()
  const hapticFeedback = useSettingsStore((state) => state.hapticFeedback)

  // Find the item to edit
  const item = items.find((i) => i.id === id)

  // Form state - initialized from the item
  const [name, setName] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [category, setCategory] = useState<IngredientCategory>('Other')
  const [hasExpiration, setHasExpiration] = useState(false)
  const [expirationDate, setExpirationDate] = useState(() => {
    const date = new Date()
    date.setDate(date.getDate() + 7)
    return date
  })
  const [notes, setNotes] = useState('')
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  // Initialize form with item data
  useEffect(() => {
    if (item && !isLoaded) {
      setName(item.name)
      setQuantity(item.quantity || '')
      setUnit(item.unit || '')
      setCategory(item.category)
      setHasExpiration(!!item.expirationDate)
      if (item.expirationDate) {
        setExpirationDate(new Date(item.expirationDate))
      }
      setNotes(item.notes || '')
      setIsLoaded(true)
    }
  }, [item, isLoaded])

  const isValid = name.trim().length > 0

  // Check if any changes were made
  const hasChanges = useCallback(() => {
    if (!item) return false
    return (
      name.trim() !== item.name ||
      (quantity.trim() || null) !== item.quantity ||
      (unit.trim() || null) !== item.unit ||
      category !== item.category ||
      (hasExpiration ? expirationDate.getTime() : null) !== item.expirationDate ||
      (notes.trim() || null) !== item.notes
    )
  }, [item, name, quantity, unit, category, hasExpiration, expirationDate, notes])

  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'success' | 'error' | 'selection') => {
      if (!hapticFeedback) return
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          break
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          break
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          break
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
          break
        case 'selection':
          Haptics.selectionAsync()
          break
      }
    },
    [hapticFeedback]
  )

  const handleSave = async () => {
    if (!isValid || !id) {
      triggerHaptic('error')
      Alert.alert('Error', 'Please enter an item name')
      return
    }

    if (!hasChanges()) {
      router.back()
      return
    }

    setIsSaving(true)
    triggerHaptic('light')

    try {
      await updateItem(id, {
        name: name.trim(),
        category,
        quantity: quantity.trim() || null,
        unit: unit.trim() || null,
        expirationDate: hasExpiration ? expirationDate.getTime() : null,
        notes: notes.trim() || null,
      })

      triggerHaptic('success')
      router.back()
    } catch {
      triggerHaptic('error')
      Alert.alert('Error', 'Failed to update item')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    triggerHaptic('medium')
    Alert.alert('Delete Item', `Are you sure you want to delete "${name}" from your pantry?`, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => triggerHaptic('light'),
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!id) return
          setIsDeleting(true)
          try {
            await deleteItem(id)
            triggerHaptic('success')
            router.back()
          } catch {
            triggerHaptic('error')
            Alert.alert('Error', 'Failed to delete item')
            setIsDeleting(false)
          }
        },
      },
    ])
  }

  const selectCategory = (cat: IngredientCategory) => {
    triggerHaptic('selection')
    setCategory(cat)
    setShowCategoryPicker(false)
  }

  // Handle case where item is not found
  if (!item) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Edit Item',
            headerLeft: () => (
              <AnimatedPressable onPress={() => router.back()} hapticType="light">
                <ThemedText style={[styles.headerButtonText, { color: colors.tint }]}>
                  Close
                </ThemedText>
              </AnimatedPressable>
            ),
          }}
        />
        <ThemedView style={[styles.container, styles.centerContent]}>
          <Icon name="alert-circle-outline" size={64} color={colors.textTertiary} />
          <ThemedText style={[styles.errorText, { color: colors.textTertiary }]}>
            Item not found
          </ThemedText>
          <ModernButton
            title="Go Back"
            onPress={() => router.back()}
            variant="secondary"
            style={{ marginTop: spacing.lg }}
          />
        </ThemedView>
      </>
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Edit Item',
          headerLeft: () => (
            <AnimatedPressable onPress={() => router.back()} hapticType="light">
              <ThemedText style={[styles.headerButtonText, { color: colors.tint }]}>
                Cancel
              </ThemedText>
            </AnimatedPressable>
          ),
          headerRight: () => (
            <AnimatedPressable
              onPress={handleSave}
              hapticType="medium"
              disabled={!isValid || isSaving}
            >
              <ThemedText
                style={[
                  styles.headerButtonText,
                  styles.headerButtonBold,
                  { color: isValid ? colors.tint : colors.textTertiary },
                ]}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </ThemedText>
            </AnimatedPressable>
          ),
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      >
        <ThemedView style={styles.container}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Item Details Section */}
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <SectionHeader title="Item Details" icon="information-circle-outline" />
              <View style={[styles.inputGroup, { backgroundColor: colors.card }, shadows.small]}>
                <View style={styles.inputRow}>
                  <ThemedText style={[styles.inputLabel, { color: colors.textTertiary }]}>
                    Name
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { color: colors.text }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="e.g., Eggs, Milk, Flour"
                    placeholderTextColor={colors.textTertiary}
                    autoCapitalize="words"
                  />
                </View>

                <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />

                <AnimatedPressable
                  onPress={() => {
                    triggerHaptic('selection')
                    setShowCategoryPicker(!showCategoryPicker)
                  }}
                  hapticType="none"
                  style={styles.inputRow}
                >
                  <ThemedText style={[styles.inputLabel, { color: colors.textTertiary }]}>
                    Category
                  </ThemedText>
                  <View style={styles.pickerButton}>
                    <ThemedText style={[styles.pickerButtonText, { color: colors.text }]}>
                      {category}
                    </ThemedText>
                    <Icon
                      name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.textTertiary}
                    />
                  </View>
                </AnimatedPressable>

                {showCategoryPicker && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    layout={Layout.springify()}
                    style={[styles.categoryPicker, { backgroundColor: colors.secondaryBackground }]}
                  >
                    {SIMPLE_CATEGORIES.map((cat) => (
                      <AnimatedPressable
                        key={cat}
                        onPress={() => selectCategory(cat)}
                        hapticType="selection"
                        style={[
                          styles.categoryOption,
                          category === cat && { backgroundColor: colors.accentSubtle },
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.categoryOptionText,
                            { color: category === cat ? colors.tint : colors.text },
                          ]}
                        >
                          {cat}
                        </ThemedText>
                        {category === cat && (
                          <Icon name="checkmark" size={18} color={colors.tint} />
                        )}
                      </AnimatedPressable>
                    ))}
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            {/* Quantity Section */}
            <Animated.View entering={FadeInDown.delay(200).duration(300)}>
              <SectionHeader title="Quantity (Optional)" icon="calculator-outline" />
              <View style={[styles.inputGroup, { backgroundColor: colors.card }, shadows.small]}>
                <View style={styles.quantityRow}>
                  <View style={styles.quantityInputContainer}>
                    <ThemedText style={[styles.inputLabel, { color: colors.textTertiary }]}>
                      Amount
                    </ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={quantity}
                      onChangeText={setQuantity}
                      placeholder="2"
                      placeholderTextColor={colors.textTertiary}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View
                    style={[styles.quantityDivider, { backgroundColor: colors.borderSubtle }]}
                  />
                  <View style={[styles.quantityInputContainer, styles.unitInput]}>
                    <ThemedText style={[styles.inputLabel, { color: colors.textTertiary }]}>
                      Unit
                    </ThemedText>
                    <TextInput
                      style={[styles.input, { color: colors.text }]}
                      value={unit}
                      onChangeText={setUnit}
                      placeholder="cups, lbs, etc."
                      placeholderTextColor={colors.textTertiary}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Expiration Section */}
            <Animated.View entering={FadeInDown.delay(300).duration(300)}>
              <SectionHeader title="Expiration" icon="time-outline" />
              <View style={[styles.inputGroup, { backgroundColor: colors.card }, shadows.small]}>
                <View style={styles.switchRow}>
                  <View>
                    <ThemedText style={styles.switchLabel}>Track Expiration</ThemedText>
                    <ThemedText style={[styles.switchHint, { color: colors.textTertiary }]}>
                      Get notified when items expire
                    </ThemedText>
                  </View>
                  <Switch
                    value={hasExpiration}
                    onValueChange={(value) => {
                      triggerHaptic('selection')
                      setHasExpiration(value)
                    }}
                    trackColor={{ false: colors.borderSubtle, true: colors.tint + '60' }}
                    thumbColor={hasExpiration ? colors.tint : colors.card}
                    ios_backgroundColor={colors.borderSubtle}
                  />
                </View>

                {hasExpiration && (
                  <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    layout={Layout.springify()}
                  >
                    <View style={[styles.divider, { backgroundColor: colors.borderSubtle }]} />
                    <AnimatedPressable
                      onPress={() => {
                        triggerHaptic('selection')
                        setShowDatePicker(true)
                      }}
                      hapticType="none"
                      style={styles.datePickerRow}
                    >
                      <ThemedText style={[styles.inputLabel, { color: colors.textTertiary }]}>
                        Expires
                      </ThemedText>
                      {Platform.OS === 'ios' ? (
                        <DateTimePicker
                          value={expirationDate}
                          mode="date"
                          display="default"
                          onChange={(event, date) => {
                            if (date) {
                              triggerHaptic('selection')
                              setExpirationDate(date)
                            }
                          }}
                          minimumDate={new Date()}
                          accentColor={colors.tint}
                        />
                      ) : (
                        <View style={styles.dateDisplay}>
                          <ThemedText style={[styles.dateText, { color: colors.text }]}>
                            {expirationDate.toLocaleDateString()}
                          </ThemedText>
                          <Icon name="calendar-outline" size={20} color={colors.tint} />
                        </View>
                      )}
                    </AnimatedPressable>
                    {Platform.OS === 'android' && showDatePicker && (
                      <DateTimePicker
                        value={expirationDate}
                        mode="date"
                        display="default"
                        onChange={(event, date) => {
                          setShowDatePicker(false)
                          if (event.type === 'set' && date) {
                            triggerHaptic('selection')
                            setExpirationDate(date)
                          }
                        }}
                        minimumDate={new Date()}
                      />
                    )}
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            {/* Notes Section */}
            <Animated.View entering={FadeInDown.delay(400).duration(300)}>
              <SectionHeader title="Notes (Optional)" icon="document-text-outline" />
              <View style={[styles.inputGroup, { backgroundColor: colors.card }, shadows.small]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any notes about this item..."
                  placeholderTextColor={colors.textTertiary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </Animated.View>

            {/* Delete Button Section */}
            <Animated.View entering={FadeInDown.delay(500).duration(300)}>
              <View style={styles.deleteSection}>
                <ModernButton
                  title={isDeleting ? 'Deleting...' : 'Delete Item'}
                  onPress={handleDelete}
                  variant="danger"
                  icon="trash-outline"
                  fullWidth
                  disabled={isDeleting}
                />
                <ThemedText style={[styles.deleteHint, { color: colors.textTertiary }]}>
                  This action cannot be undone
                </ThemedText>
              </View>
            </Animated.View>

            {/* Bottom spacer for keyboard */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </ThemedView>
      </KeyboardAvoidingView>
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    ...typography.bodyLarge,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing['4xl'],
  },
  headerButtonText: {
    fontSize: 17,
  },
  headerButtonBold: {
    fontWeight: '600',
  },
  inputGroup: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 50,
  },
  inputLabel: {
    ...typography.bodyMedium,
    marginRight: spacing.md,
  },
  input: {
    flex: 1,
    ...typography.bodyLarge,
    textAlign: 'right',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: spacing.lg,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickerButtonText: {
    ...typography.bodyLarge,
  },
  categoryPicker: {
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    marginHorizontal: spacing.xs,
  },
  categoryOptionText: {
    ...typography.bodyMedium,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityInputContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  quantityDivider: {
    width: StyleSheet.hairlineWidth,
    height: '60%',
  },
  unitInput: {
    flex: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  switchLabel: {
    ...typography.bodyLarge,
  },
  switchHint: {
    ...typography.caption,
    marginTop: 2,
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 50,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateText: {
    ...typography.bodyLarge,
  },
  textArea: {
    minHeight: 80,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    textAlign: 'left',
  },
  deleteSection: {
    marginTop: spacing['2xl'],
    marginHorizontal: spacing.lg,
    alignItems: 'center',
  },
  deleteHint: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
  bottomSpacer: {
    height: 100,
  },
})
