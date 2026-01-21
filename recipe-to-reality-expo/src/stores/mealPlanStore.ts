import { create } from 'zustand';
import { db } from '../db/client';
import { mealPlans } from '../db/schema';
import { eq, gte, lte, and } from 'drizzle-orm';
import { MealPlan, MealType } from '../types';
import * as crypto from 'expo-crypto';

interface MealPlanState {
  mealPlans: MealPlan[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadMealPlans: () => Promise<void>;
  loadMealPlansForDateRange: (startDate: Date, endDate: Date) => Promise<void>;
  addMealPlan: (mealPlan: Omit<MealPlan, 'id'>) => Promise<string>;
  updateMealPlan: (id: string, updates: Partial<MealPlan>) => Promise<void>;
  deleteMealPlan: (id: string) => Promise<void>;
  toggleCompleted: (id: string) => Promise<void>;
  getMealsForDate: (date: Date) => MealPlan[];
}

export const useMealPlanStore = create<MealPlanState>((set, get) => ({
  mealPlans: [],
  isLoading: false,
  error: null,

  loadMealPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const allMealPlans = await db.select().from(mealPlans).orderBy(mealPlans.date);
      const mappedPlans: MealPlan[] = allMealPlans.map((mp) => ({
        ...mp,
        mealType: mp.mealType as MealType,
      }));
      set({ mealPlans: mappedPlans, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  loadMealPlansForDateRange: async (startDate: Date, endDate: Date) => {
    set({ isLoading: true, error: null });
    try {
      const start = startDate.getTime();
      const end = endDate.getTime();

      const plans = await db
        .select()
        .from(mealPlans)
        .where(and(gte(mealPlans.date, start), lte(mealPlans.date, end)))
        .orderBy(mealPlans.date);

      const mappedPlans: MealPlan[] = plans.map((mp) => ({
        ...mp,
        mealType: mp.mealType as MealType,
      }));
      set({ mealPlans: mappedPlans, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  addMealPlan: async (mealPlanData) => {
    const id = crypto.randomUUID();

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
      });

      await get().loadMealPlans();
      return id;
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  updateMealPlan: async (id, updates) => {
    try {
      const updateValues: Record<string, unknown> = {};

      if (updates.date !== undefined) updateValues.date = updates.date;
      if (updates.mealType !== undefined) updateValues.mealType = updates.mealType;
      if (updates.recipeId !== undefined) updateValues.recipeId = updates.recipeId;
      if (updates.recipeName !== undefined) updateValues.recipeName = updates.recipeName;
      if (updates.notes !== undefined) updateValues.notes = updates.notes;
      if (updates.isCompleted !== undefined) updateValues.isCompleted = updates.isCompleted;
      if (updates.reminder !== undefined) updateValues.reminder = updates.reminder;
      if (updates.reminderTime !== undefined) updateValues.reminderTime = updates.reminderTime;

      if (Object.keys(updateValues).length > 0) {
        await db.update(mealPlans).set(updateValues).where(eq(mealPlans.id, id));
      }

      await get().loadMealPlans();
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  deleteMealPlan: async (id) => {
    try {
      await db.delete(mealPlans).where(eq(mealPlans.id, id));
      set({ mealPlans: get().mealPlans.filter((mp) => mp.id !== id) });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },

  toggleCompleted: async (id) => {
    const mealPlan = get().mealPlans.find((mp) => mp.id === id);
    if (mealPlan) {
      await get().updateMealPlan(id, { isCompleted: !mealPlan.isCompleted });
    }
  },

  getMealsForDate: (date: Date) => {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return get().mealPlans.filter((mp) => {
      const mpDate = new Date(mp.date);
      return mpDate >= startOfDay && mpDate <= endOfDay;
    });
  },
}));
