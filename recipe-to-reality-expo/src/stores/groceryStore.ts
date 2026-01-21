import { create } from 'zustand';
import { db } from '../db/client';
import { groceryLists, groceryItems } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { GroceryListWithItems, GroceryItem, IngredientCategory, RecipeWithIngredients } from '../types';
import { combineQuantities } from '../utils/quantity';
import * as crypto from 'expo-crypto';

interface GroceryState {
  currentList: GroceryListWithItems | null;
  lists: GroceryListWithItems[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadCurrentList: () => Promise<void>;
  loadAllLists: () => Promise<void>;
  createList: (name?: string) => Promise<string>;
  generateFromRecipes: (recipes: RecipeWithIngredients[], name?: string) => Promise<string>;
  addItem: (
    listId: string,
    item: Omit<GroceryItem, 'id' | 'groceryListId' | 'isChecked' | 'sourceRecipeIds'>
  ) => Promise<void>;
  toggleItem: (itemId: string) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  clearChecked: () => Promise<void>;
  clearAll: () => Promise<void>;
  deleteList: (listId: string) => Promise<void>;
}

export const useGroceryStore = create<GroceryState>((set, get) => ({
  currentList: null,
  lists: [],
  isLoading: false,
  error: null,

  loadCurrentList: async () => {
    set({ isLoading: true, error: null });
    try {
      // Get most recent list
      const lists = await db.select().from(groceryLists).orderBy(desc(groceryLists.dateCreated)).limit(1);

      if (lists.length === 0) {
        set({ currentList: null, isLoading: false });
        return;
      }

      const list = lists[0];
      const items = await db.select().from(groceryItems).where(eq(groceryItems.groceryListId, list.id));

      const mappedItems: GroceryItem[] = items.map((item) => ({
        ...item,
        category: item.category as IngredientCategory,
      }));

      set({
        currentList: {
          ...list,
          items: mappedItems,
        },
        isLoading: false,
      });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadAllLists: async () => {
    set({ isLoading: true, error: null });
    try {
      const allLists = await db.select().from(groceryLists).orderBy(desc(groceryLists.dateCreated));
      const allItems = await db.select().from(groceryItems);

      const listsWithItems: GroceryListWithItems[] = allLists.map((list) => ({
        ...list,
        items: allItems
          .filter((item) => item.groceryListId === list.id)
          .map((item) => ({
            ...item,
            category: item.category as IngredientCategory,
          })),
      }));

      set({ lists: listsWithItems, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createList: async (name = 'Shopping List') => {
    const id = crypto.randomUUID();
    const now = Date.now();

    try {
      await db.insert(groceryLists).values({
        id,
        name,
        dateCreated: now,
      });

      await get().loadCurrentList();
      return id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  generateFromRecipes: async (recipes, name = 'Shopping List') => {
    const listId = crypto.randomUUID();
    const now = Date.now();

    try {
      // Create new list
      await db.insert(groceryLists).values({
        id: listId,
        name,
        dateCreated: now,
      });

      // Consolidate ingredients
      const consolidated: Record<
        string,
        {
          name: string;
          quantity: string | null;
          unit: string | null;
          category: IngredientCategory;
          sourceRecipeIds: string[];
        }
      > = {};

      for (const recipe of recipes) {
        for (const ingredient of recipe.ingredients) {
          const key = ingredient.name.toLowerCase().trim();

          if (consolidated[key]) {
            // Combine quantities
            consolidated[key].sourceRecipeIds.push(recipe.id);
            if (ingredient.quantity && consolidated[key].quantity) {
              consolidated[key].quantity = combineQuantities(
                consolidated[key].quantity!,
                ingredient.quantity
              );
            }
          } else {
            consolidated[key] = {
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              category: ingredient.category,
              sourceRecipeIds: [recipe.id],
            };
          }
        }
      }

      // Insert consolidated items
      for (const item of Object.values(consolidated)) {
        await db.insert(groceryItems).values({
          id: crypto.randomUUID(),
          groceryListId: listId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          isChecked: false,
          sourceRecipeIds: JSON.stringify(item.sourceRecipeIds),
        });
      }

      await get().loadCurrentList();
      return listId;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  addItem: async (listId, itemData) => {
    try {
      await db.insert(groceryItems).values({
        id: crypto.randomUUID(),
        groceryListId: listId,
        name: itemData.name,
        quantity: itemData.quantity,
        unit: itemData.unit,
        category: itemData.category,
        isChecked: false,
        sourceRecipeIds: '[]',
      });

      await get().loadCurrentList();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  toggleItem: async (itemId) => {
    try {
      const currentList = get().currentList;
      if (!currentList) return;

      const item = currentList.items.find((i) => i.id === itemId);
      if (!item) return;

      await db
        .update(groceryItems)
        .set({ isChecked: !item.isChecked })
        .where(eq(groceryItems.id, itemId));

      // Update local state immediately for better UX
      set({
        currentList: {
          ...currentList,
          items: currentList.items.map((i) =>
            i.id === itemId ? { ...i, isChecked: !i.isChecked } : i
          ),
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteItem: async (itemId) => {
    try {
      await db.delete(groceryItems).where(eq(groceryItems.id, itemId));

      const currentList = get().currentList;
      if (currentList) {
        set({
          currentList: {
            ...currentList,
            items: currentList.items.filter((i) => i.id !== itemId),
          },
        });
      }
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  clearChecked: async () => {
    try {
      const currentList = get().currentList;
      if (!currentList) return;

      const checkedIds = currentList.items.filter((i) => i.isChecked).map((i) => i.id);

      for (const id of checkedIds) {
        await db.delete(groceryItems).where(eq(groceryItems.id, id));
      }

      set({
        currentList: {
          ...currentList,
          items: currentList.items.filter((i) => !i.isChecked),
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  clearAll: async () => {
    try {
      const currentList = get().currentList;
      if (!currentList) return;

      // Delete all items from the current list
      for (const item of currentList.items) {
        await db.delete(groceryItems).where(eq(groceryItems.id, item.id));
      }

      set({
        currentList: {
          ...currentList,
          items: [],
        },
      });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteList: async (listId) => {
    try {
      await db.delete(groceryLists).where(eq(groceryLists.id, listId));
      await get().loadCurrentList();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
}));
