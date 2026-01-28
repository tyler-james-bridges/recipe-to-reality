import { create } from 'zustand'
import { db } from '../db/client'
import { mealPlans } from '../db/schema'
import { eq, gte, lte, and } from 'drizzle-orm'
import { MealPlan, MealType } from '../types'
import * as crypto from 'expo-crypto'
import {
  scheduleReminder,
  cancelReminder,
  formatMealReminderBody,
  requestPermissions,
  checkPermissions,
} from '../services/notifications'

interface MealPlanState {
  mealPlans: MealPlan[]
  isLoading: boolean
  error: string | null
  notificationPermissionGranted: boolean | null

  // Actions
  loadMealPlans: () => Promise<void>
  loadMealPlansForDateRange: (startDate: Date, endDate: Date) => Promise<void>
  addMealPlan: (mealPlan: Omit<MealPlan, 'id'>) => Promise<string>
  updateMealPlan: (id: string, updates: Partial<MealPlan>) => Promise<void>
  deleteMealPlan: (id: string) => Promise<void>
  toggleCompleted: (id: string) => Promise<void>
  getMealsForDate: (date: Date) => MealPlan[]
  requestNotificationPermissions: () => Promise<boolean>
  checkNotificationPermissions: () => Promise<boolean>
}

/**
 * Helper function to schedule or cancel notification for a meal plan.
 */
async function handleMealPlanNotification(
  mealPlan: MealPlan & { id: string },
  shouldSchedule: boolean
): Promise<void> {
  if (shouldSchedule && mealPlan.reminder && mealPlan.reminderTime) {
    const reminderDate = new Date(mealPlan.reminderTime)
    const recipeName = mealPlan.recipeName || 'your meal'

    await scheduleReminder({
      id: mealPlan.id,
      title: mealPlan.mealType + ' Reminder',
      body: formatMealReminderBody(recipeName, mealPlan.mealType),
      triggerTime: reminderDate,
      data: {
        mealPlanId: mealPlan.id,
        recipeId: mealPlan.recipeId,
        mealType: mealPlan.mealType,
      },
    })
  } else {
    // Cancel any existing notification
    await cancelReminder(mealPlan.id)
  }
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  mealPlans: [],
  isLoading: false,
  error: null,
  notificationPermissionGranted: null,

  requestNotificationPermissions: async () => {
    const granted = await requestPermissions()
    set({ notificationPermissionGranted: granted })
    return granted
  },

  checkNotificationPermissions: async () => {
    const granted = await checkPermissions()
    set({ notificationPermissionGranted: granted })
    return granted
  },

  loadMealPlans: async () => {
    set({ isLoading: true, error: null })
    try {
      const allMealPlans = await db.select().from(mealPlans).orderBy(mealPlans.date)
      const mappedPlans: MealPlan[] = allMealPlans.map((mp) => ({
        ...mp,
        mealType: mp.mealType as MealType,
      }))
      set({ mealPlans: mappedPlans, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  loadMealPlansForDateRange: async (startDate: Date, endDate: Date) => {
    set({ isLoading: true, error: null })
    try {
      const start = startDate.getTime()
      const end = endDate.getTime()

      const plans = await db
        .select()
        .from(mealPlans)
        .where(and(gte(mealPlans.date, start), lte(mealPlans.date, end)))
        .orderBy(mealPlans.date)

      const mappedPlans: MealPlan[] = plans.map((mp) => ({
        ...mp,
        mealType: mp.mealType as MealType,
      }))
      set({ mealPlans: mappedPlans, isLoading: false })
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false })
    }
  },

  addMealPlan: async (mealPlanData) => {
    const id = crypto.randomUUID()

    try {
      await db.insert(mealPlans).values({
        id,
        date: mealPlanData.date,
        mealType: mealPlanData.mealType,
        recipeId: mealPlanData.recipeId,
        recipeName: mealPlanData.recipeName,
        notes: mealPlanData.notes,
        isCompleted: mealPlanData.isCompleted || false,
        reminder: mealPlanData.reminder || false,
        reminderTime: mealPlanData.reminderTime,
      })

      // Schedule notification if reminder is enabled
      const newMealPlan: MealPlan = {
        id,
        ...mealPlanData,
        isCompleted: mealPlanData.isCompleted || false,
        reminder: mealPlanData.reminder || false,
      }
      await handleMealPlanNotification(newMealPlan, mealPlanData.reminder || false)

      await get().loadMealPlans()
      return id
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  updateMealPlan: async (id, updates) => {
    try {
      const updateValues: Record<string, unknown> = {}

      if (updates.date !== undefined) updateValues.date = updates.date
      if (updates.mealType !== undefined) updateValues.mealType = updates.mealType
      if (updates.recipeId !== undefined) updateValues.recipeId = updates.recipeId
      if (updates.recipeName !== undefined) updateValues.recipeName = updates.recipeName
      if (updates.notes !== undefined) updateValues.notes = updates.notes
      if (updates.isCompleted !== undefined) updateValues.isCompleted = updates.isCompleted
      if (updates.reminder !== undefined) updateValues.reminder = updates.reminder
      if (updates.reminderTime !== undefined) updateValues.reminderTime = updates.reminderTime

      if (Object.keys(updateValues).length > 0) {
        await db.update(mealPlans).set(updateValues).where(eq(mealPlans.id, id))
      }

      // Handle notification updates
      const existingPlan = get().mealPlans.find((mp) => mp.id === id)
      if (existingPlan) {
        const updatedPlan: MealPlan = {
          ...existingPlan,
          ...updates,
        }

        // Reschedule or cancel notification based on reminder settings
        const reminderChanged =
          updates.reminder !== undefined ||
          updates.reminderTime !== undefined ||
          updates.recipeName !== undefined ||
          updates.mealType !== undefined

        if (reminderChanged) {
          await handleMealPlanNotification(updatedPlan, updatedPlan.reminder)
        }
      }

      await get().loadMealPlans()
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  deleteMealPlan: async (id) => {
    try {
      // Cancel any scheduled notification before deleting
      await cancelReminder(id)

      await db.delete(mealPlans).where(eq(mealPlans.id, id))
      set({ mealPlans: get().mealPlans.filter((mp) => mp.id !== id) })
    } catch (error) {
      set({ error: (error as Error).message })
      throw error
    }
  },

  toggleCompleted: async (id) => {
    const mealPlan = get().mealPlans.find((mp) => mp.id === id)
    if (mealPlan) {
      // When marking as completed, also cancel the reminder
      const isCompleting = !mealPlan.isCompleted
      if (isCompleting && mealPlan.reminder) {
        await cancelReminder(id)
      }
      await get().updateMealPlan(id, { isCompleted: isCompleting })
    }
  },

  getMealsForDate: (date: Date) => {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    return get().mealPlans.filter((mp) => {
      const mpDate = new Date(mp.date)
      return mpDate >= startOfDay && mpDate <= endOfDay
    })
  },
}))
