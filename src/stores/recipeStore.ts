import { create } from 'zustand'
import { db } from '../db/client'
import { recipes, ingredients } from '../db/schema'
import { eq } from 'drizzle-orm'
import { RecipeWithIngredients, SourceType, IngredientCategory } from '../types'
import * as crypto from 'expo-crypto'

interface RecipeState {
  recipes: RecipeWithIngredients[]
  isLoading: boolean
  error: string | null

  // Actions
  loadRecipes: () => Promise<void>
  getRecipe: (id: string) => RecipeWithIngredients | undefined
  addRecipe: (recipe: Omit<RecipeWithIngredients, 'id' | 'dateAdded'>) => Promise<string>
  updateRecipe: (id: string, updates: Partial<RecipeWithIngredients>) => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  toggleQueue: (id: string) => Promise<void>
  markAsCooked: (id: string) => Promise<void>
  searchRecipes: (query: string) => RecipeWithIngredients[]
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  isLoading: false,
  error: null,

  loadRecipes: async () => {
    set({ isLoading: true, error: null })
    try {
      const allRecipes = await db.select().from(recipes).orderBy(recipes.dateAdded)
      const allIngredients = await db.select().from(ingredients)

      const recipesWithIngredients: RecipeWithIngredients[] = allRecipes.map((recipe) => ({
        ...recipe,
        sourceType: recipe.sourceType as SourceType,
        ingredients: allIngredients
          .filter((i) => i.recipeId === recipe.id)
          .map((i) => ({
            ...i,
            category: i.category as IngredientCategory,
          })),
      }))

      set({ recipes: recipesWithIngredients, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  getRecipe: (id: string) => {
    return get().recipes.find((r) => r.id === id)
  },

  addRecipe: async (recipeData) => {
    const id = crypto.randomUUID()
    const now = Date.now()

    try {
      // Insert recipe
      await db.insert(recipes).values({
        id,
        title: recipeData.title,
        sourceURL: recipeData.sourceURL,
        sourceType: recipeData.sourceType,
        imageURL: recipeData.imageURL,
        servings: recipeData.servings,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        instructions: JSON.stringify(
          typeof recipeData.instructions === 'string'
            ? JSON.parse(recipeData.instructions)
            : recipeData.instructions || []
        ),
        notes: recipeData.notes,
        isInQueue: recipeData.isInQueue || false,
        dateAdded: now,
        dateCooked: recipeData.dateCooked,
      })

      // Insert ingredients
      if (recipeData.ingredients && recipeData.ingredients.length > 0) {
        for (const ingredient of recipeData.ingredients) {
          await db.insert(ingredients).values({
            id: crypto.randomUUID(),
            recipeId: id,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category,
            isOptional: ingredient.isOptional,
          })
        }
      }

      // Reload recipes
      await get().loadRecipes()
      return id
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  updateRecipe: async (id, updates) => {
    try {
      const updateValues: Record<string, unknown> = {}

      if (updates.title !== undefined) updateValues.title = updates.title
      if (updates.sourceURL !== undefined) updateValues.sourceURL = updates.sourceURL
      if (updates.sourceType !== undefined) updateValues.sourceType = updates.sourceType
      if (updates.imageURL !== undefined) updateValues.imageURL = updates.imageURL
      if (updates.servings !== undefined) updateValues.servings = updates.servings
      if (updates.prepTime !== undefined) updateValues.prepTime = updates.prepTime
      if (updates.cookTime !== undefined) updateValues.cookTime = updates.cookTime
      if (updates.instructions !== undefined) {
        updateValues.instructions =
          typeof updates.instructions === 'string'
            ? updates.instructions
            : JSON.stringify(updates.instructions)
      }
      if (updates.notes !== undefined) updateValues.notes = updates.notes
      if (updates.isInQueue !== undefined) updateValues.isInQueue = updates.isInQueue
      if (updates.dateCooked !== undefined) updateValues.dateCooked = updates.dateCooked

      if (Object.keys(updateValues).length > 0) {
        await db.update(recipes).set(updateValues).where(eq(recipes.id, id))
      }

      // Update ingredients if provided
      if (updates.ingredients) {
        // Delete existing ingredients
        await db.delete(ingredients).where(eq(ingredients.recipeId, id))

        // Insert new ingredients
        for (const ingredient of updates.ingredients) {
          await db.insert(ingredients).values({
            id: crypto.randomUUID(),
            recipeId: id,
            name: ingredient.name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            category: ingredient.category,
            isOptional: ingredient.isOptional,
          })
        }
      }

      await get().loadRecipes()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteRecipe: async (id) => {
    try {
      await db.delete(recipes).where(eq(recipes.id, id))
      set({ recipes: get().recipes.filter((r) => r.id !== id) })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  toggleQueue: async (id) => {
    const recipe = get().getRecipe(id)
    if (recipe) {
      await get().updateRecipe(id, { isInQueue: !recipe.isInQueue })
    }
  },

  markAsCooked: async (id) => {
    await get().updateRecipe(id, { dateCooked: Date.now() })
  },

  searchRecipes: (query: string) => {
    const searchLower = query.toLowerCase()
    return get().recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(searchLower) ||
        r.ingredients.some((i) => i.name.toLowerCase().includes(searchLower))
    )
  },
}))
