/**
 * React Query hooks for recipes
 * Provides caching, background refetching, and optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../db/client';
import { recipes, ingredients } from '../db/schema';
import { eq } from 'drizzle-orm';
import { RecipeWithIngredients, SourceType, IngredientCategory } from '../types';
import * as crypto from 'expo-crypto';

// Query keys for cache management
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
};

/**
 * Fetch all recipes from database
 */
async function fetchRecipes(): Promise<RecipeWithIngredients[]> {
  const allRecipes = await db.select().from(recipes).orderBy(recipes.dateAdded);
  const allIngredients = await db.select().from(ingredients);

  return allRecipes.map((recipe) => ({
    ...recipe,
    sourceType: recipe.sourceType as SourceType,
    ingredients: allIngredients
      .filter((i) => i.recipeId === recipe.id)
      .map((i) => ({
        ...i,
        category: i.category as IngredientCategory,
      })),
  }));
}

/**
 * Fetch a single recipe by ID
 */
async function fetchRecipe(id: string): Promise<RecipeWithIngredients | null> {
  const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
  if (!recipe) return null;

  const recipeIngredients = await db
    .select()
    .from(ingredients)
    .where(eq(ingredients.recipeId, id));

  return {
    ...recipe,
    sourceType: recipe.sourceType as SourceType,
    ingredients: recipeIngredients.map((i) => ({
      ...i,
      category: i.category as IngredientCategory,
    })),
  };
}

/**
 * Hook to fetch all recipes
 */
export function useRecipes() {
  return useQuery({
    queryKey: recipeKeys.lists(),
    queryFn: fetchRecipes,
    staleTime: 1000 * 60 * 5, // Consider fresh for 5 minutes
  });
}

/**
 * Hook to fetch a single recipe
 */
export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => fetchRecipe(id),
    enabled: !!id,
  });
}

/**
 * Hook to add a new recipe
 */
export function useAddRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      recipeData: Omit<RecipeWithIngredients, 'id' | 'dateAdded'>
    ): Promise<string> => {
      const id = crypto.randomUUID();
      const now = Date.now();

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
        instructions:
          typeof recipeData.instructions === 'string'
            ? recipeData.instructions
            : JSON.stringify(recipeData.instructions || []),
        notes: recipeData.notes,
        isInQueue: recipeData.isInQueue || false,
        dateAdded: now,
        dateCooked: recipeData.dateCooked,
      });

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
          });
        }
      }

      return id;
    },
    onSuccess: () => {
      // Invalidate and refetch recipes list
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

/**
 * Hook to update a recipe
 */
export function useUpdateRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<RecipeWithIngredients>;
    }) => {
      const updateValues: Record<string, unknown> = {};

      if (updates.title !== undefined) updateValues.title = updates.title;
      if (updates.sourceURL !== undefined) updateValues.sourceURL = updates.sourceURL;
      if (updates.sourceType !== undefined) updateValues.sourceType = updates.sourceType;
      if (updates.imageURL !== undefined) updateValues.imageURL = updates.imageURL;
      if (updates.servings !== undefined) updateValues.servings = updates.servings;
      if (updates.prepTime !== undefined) updateValues.prepTime = updates.prepTime;
      if (updates.cookTime !== undefined) updateValues.cookTime = updates.cookTime;
      if (updates.instructions !== undefined) {
        updateValues.instructions =
          typeof updates.instructions === 'string'
            ? updates.instructions
            : JSON.stringify(updates.instructions);
      }
      if (updates.notes !== undefined) updateValues.notes = updates.notes;
      if (updates.isInQueue !== undefined) updateValues.isInQueue = updates.isInQueue;
      if (updates.dateCooked !== undefined) updateValues.dateCooked = updates.dateCooked;

      if (Object.keys(updateValues).length > 0) {
        await db.update(recipes).set(updateValues).where(eq(recipes.id, id));
      }

      // Update ingredients if provided
      if (updates.ingredients) {
        // Delete existing ingredients
        await db.delete(ingredients).where(eq(ingredients.recipeId, id));

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
          });
        }
      }
    },
    onSuccess: (_, { id }) => {
      // Invalidate both the list and the specific recipe
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
    },
  });
}

/**
 * Hook to delete a recipe
 */
export function useDeleteRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.delete(recipes).where(eq(recipes.id, id));
    },
    onSuccess: (_, id) => {
      // Remove from cache and invalidate list
      queryClient.removeQueries({ queryKey: recipeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

/**
 * Hook to toggle queue status with optimistic updates
 */
export function useToggleQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isInQueue }: { id: string; isInQueue: boolean }) => {
      await db.update(recipes).set({ isInQueue: !isInQueue }).where(eq(recipes.id, id));
    },
    onMutate: async ({ id, isInQueue }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: recipeKeys.lists() });

      // Snapshot the previous value
      const previousRecipes = queryClient.getQueryData<RecipeWithIngredients[]>(
        recipeKeys.lists()
      );

      // Optimistically update the cache
      if (previousRecipes) {
        queryClient.setQueryData<RecipeWithIngredients[]>(recipeKeys.lists(), (old) =>
          old?.map((r) => (r.id === id ? { ...r, isInQueue: !isInQueue } : r))
        );
      }

      return { previousRecipes };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context?.previousRecipes) {
        queryClient.setQueryData(recipeKeys.lists(), context.previousRecipes);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
    },
  });
}

/**
 * Hook to mark a recipe as cooked
 */
export function useMarkAsCooked() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await db.update(recipes).set({ dateCooked: Date.now() }).where(eq(recipes.id, id));
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: recipeKeys.lists() });
      queryClient.invalidateQueries({ queryKey: recipeKeys.detail(id) });
    },
  });
}

/**
 * Search recipes by query
 */
export function useSearchRecipes(query: string) {
  const { data: allRecipes } = useRecipes();

  if (!query || !allRecipes) {
    return allRecipes || [];
  }

  const searchLower = query.toLowerCase();
  return allRecipes.filter(
    (r) =>
      r.title.toLowerCase().includes(searchLower) ||
      r.ingredients.some((i) => i.name.toLowerCase().includes(searchLower))
  );
}
