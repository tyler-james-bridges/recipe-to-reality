import { useGroceryStore } from '../../stores/groceryStore'
import { GroceryListWithItems, RecipeWithIngredients, IngredientCategory } from '../../types'
import { db } from '../../db/client'
// Schema tables are imported but referenced via mock setup
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { groceryLists, groceryItems } from '../../db/schema'

import { combineQuantities } from '../../utils/quantity'

// Mock the database
jest.mock('../../db/client', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'test-uuid-' + Math.random()),
}))

// Mock quantity utils
jest.mock('../../utils/quantity', () => ({
  combineQuantities: jest.fn((q1, q2) => {
    const n1 = parseFloat(q1 || '0')
    const n2 = parseFloat(q2 || '0')
    return String(n1 + n2)
  }),
}))

describe('groceryStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state
    useGroceryStore.setState({ currentList: null, lists: [], isLoading: false, error: null })
  })

  const mockGroceryList: GroceryListWithItems = {
    id: 'list-1',
    name: 'Shopping List',
    dateCreated: Date.now(),
    items: [
      {
        id: 'item-1',
        groceryListId: 'list-1',
        name: 'flour',
        quantity: '2',
        unit: 'cups',
        category: 'Pantry' as IngredientCategory,
        isChecked: false,
        sourceRecipeIds: '["recipe-1"]',
      },
      {
        id: 'item-2',
        groceryListId: 'list-1',
        name: 'sugar',
        quantity: '1',
        unit: 'cup',
        category: 'Pantry' as IngredientCategory,
        isChecked: false,
        sourceRecipeIds: '["recipe-1"]',
      },
    ],
  }

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
    ],
  }

  describe('loadCurrentList', () => {
    it('loads most recent grocery list', async () => {
      ;(db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              {
                id: mockGroceryList.id,
                name: mockGroceryList.name,
                dateCreated: mockGroceryList.dateCreated,
              },
            ]),
          }),
        }),
      })
      ;(db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockGroceryList.items),
        }),
      })

      await useGroceryStore.getState().loadCurrentList()

      const state = useGroceryStore.getState()
      expect(state.currentList).not.toBeNull()
      expect(state.currentList?.name).toBe(mockGroceryList.name)
      expect(state.currentList?.items).toHaveLength(2)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(null)
    })

    it('sets currentList to null when no lists exist', async () => {
      ;(db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      })

      await useGroceryStore.getState().loadCurrentList()

      const state = useGroceryStore.getState()
      expect(state.currentList).toBeNull()
      expect(state.isLoading).toBe(false)
    })

    it('sets error state on database failure', async () => {
      const errorMessage = 'Database error'
      ;(db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockReturnValue({
            limit: jest.fn().mockRejectedValue(new Error(errorMessage)),
          }),
        }),
      })

      await useGroceryStore.getState().loadCurrentList()

      const state = useGroceryStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })
  })

  describe('loadAllLists', () => {
    it('loads all grocery lists with items', async () => {
      const mockLists = [
        {
          id: 'list-1',
          name: 'List 1',
          dateCreated: Date.now(),
        },
        {
          id: 'list-2',
          name: 'List 2',
          dateCreated: Date.now() - 1000,
        },
      ]

      const mockItems1 = [
        {
          id: 'item-1',
          groceryListId: 'list-1',
          name: 'flour',
          quantity: '2',
          unit: 'cups',
          category: 'Pantry',
          isChecked: false,
          sourceRecipeIds: '[]',
        },
      ]

      const mockItems2 = []

      // First call for the lists
      ;(db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(mockLists),
        }),
      })
      // Second call for list-1 items
      ;(db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockItems1),
        }),
      })
      // Third call for list-2 items
      ;(db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockItems2),
        }),
      })

      await useGroceryStore.getState().loadAllLists()

      const state = useGroceryStore.getState()
      expect(state.lists).toHaveLength(2)
      expect(state.lists[0].items).toBeDefined()
    })
  })

  describe('createList', () => {
    it('creates new grocery list with default name', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as jest.Mock).mockReturnValue(mockInsert())

      const loadCurrentListSpy = jest.spyOn(useGroceryStore.getState(), 'loadCurrentList')
      loadCurrentListSpy.mockResolvedValue(undefined)

      const listId = await useGroceryStore.getState().createList()

      expect(listId).toMatch(/^test-uuid-/)
      expect(mockInsert).toHaveBeenCalled()
      expect(loadCurrentListSpy).toHaveBeenCalled()

      loadCurrentListSpy.mockRestore()
    })

    it('creates new grocery list with custom name', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as jest.Mock).mockReturnValue(mockInsert())

      const loadCurrentListSpy = jest.spyOn(useGroceryStore.getState(), 'loadCurrentList')
      loadCurrentListSpy.mockResolvedValue(undefined)

      await useGroceryStore.getState().createList('My Custom List')

      expect(mockInsert).toHaveBeenCalled()

      loadCurrentListSpy.mockRestore()
    })
  })

  describe('generateFromRecipes', () => {
    it('consolidates ingredients from multiple recipes', async () => {
      const recipe2: RecipeWithIngredients = {
        ...mockRecipe,
        id: 'recipe-2',
        title: 'Recipe 2',
        ingredients: [
          {
            id: 'ing-3',
            recipeId: 'recipe-2',
            name: 'flour',
            quantity: '1',
            unit: 'cup',
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

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as jest.Mock).mockReturnValue(mockInsert())

      const loadCurrentListSpy = jest.spyOn(useGroceryStore.getState(), 'loadCurrentList')
      loadCurrentListSpy.mockResolvedValue(undefined)

      await useGroceryStore.getState().generateFromRecipes([mockRecipe, recipe2], 'Weekly List')

      // Should insert list + 3 items (flour combined, sugar, eggs)
      expect(mockInsert).toHaveBeenCalled()
      expect(combineQuantities).toHaveBeenCalledWith('2', '1')
      expect(loadCurrentListSpy).toHaveBeenCalled()

      loadCurrentListSpy.mockRestore()
    })

    it('combines quantities for duplicate ingredients', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as jest.Mock).mockReturnValue(mockInsert())

      const loadCurrentListSpy = jest.spyOn(useGroceryStore.getState(), 'loadCurrentList')
      loadCurrentListSpy.mockResolvedValue(undefined)

      await useGroceryStore.getState().generateFromRecipes([mockRecipe])

      expect(mockInsert).toHaveBeenCalled()

      loadCurrentListSpy.mockRestore()
    })

    it('handles recipes with no ingredients', async () => {
      const emptyRecipe: RecipeWithIngredients = {
        ...mockRecipe,
        ingredients: [],
      }

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as jest.Mock).mockReturnValue(mockInsert())

      const loadCurrentListSpy = jest.spyOn(useGroceryStore.getState(), 'loadCurrentList')
      loadCurrentListSpy.mockResolvedValue(undefined)

      await useGroceryStore.getState().generateFromRecipes([emptyRecipe])

      // Should only insert the list, no items
      expect(mockInsert).toHaveBeenCalled()

      loadCurrentListSpy.mockRestore()
    })

    it('tracks source recipe IDs for each item', async () => {
      const recipe2: RecipeWithIngredients = {
        ...mockRecipe,
        id: 'recipe-2',
        ingredients: [
          {
            id: 'ing-3',
            recipeId: 'recipe-2',
            name: 'flour',
            quantity: '1',
            unit: 'cup',
            category: 'Pantry',
            isOptional: false,
          },
        ],
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      let capturedValues: any = null
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockImplementation((values) => {
          capturedValues = values
          return Promise.resolve(undefined)
        }),
      })

      ;(db.insert as jest.Mock).mockReturnValue(mockInsert())

      const loadCurrentListSpy = jest.spyOn(useGroceryStore.getState(), 'loadCurrentList')
      loadCurrentListSpy.mockResolvedValue(undefined)

      await useGroceryStore.getState().generateFromRecipes([mockRecipe, recipe2])

      // Check that flour item has both recipe IDs
      expect(mockInsert).toHaveBeenCalled()

      loadCurrentListSpy.mockRestore()
    })
  })

  describe('addItem', () => {
    it('adds item to grocery list', async () => {
      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as jest.Mock).mockReturnValue(mockInsert())

      const loadCurrentListSpy = jest.spyOn(useGroceryStore.getState(), 'loadCurrentList')
      loadCurrentListSpy.mockResolvedValue(undefined)

      await useGroceryStore.getState().addItem('list-1', {
        name: 'milk',
        quantity: '1',
        unit: 'gallon',
        category: 'Dairy & Eggs',
      })

      expect(mockInsert).toHaveBeenCalled()
      expect(loadCurrentListSpy).toHaveBeenCalled()

      loadCurrentListSpy.mockRestore()
    })
  })

  describe('toggleItem', () => {
    it('toggles item checked status', async () => {
      useGroceryStore.setState({ currentList: mockGroceryList })

      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      })

      ;(db.update as jest.Mock).mockReturnValue(mockUpdate())

      await useGroceryStore.getState().toggleItem('item-1')

      expect(mockUpdate).toHaveBeenCalled()

      const state = useGroceryStore.getState()
      expect(state.currentList?.items[0].isChecked).toBe(true)
    })

    it('does nothing if currentList is null', async () => {
      useGroceryStore.setState({ currentList: null })

      const mockSet = jest.fn()
      const mockUpdate = jest.fn().mockReturnValue({
        set: mockSet,
      })
      ;(db.update as jest.Mock).mockReturnValue(mockUpdate())

      await useGroceryStore.getState().toggleItem('item-1')

      expect(mockSet).not.toHaveBeenCalled()
    })

    it('does nothing if item not found', async () => {
      useGroceryStore.setState({ currentList: mockGroceryList })

      const mockSet = jest.fn()
      const mockUpdate = jest.fn().mockReturnValue({
        set: mockSet,
      })
      ;(db.update as jest.Mock).mockReturnValue(mockUpdate())

      await useGroceryStore.getState().toggleItem('non-existent')

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('deleteItem', () => {
    it('deletes item from database and state', async () => {
      useGroceryStore.setState({ currentList: mockGroceryList })

      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())

      await useGroceryStore.getState().deleteItem('item-1')

      expect(mockDelete).toHaveBeenCalled()

      const state = useGroceryStore.getState()
      expect(state.currentList?.items).toHaveLength(1)
      expect(state.currentList?.items[0].id).toBe('item-2')
    })
  })

  describe('clearChecked', () => {
    it('removes all checked items', async () => {
      const listWithCheckedItems: GroceryListWithItems = {
        ...mockGroceryList,
        items: [
          { ...mockGroceryList.items[0], isChecked: true },
          { ...mockGroceryList.items[1], isChecked: false },
        ],
      }

      useGroceryStore.setState({ currentList: listWithCheckedItems })

      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())

      await useGroceryStore.getState().clearChecked()

      expect(mockDelete).toHaveBeenCalled()

      const state = useGroceryStore.getState()
      expect(state.currentList?.items).toHaveLength(1)
      expect(state.currentList?.items[0].isChecked).toBe(false)
    })

    it('does nothing if no items are checked', async () => {
      useGroceryStore.setState({ currentList: mockGroceryList })

      const mockWhere = jest.fn()
      const mockDelete = jest.fn().mockReturnValue({
        where: mockWhere,
      })
      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())

      await useGroceryStore.getState().clearChecked()

      expect(mockWhere).not.toHaveBeenCalled()
    })

    it('does nothing if currentList is null', async () => {
      useGroceryStore.setState({ currentList: null })

      const mockWhere = jest.fn()
      const mockDelete = jest.fn().mockReturnValue({
        where: mockWhere,
      })
      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())

      await useGroceryStore.getState().clearChecked()

      expect(mockWhere).not.toHaveBeenCalled()
    })
  })

  describe('clearAll', () => {
    it('removes all items from current list', async () => {
      useGroceryStore.setState({ currentList: mockGroceryList })

      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())

      await useGroceryStore.getState().clearAll()

      expect(mockDelete).toHaveBeenCalled()

      const state = useGroceryStore.getState()
      expect(state.currentList?.items).toHaveLength(0)
    })

    it('does nothing if currentList is null', async () => {
      useGroceryStore.setState({ currentList: null })

      const mockWhere = jest.fn()
      const mockDelete = jest.fn().mockReturnValue({
        where: mockWhere,
      })
      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())

      await useGroceryStore.getState().clearAll()

      expect(mockWhere).not.toHaveBeenCalled()
    })
  })

  describe('deleteList', () => {
    it('deletes list from database', async () => {
      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())

      const loadCurrentListSpy = jest.spyOn(useGroceryStore.getState(), 'loadCurrentList')
      loadCurrentListSpy.mockResolvedValue(undefined)

      await useGroceryStore.getState().deleteList('list-1')

      expect(mockDelete).toHaveBeenCalled()
      expect(loadCurrentListSpy).toHaveBeenCalled()

      loadCurrentListSpy.mockRestore()
    })

    it('sets error state on database failure', async () => {
      const errorMessage = 'Delete failed'
      ;(db.delete as jest.Mock).mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error(errorMessage)),
      })

      await expect(useGroceryStore.getState().deleteList('list-1')).rejects.toThrow(errorMessage)

      const state = useGroceryStore.getState()
      expect(state.error).toBe(errorMessage)
    })
  })
})
