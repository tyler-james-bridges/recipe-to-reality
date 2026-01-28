/**
 * Pantry matching utilities
 * Ported from PantryItem.swift
 */

import { PantryItem, Ingredient, RecipeWithIngredients } from '../types'

// Common modifiers to ignore when matching
const COMMON_MODIFIERS = new Set([
  'fresh',
  'large',
  'small',
  'medium',
  'organic',
  'chopped',
  'diced',
  'minced',
  'sliced',
  'crushed',
  'ground',
  'whole',
  'dried',
  'frozen',
  'canned',
  'raw',
  'cooked',
  'boneless',
  'skinless',
  'extra',
  'virgin',
  'light',
  'dark',
  'sweet',
  'unsalted',
  'salted',
  'plain',
  'flavored',
  'ripe',
  'unripe',
])

/**
 * Check if a pantry item matches an ingredient
 */
export function matchesIngredient(pantryName: string, ingredientName: string): boolean {
  const p = pantryName.toLowerCase().trim()
  const i = ingredientName.toLowerCase().trim()

  // Level 1: Exact match
  if (p === i) {
    return true
  }

  // Level 2: Substring match
  if (i.includes(p) || p.includes(i)) {
    return true
  }

  // Level 3: Word intersection (ignoring modifiers)
  const pantryWords = new Set(
    p.split(/\s+/).filter((word) => !COMMON_MODIFIERS.has(word) && word.length > 2)
  )
  const ingredientWords = new Set(
    i.split(/\s+/).filter((word) => !COMMON_MODIFIERS.has(word) && word.length > 2)
  )

  // Check for any common keywords
  for (const word of pantryWords) {
    if (ingredientWords.has(word)) {
      return true
    }
  }

  return false
}

/**
 * Check if a pantry item is expired
 */
export function isExpired(item: PantryItem): boolean {
  if (!item.expirationDate) {
    return false
  }
  return item.expirationDate < Date.now()
}

/**
 * Check if a pantry item is expiring soon (within 3 days)
 */
export function isExpiringSoon(item: PantryItem): boolean {
  if (!item.expirationDate) {
    return false
  }
  const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000
  return item.expirationDate <= threeDaysFromNow && !isExpired(item)
}

/**
 * Calculate match percentage for a recipe based on pantry items
 */
export function calculateRecipeMatch(
  recipe: RecipeWithIngredients,
  pantryItems: PantryItem[]
): number {
  if (recipe.ingredients.length === 0) {
    return 0
  }

  const requiredIngredients = recipe.ingredients.filter((i) => !i.isOptional)
  if (requiredIngredients.length === 0) {
    return 100
  }

  const matchedCount = requiredIngredients.filter((ingredient) =>
    pantryItems.some((pantryItem) => matchesIngredient(pantryItem.name, ingredient.name))
  ).length

  return Math.round((matchedCount / requiredIngredients.length) * 100)
}

/**
 * Get missing ingredients for a recipe
 */
export function getMissingIngredients(
  recipe: RecipeWithIngredients,
  pantryItems: PantryItem[]
): Ingredient[] {
  return recipe.ingredients.filter(
    (ingredient) =>
      !ingredient.isOptional &&
      !pantryItems.some((pantryItem) => matchesIngredient(pantryItem.name, ingredient.name))
  )
}

/**
 * Get matched ingredients for a recipe
 */
export function getMatchedIngredients(
  recipe: RecipeWithIngredients,
  pantryItems: PantryItem[]
): Ingredient[] {
  return recipe.ingredients.filter((ingredient) =>
    pantryItems.some((pantryItem) => matchesIngredient(pantryItem.name, ingredient.name))
  )
}

/**
 * Rank recipes by how many ingredients are available in pantry
 */
export function rankRecipesByPantry(
  recipes: RecipeWithIngredients[],
  pantryItems: PantryItem[]
): { recipe: RecipeWithIngredients; matchPercentage: number; missingCount: number }[] {
  return recipes
    .map((recipe) => ({
      recipe,
      matchPercentage: calculateRecipeMatch(recipe, pantryItems),
      missingCount: getMissingIngredients(recipe, pantryItems).length,
    }))
    .sort((a, b) => {
      // Sort by match percentage descending, then by missing count ascending
      if (b.matchPercentage !== a.matchPercentage) {
        return b.matchPercentage - a.matchPercentage
      }
      return a.missingCount - b.missingCount
    })
}
