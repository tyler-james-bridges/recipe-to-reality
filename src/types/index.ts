// Recipe Types - matching iOS SwiftData models

export type SourceType = 'url' | 'video' | 'manual' | 'instagram' | 'tiktok' | 'youtube';

export type IngredientCategory =
  | 'Produce'
  | 'Meat & Seafood'
  | 'Dairy & Eggs'
  | 'Bakery'
  | 'Pantry'
  | 'Frozen'
  | 'Beverages'
  | 'Condiments & Sauces'
  | 'Spices & Seasonings'
  | 'Other';

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

// Database model types
export interface Recipe {
  id: string;
  title: string;
  sourceURL: string | null;
  sourceType: SourceType;
  imageURL: string | null;
  servings: number | null;
  prepTime: string | null;
  cookTime: string | null;
  instructions: string; // JSON stringified array
  notes: string | null;
  isInQueue: boolean;
  dateAdded: number; // Unix timestamp
  dateCooked: number | null;
}

export interface Ingredient {
  id: string;
  recipeId: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: IngredientCategory;
  isOptional: boolean;
}

export interface GroceryList {
  id: string;
  name: string;
  dateCreated: number;
}

export interface GroceryItem {
  id: string;
  groceryListId: string;
  name: string;
  quantity: string | null;
  unit: string | null;
  category: IngredientCategory;
  isChecked: boolean;
  sourceRecipeIds: string; // JSON stringified array
}

export interface PantryItem {
  id: string;
  name: string;
  category: IngredientCategory;
  quantity: string | null;
  unit: string | null;
  dateAdded: number;
  expirationDate: number | null;
  notes: string | null;
}

export interface MealPlan {
  id: string;
  date: number; // Unix timestamp
  mealType: MealType;
  recipeId: string | null;
  recipeName: string | null;
  notes: string | null;
  isCompleted: boolean;
  reminder: boolean;
  reminderTime: number | null;
}

// API/DTO types
export interface ExtractedRecipe {
  title: string;
  servings: number | null;
  prepTime: string | null;
  cookTime: string | null;
  ingredients: ExtractedIngredient[];
  instructions: string[];
  imageURL: string | null;
  sourceURL: string;
  sourceType: SourceType;
}

export interface ExtractedIngredient {
  name: string;
  quantity: string | null;
  unit: string | null;
  category: IngredientCategory;
}

// UI helper types
export interface RecipeWithIngredients extends Recipe {
  ingredients: Ingredient[];
}

export interface GroceryListWithItems extends GroceryList {
  items: GroceryItem[];
}

// Video platform types
export type VideoPlatform = 'youtube' | 'tiktok' | 'instagram' | 'unknown';

export interface TranscriptSegment {
  text: string;
  offset: number;
  duration: number;
}

export interface VideoTranscript {
  segments: TranscriptSegment[];
  platform: VideoPlatform;
}

// Purchase types
export interface PurchaseState {
  isPremium: boolean;
  extractionsUsed: number;
  canExtract: boolean;
  remainingFreeExtractions: number;
}

// Constants
export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  'Produce',
  'Meat & Seafood',
  'Dairy & Eggs',
  'Bakery',
  'Pantry',
  'Frozen',
  'Beverages',
  'Condiments & Sauces',
  'Spices & Seasonings',
  'Other',
];

export const MEAL_TYPES: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export const MEAL_TYPE_ICONS: Record<MealType, string> = {
  Breakfast: 'weather-sunset-up',
  Lunch: 'weather-sunny',
  Dinner: 'weather-night',
  Snack: 'carrot',
};

export const MEAL_TYPE_DEFAULT_TIMES: Record<MealType, { hour: number; minute: number }> = {
  Breakfast: { hour: 8, minute: 0 },
  Lunch: { hour: 12, minute: 0 },
  Dinner: { hour: 18, minute: 0 },
  Snack: { hour: 15, minute: 0 },
};

export const FREE_EXTRACTION_LIMIT = 5;
export const PREMIUM_ENTITLEMENT = 'premium';
