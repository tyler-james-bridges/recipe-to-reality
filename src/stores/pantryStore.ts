import { create } from 'zustand'
import { db } from '../db/client'
import { pantryItems } from '../db/schema'
import { eq } from 'drizzle-orm'
import { PantryItem, IngredientCategory } from '../types'
import * as crypto from 'expo-crypto'

interface PantryState {
  items: PantryItem[]
  isLoading: boolean
  error: string | null

  // Actions
  loadItems: () => Promise<void>
  addItem: (item: Omit<PantryItem, 'id' | 'dateAdded'>) => Promise<string>
  updateItem: (id: string, updates: Partial<PantryItem>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  getExpiringSoon: () => PantryItem[]
  getExpired: () => PantryItem[]
}

export const usePantryStore = create<PantryState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null })
    try {
      const allItems = await db.select().from(pantryItems)
      const mappedItems: PantryItem[] = allItems.map((item) => ({
        ...item,
        category: item.category as IngredientCategory,
      }))
      set({ items: mappedItems, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addItem: async (itemData) => {
    const id = crypto.randomUUID()
    const now = Date.now()

    try {
      await db.insert(pantryItems).values({
        id,
        name: itemData.name,
        category: itemData.category,
        quantity: itemData.quantity,
        unit: itemData.unit,
        dateAdded: now,
        expirationDate: itemData.expirationDate,
        notes: itemData.notes,
      })

      await get().loadItems()
      return id
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  updateItem: async (id, updates) => {
    try {
      const updateValues: Record<string, unknown> = {}

      if (updates.name !== undefined) updateValues.name = updates.name
      if (updates.category !== undefined) updateValues.category = updates.category
      if (updates.quantity !== undefined) updateValues.quantity = updates.quantity
      if (updates.unit !== undefined) updateValues.unit = updates.unit
      if (updates.expirationDate !== undefined) updateValues.expirationDate = updates.expirationDate
      if (updates.notes !== undefined) updateValues.notes = updates.notes

      if (Object.keys(updateValues).length > 0) {
        await db.update(pantryItems).set(updateValues).where(eq(pantryItems.id, id))
      }

      await get().loadItems()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteItem: async (id) => {
    try {
      await db.delete(pantryItems).where(eq(pantryItems.id, id))
      set({ items: get().items.filter((i) => i.id !== id) })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  getExpiringSoon: () => {
    const threeDaysFromNow = Date.now() + 3 * 24 * 60 * 60 * 1000
    return get().items.filter((item) => {
      if (!item.expirationDate) return false
      return item.expirationDate <= threeDaysFromNow && item.expirationDate > Date.now()
    })
  },

  getExpired: () => {
    return get().items.filter((item) => {
      if (!item.expirationDate) return false
      return item.expirationDate < Date.now()
    })
  },
}))
