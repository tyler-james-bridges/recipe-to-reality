import {
  matchesIngredient,
  isExpired,
  isExpiringSoon,
  calculateRecipeMatch,
  getMissingIngredients,
  getMatchedIngredients,
  rankRecipesByPantry,
} from '../../utils/pantryMatching'
import { PantryItem, RecipeWithIngredients, IngredientCategory } from '../../types'

describe('pantryMatching', () => {
  const mockPantryItems: PantryItem[] = [
    {
      id: 'pantry-1',
      name: 'flour',
      category: 'Pantry',
      quantity: '5',
      unit: 'cups',
      dateAdded: Date.now(),
      expirationDate: null,
      notes: null,
    },
    {
      id: 'pantry-2',
      name: 'sugar',
      category: 'Pantry',
      quantity: '2',
      unit: 'cups',
      dateAdded: Date.now(),
      expirationDate: null,
      notes: null,
    },
    {
      id: 'pantry-3',
      name: 'fresh tomatoes',
      category: 'Produce',
      quantity: '3',
      unit: null,
      dateAdded: Date.now(),
      expirationDate: Date.now() + 2 * 24 * 60 * 60 * 1000, // Expires in 2 days
      notes: null,
    },
    {
      id: 'pantry-4',
      name: 'milk',
      category: 'Dairy & Eggs',
      quantity: '1',
      unit: 'gallon',
      dateAdded: Date.now(),
      expirationDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // Expired 1 day ago
      notes: null,
    },
  ]

  const mockRecipe: RecipeWithIngredients = {
    id: 'recipe-1',
    title: 'Test Recipe',
    sourceURL: null,
    sourceType: 'manual',
    imageURL: null,
    servings: 4,
    prepTime: null,
    cookTime: null,
    instructions: '[]',
    notes: null,
    isInQueue: false,
    dateAdded: Date.now(),
    dateCooked: null,
    ingredients: [
      {
        id: 'ing-1',
        recipeId: 'recipe-1',
        name: 'flour',
        quantity: '2',
        unit: 'cups',
        category: 'Pantry',
        isOptional: false,
      },
      {
        id: 'ing-2',
        recipeId: 'recipe-1',
        name: 'sugar',
        quantity: '1',
        unit: 'cup',
        category: 'Pantry',
        isOptional: false,
      },
      {
        id: 'ing-3',
        recipeId: 'recipe-1',
        name: 'eggs',
        quantity: '2',
        unit: null,
        category: 'Dairy & Eggs',
        isOptional: false,
      },
    ],
  }

  describe('matchesIngredient', () => {
    it('matches exact names', () => {
      expect(matchesIngredient('flour', 'flour')).toBe(true)
      expect(matchesIngredient('sugar', 'sugar')).toBe(true)
    })

    it('matches case-insensitively', () => {
      expect(matchesIngredient('FLOUR', 'flour')).toBe(true)
      expect(matchesIngredient('flour', 'FLOUR')).toBe(true)
      expect(matchesIngredient('Sugar', 'sugar')).toBe(true)
    })

    it('matches with substrings', () => {
      expect(matchesIngredient('flour', 'all-purpose flour')).toBe(true)
      expect(matchesIngredient('all-purpose flour', 'flour')).toBe(true)
      expect(matchesIngredient('tomato', 'fresh tomatoes')).toBe(true)
    })

    it('ignores common modifiers', () => {
      expect(matchesIngredient('tomatoes', 'fresh tomatoes')).toBe(true)
      expect(matchesIngredient('chicken', 'boneless skinless chicken')).toBe(true)
      expect(matchesIngredient('cheese', 'shredded cheddar cheese')).toBe(true)
    })

    it('matches by word intersection', () => {
      expect(matchesIngredient('cheddar cheese', 'cheese cheddar')).toBe(true)
      expect(matchesIngredient('olive oil', 'extra virgin olive oil')).toBe(true)
    })

    it('does not match different items', () => {
      expect(matchesIngredient('flour', 'sugar')).toBe(false)
      expect(matchesIngredient('salt', 'pepper')).toBe(false)
    })

    it('handles whitespace', () => {
      expect(matchesIngredient('  flour  ', 'flour')).toBe(true)
      expect(matchesIngredient('flour', '  flour  ')).toBe(true)
    })

    it('does not match very short words', () => {
      // Short words (2 chars or less) are filtered out in word matching
      expect(matchesIngredient('a', 'b')).toBe(false)
    })
  })

  describe('isExpired', () => {
    it('returns false for items without expiration date', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: null,
      }

      expect(isExpired(item)).toBe(false)
    })

    it('returns true for expired items', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      }

      expect(isExpired(item)).toBe(true)
    })

    it('returns false for items expiring in the future', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days from now
      }

      expect(isExpired(item)).toBe(false)
    })

    it('returns true for items expiring now', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: Date.now() - 1, // 1ms ago
      }

      expect(isExpired(item)).toBe(true)
    })
  })

  describe('isExpiringSoon', () => {
    it('returns false for items without expiration date', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: null,
      }

      expect(isExpiringSoon(item)).toBe(false)
    })

    it('returns true for items expiring within 3 days', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: Date.now() + 2 * 24 * 60 * 60 * 1000, // 2 days from now
      }

      expect(isExpiringSoon(item)).toBe(true)
    })

    it('returns false for items expiring more than 3 days away', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days from now
      }

      expect(isExpiringSoon(item)).toBe(false)
    })

    it('returns false for already expired items', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
      }

      expect(isExpiringSoon(item)).toBe(false)
    })

    it('returns true for items expiring exactly in 3 days', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: Date.now() + 3 * 24 * 60 * 60 * 1000,
      }

      expect(isExpiringSoon(item)).toBe(true)
    })

    it('returns true for items expiring today', () => {
      const item: PantryItem = {
        ...mockPantryItems[0],
        expirationDate: Date.now() + 1000, // 1 second from now
      }

      expect(isExpiringSoon(item)).toBe(true)
    })
  })

  describe('calculateRecipeMatch', () => {
    it('returns 100% for recipe with all ingredients in pantry', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'flour',
            quantity: '2',
            unit: 'cups',
            category: 'Pantry',
            isOptional: false,
          },
          {
            id: 'ing-2',
            recipeId: 'recipe-1',
            name: 'sugar',
            quantity: '1',
            unit: 'cup',
            category: 'Pantry',
            isOptional: false,
          },
        ],
      }

      expect(calculateRecipeMatch(recipe, mockPantryItems)).toBe(100)
    })

    it('returns 0% for recipe with no matching ingredients', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'chicken',
            quantity: '1',
            unit: 'lb',
            category: 'Meat & Seafood',
            isOptional: false,
          },
        ],
      }

      expect(calculateRecipeMatch(recipe, mockPantryItems)).toBe(0)
    })

    it('calculates partial match percentage', () => {
      // Recipe has 3 ingredients, 2 are in pantry (flour, sugar), 1 is not (eggs)
      expect(calculateRecipeMatch(mockRecipe, mockPantryItems)).toBe(67)
    })

    it('ignores optional ingredients in calculation', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'flour',
            quantity: '2',
            unit: 'cups',
            category: 'Pantry',
            isOptional: false,
          },
          {
            id: 'ing-2',
            recipeId: 'recipe-1',
            name: 'chicken',
            quantity: '1',
            unit: 'lb',
            category: 'Meat & Seafood',
            isOptional: true, // Optional, should be ignored
          },
        ],
      }

      // Only flour counts (1/1 = 100%)
      expect(calculateRecipeMatch(recipe, mockPantryItems)).toBe(100)
    })

    it('returns 0% for recipe with no ingredients', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [],
      }

      expect(calculateRecipeMatch(recipe, mockPantryItems)).toBe(0)
    })

    it('returns 100% for recipe with only optional ingredients', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'chicken',
            quantity: '1',
            unit: 'lb',
            category: 'Meat & Seafood',
            isOptional: true,
          },
        ],
      }

      expect(calculateRecipeMatch(recipe, mockPantryItems)).toBe(100)
    })

    it('handles empty pantry', () => {
      expect(calculateRecipeMatch(mockRecipe, [])).toBe(0)
    })
  })

  describe('getMissingIngredients', () => {
    it('returns ingredients not in pantry', () => {
      const missing = getMissingIngredients(mockRecipe, mockPantryItems)

      expect(missing).toHaveLength(1)
      expect(missing[0].name).toBe('eggs')
    })

    it('returns empty array when all ingredients available', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'flour',
            quantity: '2',
            unit: 'cups',
            category: 'Pantry',
            isOptional: false,
          },
        ],
      }

      const missing = getMissingIngredients(recipe, mockPantryItems)

      expect(missing).toHaveLength(0)
    })

    it('ignores optional ingredients', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'flour',
            quantity: '2',
            unit: 'cups',
            category: 'Pantry',
            isOptional: false,
          },
          {
            id: 'ing-2',
            recipeId: 'recipe-1',
            name: 'chicken',
            quantity: '1',
            unit: 'lb',
            category: 'Meat & Seafood',
            isOptional: true,
          },
        ],
      }

      const missing = getMissingIngredients(recipe, mockPantryItems)

      expect(missing).toHaveLength(0)
    })

    it('returns all ingredients for empty pantry', () => {
      const missing = getMissingIngredients(mockRecipe, [])

      expect(missing).toHaveLength(3)
    })
  })

  describe('getMatchedIngredients', () => {
    it('returns ingredients that are in pantry', () => {
      const matched = getMatchedIngredients(mockRecipe, mockPantryItems)

      expect(matched).toHaveLength(2)
      expect(matched.map((i) => i.name)).toContain('flour')
      expect(matched.map((i) => i.name)).toContain('sugar')
    })

    it('returns empty array when no ingredients match', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'chicken',
            quantity: '1',
            unit: 'lb',
            category: 'Meat & Seafood',
            isOptional: false,
          },
        ],
      }

      const matched = getMatchedIngredients(recipe, mockPantryItems)

      expect(matched).toHaveLength(0)
    })

    it('includes optional ingredients if matched', () => {
      const recipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [
          {
            id: 'ing-1',
            recipeId: 'recipe-1',
            name: 'flour',
            quantity: '2',
            unit: 'cups',
            category: 'Pantry',
            isOptional: true,
          },
        ],
      }

      const matched = getMatchedIngredients(recipe, mockPantryItems)

      expect(matched).toHaveLength(1)
      expect(matched[0].name).toBe('flour')
    })

    it('returns empty array for empty pantry', () => {
      const matched = getMatchedIngredients(mockRecipe, [])

      expect(matched).toHaveLength(0)
    })
  })

  describe('rankRecipesByPantry', () => {
    const recipe1: RecipeWithIngredients = {
      ...mockRecipe,
      id: 'recipe-1',
      title: 'Perfect Match',
      ingredients: [
        {
          id: 'ing-1',
          recipeId: 'recipe-1',
          name: 'flour',
          quantity: '2',
          unit: 'cups',
          category: 'Pantry',
          isOptional: false,
        },
        {
          id: 'ing-2',
          recipeId: 'recipe-1',
          name: 'sugar',
          quantity: '1',
          unit: 'cup',
          category: 'Pantry',
          isOptional: false,
        },
      ],
    }

    const recipe2: RecipeWithIngredients = {
      ...mockRecipe,
      id: 'recipe-2',
      title: 'Partial Match',
      ingredients: [
        {
          id: 'ing-3',
          recipeId: 'recipe-2',
          name: 'flour',
          quantity: '2',
          unit: 'cups',
          category: 'Pantry',
          isOptional: false,
        },
        {
          id: 'ing-4',
          recipeId: 'recipe-2',
          name: 'eggs',
          quantity: '2',
          unit: null,
          category: 'Dairy & Eggs',
          isOptional: false,
        },
      ],
    }

    const recipe3: RecipeWithIngredients = {
      ...mockRecipe,
      id: 'recipe-3',
      title: 'No Match',
      ingredients: [
        {
          id: 'ing-5',
          recipeId: 'recipe-3',
          name: 'chicken',
          quantity: '1',
          unit: 'lb',
          category: 'Meat & Seafood',
          isOptional: false,
        },
        {
          id: 'ing-6',
          recipeId: 'recipe-3',
          name: 'rice',
          quantity: '1',
          unit: 'cup',
          category: 'Pantry',
          isOptional: false,
        },
      ],
    }

    it('ranks recipes by match percentage', () => {
      const ranked = rankRecipesByPantry([recipe3, recipe1, recipe2], mockPantryItems)

      expect(ranked[0].recipe.id).toBe('recipe-1')
      expect(ranked[0].matchPercentage).toBe(100)
      expect(ranked[1].recipe.id).toBe('recipe-2')
      expect(ranked[1].matchPercentage).toBe(50)
      expect(ranked[2].recipe.id).toBe('recipe-3')
      expect(ranked[2].matchPercentage).toBe(0)
    })

    it('uses missing count as tiebreaker', () => {
      const recipe4: RecipeWithIngredients = {
        ...mockRecipe,
        id: 'recipe-4',
        title: 'Partial Match 2',
        ingredients: [
          {
            id: 'ing-7',
            recipeId: 'recipe-4',
            name: 'flour',
            quantity: '2',
            unit: 'cups',
            category: 'Pantry',
            isOptional: false,
          },
          {
            id: 'ing-8',
            recipeId: 'recipe-4',
            name: 'eggs',
            quantity: '2',
            unit: null,
            category: 'Dairy & Eggs',
            isOptional: false,
          },
          {
            id: 'ing-9',
            recipeId: 'recipe-4',
            name: 'chicken',
            quantity: '1',
            unit: 'lb',
            category: 'Meat & Seafood',
            isOptional: false,
          },
        ],
      }

      // recipe2 and recipe4 both have 50% match, but recipe2 has fewer missing items
      const ranked = rankRecipesByPantry([recipe4, recipe2], mockPantryItems)

      expect(ranked[0].recipe.id).toBe('recipe-2')
      expect(ranked[0].missingCount).toBe(1)
      expect(ranked[1].recipe.id).toBe('recipe-4')
      expect(ranked[1].missingCount).toBe(2)
    })

    it('includes match percentage and missing count in results', () => {
      const ranked = rankRecipesByPantry([recipe1], mockPantryItems)

      expect(ranked[0]).toHaveProperty('recipe')
      expect(ranked[0]).toHaveProperty('matchPercentage')
      expect(ranked[0]).toHaveProperty('missingCount')
      expect(ranked[0].matchPercentage).toBe(100)
      expect(ranked[0].missingCount).toBe(0)
    })

    it('handles empty recipe list', () => {
      const ranked = rankRecipesByPantry([], mockPantryItems)

      expect(ranked).toHaveLength(0)
    })

    it('handles empty pantry', () => {
      const ranked = rankRecipesByPantry([recipe1, recipe2], [])

      expect(ranked[0].matchPercentage).toBe(0)
      expect(ranked[1].matchPercentage).toBe(0)
    })
  })
})
