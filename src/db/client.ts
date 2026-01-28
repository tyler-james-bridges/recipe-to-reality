import * as SQLite from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as schema from './schema'

// Open the database
const expo = SQLite.openDatabaseSync('recipetoreality.db')

// Create Drizzle ORM instance
export const db = drizzle(expo, { schema })

// Initialize database - create tables if they don't exist
export async function initializeDatabase() {
  // Create recipes table
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      source_url TEXT,
      source_type TEXT NOT NULL DEFAULT 'manual',
      image_url TEXT,
      servings INTEGER,
      prep_time TEXT,
      cook_time TEXT,
      instructions TEXT NOT NULL DEFAULT '[]',
      notes TEXT,
      is_in_queue INTEGER NOT NULL DEFAULT 0,
      date_added INTEGER NOT NULL,
      date_cooked INTEGER
    );
  `)

  // Create ingredients table
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id TEXT PRIMARY KEY NOT NULL,
      recipe_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT,
      unit TEXT,
      category TEXT NOT NULL DEFAULT 'Other',
      is_optional INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );
  `)

  // Create grocery_lists table
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS grocery_lists (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL DEFAULT 'Shopping List',
      date_created INTEGER NOT NULL
    );
  `)

  // Create grocery_items table
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS grocery_items (
      id TEXT PRIMARY KEY NOT NULL,
      grocery_list_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quantity TEXT,
      unit TEXT,
      category TEXT NOT NULL DEFAULT 'Other',
      is_checked INTEGER NOT NULL DEFAULT 0,
      source_recipe_ids TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (grocery_list_id) REFERENCES grocery_lists(id) ON DELETE CASCADE
    );
  `)

  // Create pantry_items table
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS pantry_items (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Other',
      quantity TEXT,
      unit TEXT,
      date_added INTEGER NOT NULL,
      expiration_date INTEGER,
      notes TEXT
    );
  `)

  // Create meal_plans table
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS meal_plans (
      id TEXT PRIMARY KEY NOT NULL,
      date INTEGER NOT NULL,
      meal_type TEXT NOT NULL,
      recipe_id TEXT,
      recipe_name TEXT,
      notes TEXT,
      is_completed INTEGER NOT NULL DEFAULT 0,
      reminder INTEGER NOT NULL DEFAULT 0,
      reminder_time INTEGER,
      FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE SET NULL
    );
  `)

  // Create indexes for common queries
  await expo.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_ingredients_recipe_id ON ingredients(recipe_id);`
  )
  await expo.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_grocery_items_list_id ON grocery_items(grocery_list_id);`
  )
  await expo.execAsync(`CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(date);`)
  await expo.execAsync(`CREATE INDEX IF NOT EXISTS idx_recipes_date_added ON recipes(date_added);`)
  await expo.execAsync(
    `CREATE INDEX IF NOT EXISTS idx_pantry_items_expiration ON pantry_items(expiration_date);`
  )
}

export { expo as sqliteDB }
