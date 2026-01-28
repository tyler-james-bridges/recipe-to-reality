import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// Recipes table
export const recipes = sqliteTable('recipes', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  sourceURL: text('source_url'),
  sourceType: text('source_type').notNull().default('manual'),
  imageURL: text('image_url'),
  servings: integer('servings'),
  prepTime: text('prep_time'),
  cookTime: text('cook_time'),
  instructions: text('instructions').notNull().default('[]'), // JSON array
  notes: text('notes'),
  isInQueue: integer('is_in_queue', { mode: 'boolean' }).notNull().default(false),
  dateAdded: integer('date_added').notNull(),
  dateCooked: integer('date_cooked'),
})

// Ingredients table
export const ingredients = sqliteTable('ingredients', {
  id: text('id').primaryKey(),
  recipeId: text('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: text('quantity'),
  unit: text('unit'),
  category: text('category').notNull().default('Other'),
  isOptional: integer('is_optional', { mode: 'boolean' }).notNull().default(false),
})

// Grocery Lists table
export const groceryLists = sqliteTable('grocery_lists', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('Shopping List'),
  dateCreated: integer('date_created').notNull(),
})

// Grocery Items table
export const groceryItems = sqliteTable('grocery_items', {
  id: text('id').primaryKey(),
  groceryListId: text('grocery_list_id')
    .notNull()
    .references(() => groceryLists.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  quantity: text('quantity'),
  unit: text('unit'),
  category: text('category').notNull().default('Other'),
  isChecked: integer('is_checked', { mode: 'boolean' }).notNull().default(false),
  sourceRecipeIds: text('source_recipe_ids').notNull().default('[]'), // JSON array
})

// Pantry Items table
export const pantryItems = sqliteTable('pantry_items', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  category: text('category').notNull().default('Other'),
  quantity: text('quantity'),
  unit: text('unit'),
  dateAdded: integer('date_added').notNull(),
  expirationDate: integer('expiration_date'),
  notes: text('notes'),
})

// Meal Plans table
export const mealPlans = sqliteTable('meal_plans', {
  id: text('id').primaryKey(),
  date: integer('date').notNull(),
  mealType: text('meal_type').notNull(),
  recipeId: text('recipe_id').references(() => recipes.id, { onDelete: 'set null' }),
  recipeName: text('recipe_name'),
  notes: text('notes'),
  isCompleted: integer('is_completed', { mode: 'boolean' }).notNull().default(false),
  reminder: integer('reminder', { mode: 'boolean' }).notNull().default(false),
  reminderTime: integer('reminder_time'),
})

// Type exports for Drizzle
export type RecipeRow = typeof recipes.$inferSelect
export type NewRecipe = typeof recipes.$inferInsert
export type IngredientRow = typeof ingredients.$inferSelect
export type NewIngredient = typeof ingredients.$inferInsert
export type GroceryListRow = typeof groceryLists.$inferSelect
export type NewGroceryList = typeof groceryLists.$inferInsert
export type GroceryItemRow = typeof groceryItems.$inferSelect
export type NewGroceryItem = typeof groceryItems.$inferInsert
export type PantryItemRow = typeof pantryItems.$inferSelect
export type NewPantryItem = typeof pantryItems.$inferInsert
export type MealPlanRow = typeof mealPlans.$inferSelect
export type NewMealPlan = typeof mealPlans.$inferInsert
