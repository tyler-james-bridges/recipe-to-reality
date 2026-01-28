import { useRecipeStore } from '../../stores/recipeStore'
import { RecipeWithIngredients, SourceType, IngredientCategory } from '../../types'
import { db } from '../../db/client'
import { recipes, ingredients } from '../../db/schema'

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
  randomUUID: jest.fn(() => 'test-uuid-' + Date.now()),
}))

describe('recipeStore', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset store state
    useRecipeStore.setState({ recipes: [], isLoading: false, error: null })
  })

  const mockRecipe: RecipeWithIngredients = {
    id: 'recipe-1',
    title: 'Test Recipe',
    sourceURL: 'https://example.com/recipe',
    sourceType: 'url' as SourceType,
    imageURL: 'https://example.com/image.jpg',
    servings: 4,
    prepTime: '10 minutes',
    cookTime: '20 minutes',
    instructions: JSON.stringify(['Step 1', 'Step 2']),
    notes: 'Test notes',
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
        category: 'Pantry' as IngredientCategory,
        isOptional: false,
      },
      {
        id: 'ing-2',
        recipeId: 'recipe-1',
        name: 'sugar',
        quantity: '1',
        unit: 'cup',
        category: 'Pantry' as IngredientCategory,
        isOptional: false,
      },
    ],
  }

  describe('loadRecipes', () => {
    it('loads recipes from database successfully', async () => {
      const mockDbRecipes = [
        {
          id: mockRecipe.id,
          title: mockRecipe.title,
          sourceURL: mockRecipe.sourceURL,
          sourceType: mockRecipe.sourceType,
          imageURL: mockRecipe.imageURL,
          servings: mockRecipe.servings,
          prepTime: mockRecipe.prepTime,
          cookTime: mockRecipe.cookTime,
          instructions: mockRecipe.instructions,
          notes: mockRecipe.notes,
          isInQueue: mockRecipe.isInQueue,
          dateAdded: mockRecipe.dateAdded,
          dateCooked: mockRecipe.dateCooked,
        },
      ]

      const mockDbIngredients = mockRecipe.ingredients.map((ing) => ({
        ...ing,
      }))

      ;(db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockResolvedValue(mockDbRecipes),
        }),
      })

      ;(db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockResolvedValue(mockDbIngredients),
      })

      await useRecipeStore.getState().loadRecipes()

      const state = useRecipeStore.getState()
      expect(state.recipes).toHaveLength(1)
      expect(state.recipes[0].title).toBe(mockRecipe.title)
      expect(state.recipes[0].ingredients).toHaveLength(2)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(null)
    })

    it('sets error state on database failure', async () => {
      const errorMessage = 'Database connection failed'
      ;(db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockRejectedValue(new Error(errorMessage)),
        }),
      })

      await useRecipeStore.getState().loadRecipes()

      const state = useRecipeStore.getState()
      expect(state.error).toBe(errorMessage)
      expect(state.isLoading).toBe(false)
    })

    it('sets loading state during operation', async () => {
      ;(db.select as jest.Mock).mockReturnValue({
        from: jest.fn().mockReturnValue({
          orderBy: jest.fn().mockImplementation(
            () =>
              new Promise((resolve) => {
                const state = useRecipeStore.getState()
                expect(state.isLoading).toBe(true)
                resolve([])
              })
          ),
        }),
      })

      ;(db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockResolvedValue([]),
      })

      await useRecipeStore.getState().loadRecipes()
    })
  })

  describe('getRecipe', () => {
    it('returns recipe by id', () => {
      useRecipeStore.setState({ recipes: [mockRecipe] })

      const result = useRecipeStore.getState().getRecipe('recipe-1')

      expect(result).toEqual(mockRecipe)
    })

    it('returns undefined for non-existent recipe', () => {
      useRecipeStore.setState({ recipes: [mockRecipe] })

      const result = useRecipeStore.getState().getRecipe('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('addRecipe', () => {
    it('adds recipe to database successfully', async () => {
      const mockInsertRecipe = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      const mockInsertIngredient = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as jest.Mock).mockImplementation((table) => {
        if (table === recipes) return mockInsertRecipe()
        if (table === ingredients) return mockInsertIngredient()
        throw new Error('Unexpected table')
      })

      // Mock loadRecipes to avoid database calls
      const loadRecipesSpy = jest.spyOn(useRecipeStore.getState(), 'loadRecipes')
      loadRecipesSpy.mockResolvedValue(undefined)

      const recipeData = {
        title: mockRecipe.title,
        sourceURL: mockRecipe.sourceURL,
        sourceType: mockRecipe.sourceType,
        imageURL: mockRecipe.imageURL,
        servings: mockRecipe.servings,
        prepTime: mockRecipe.prepTime,
        cookTime: mockRecipe.cookTime,
        instructions: ['Step 1', 'Step 2'],
        notes: mockRecipe.notes,
        isInQueue: false,
        dateCooked: null,
        ingredients: mockRecipe.ingredients.map(({ id, recipeId, ...rest }) => rest),
      }

      const recipeId = await useRecipeStore.getState().addRecipe(recipeData)

      expect(recipeId).toMatch(/^test-uuid-/)
      expect(mockInsertRecipe).toHaveBeenCalled()
      expect(mockInsertIngredient).toHaveBeenCalled()
      expect(loadRecipesSpy).toHaveBeenCalled()

      loadRecipesSpy.mockRestore()
    })

    it('handles instructions as string or array', async () => {
      const mockInsertRecipe = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.insert as jest.Mock).mockReturnValue(mockInsertRecipe())

      const loadRecipesSpy = jest.spyOn(useRecipeStore.getState(), 'loadRecipes')
      loadRecipesSpy.mockResolvedValue(undefined)

      const recipeData = {
        title: 'Test',
        sourceURL: null,
        sourceType: 'manual' as SourceType,
        imageURL: null,
        servings: null,
        prepTime: null,
        cookTime: null,
        instructions: JSON.stringify(['Step 1']),
        notes: null,
        ingredients: [],
      }

      await useRecipeStore.getState().addRecipe(recipeData)

      expect(mockInsertRecipe).toHaveBeenCalled()

      loadRecipesSpy.mockRestore()
    })

    it('sets error state on database failure', async () => {
      const errorMessage = 'Insert failed'
      ;(db.insert as jest.Mock).mockReturnValue({
        values: jest.fn().mockRejectedValue(new Error(errorMessage)),
      })

      const recipeData = {
        title: 'Test',
        sourceURL: null,
        sourceType: 'manual' as SourceType,
        imageURL: null,
        servings: null,
        prepTime: null,
        cookTime: null,
        instructions: [],
        notes: null,
        ingredients: [],
      }

      await expect(useRecipeStore.getState().addRecipe(recipeData)).rejects.toThrow(errorMessage)

      const state = useRecipeStore.getState()
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('updateRecipe', () => {
    it('updates recipe fields successfully', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      })

      ;(db.update as jest.Mock).mockReturnValue(mockUpdate())

      const loadRecipesSpy = jest.spyOn(useRecipeStore.getState(), 'loadRecipes')
      loadRecipesSpy.mockResolvedValue(undefined)

      await useRecipeStore.getState().updateRecipe('recipe-1', {
        title: 'Updated Title',
        servings: 6,
      })

      expect(mockUpdate).toHaveBeenCalled()
      expect(loadRecipesSpy).toHaveBeenCalled()

      loadRecipesSpy.mockRestore()
    })

    it('updates ingredients when provided', async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(undefined),
        }),
      })

      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      })

      const mockInsert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.update as jest.Mock).mockReturnValue(mockUpdate())
      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())
      ;(db.insert as jest.Mock).mockReturnValue(mockInsert())

      const loadRecipesSpy = jest.spyOn(useRecipeStore.getState(), 'loadRecipes')
      loadRecipesSpy.mockResolvedValue(undefined)

      const newIngredients = [
        {
          id: 'new-ing-1',
          recipeId: 'recipe-1',
          name: 'salt',
          quantity: '1',
          unit: 'tsp',
          category: 'Spices & Seasonings' as IngredientCategory,
          isOptional: false,
        },
      ]

      await useRecipeStore.getState().updateRecipe('recipe-1', {
        ingredients: newIngredients,
      })

      expect(mockDelete).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalled()
      expect(loadRecipesSpy).toHaveBeenCalled()

      loadRecipesSpy.mockRestore()
    })

    it('does not call update if no fields changed', async () => {
      const mockSet = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      })

      const mockUpdate = jest.fn().mockReturnValue({
        set: mockSet,
      })

      ;(db.update as jest.Mock).mockReturnValue(mockUpdate())

      const loadRecipesSpy = jest.spyOn(useRecipeStore.getState(), 'loadRecipes')
      loadRecipesSpy.mockResolvedValue(undefined)

      await useRecipeStore.getState().updateRecipe('recipe-1', {})

      expect(mockSet).not.toHaveBeenCalled()
      expect(loadRecipesSpy).toHaveBeenCalled()

      loadRecipesSpy.mockRestore()
    })
  })

  describe('deleteRecipe', () => {
    it('deletes recipe from database and state', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe] })

      const mockDelete = jest.fn().mockReturnValue({
        where: jest.fn().mockResolvedValue(undefined),
      })

      ;(db.delete as jest.Mock).mockReturnValue(mockDelete())

      await useRecipeStore.getState().deleteRecipe('recipe-1')

      expect(mockDelete).toHaveBeenCalled()
      expect(useRecipeStore.getState().recipes).toHaveLength(0)
    })

    it('sets error state on database failure', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe] })

      const errorMessage = 'Delete failed'
      ;(db.delete as jest.Mock).mockReturnValue({
        where: jest.fn().mockRejectedValue(new Error(errorMessage)),
      })

      await expect(useRecipeStore.getState().deleteRecipe('recipe-1')).rejects.toThrow(
        errorMessage
      )

      const state = useRecipeStore.getState()
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('toggleQueue', () => {
    it('toggles recipe queue status', async () => {
      useRecipeStore.setState({ recipes: [mockRecipe] })

      const updateRecipeSpy = jest.spyOn(useRecipeStore.getState(), 'updateRecipe')
      updateRecipeSpy.mockResolvedValue(undefined)

      await useRecipeStore.getState().toggleQueue('recipe-1')

      expect(updateRecipeSpy).toHaveBeenCalledWith('recipe-1', { isInQueue: true })

      updateRecipeSpy.mockRestore()
    })

    it('does nothing if recipe not found', async () => {
      useRecipeStore.setState({ recipes: [] })

      const updateRecipeSpy = jest.spyOn(useRecipeStore.getState(), 'updateRecipe')
      updateRecipeSpy.mockResolvedValue(undefined)

      await useRecipeStore.getState().toggleQueue('non-existent')

      expect(updateRecipeSpy).not.toHaveBeenCalled()

      updateRecipeSpy.mockRestore()
    })
  })

  describe('markAsCooked', () => {
    it('sets dateCooked to current timestamp', async () => {
      const updateRecipeSpy = jest.spyOn(useRecipeStore.getState(), 'updateRecipe')
      updateRecipeSpy.mockResolvedValue(undefined)

      const beforeTime = Date.now()
      await useRecipeStore.getState().markAsCooked('recipe-1')
      const afterTime = Date.now()

      expect(updateRecipeSpy).toHaveBeenCalledWith('recipe-1', {
        dateCooked: expect.any(Number),
      })

      const callArg = updateRecipeSpy.mock.calls[0][1] as any
      expect(callArg.dateCooked).toBeGreaterThanOrEqual(beforeTime)
      expect(callArg.dateCooked).toBeLessThanOrEqual(afterTime)

      updateRecipeSpy.mockRestore()
    })
  })

  describe('searchRecipes', () => {
    const recipe1: RecipeWithIngredients = {
      ...mockRecipe,
      id: 'recipe-1',
      title: 'Chocolate Cake',
    }

    const recipe2: RecipeWithIngredients = {
      ...mockRecipe,
      id: 'recipe-2',
      title: 'Vanilla Cookies',
      ingredients: [
        {
          id: 'ing-3',
          recipeId: 'recipe-2',
          name: 'chocolate chips',
          quantity: '1',
          unit: 'cup',
          category: 'Pantry',
          isOptional: false,
        },
      ],
    }

    it('finds recipes by title', () => {
      useRecipeStore.setState({ recipes: [recipe1, recipe2] })

      const results = useRecipeStore.getState().searchRecipes('cake')

      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Chocolate Cake')
    })

    it('finds recipes by ingredient name', () => {
      useRecipeStore.setState({ recipes: [recipe1, recipe2] })

      const results = useRecipeStore.getState().searchRecipes('chocolate')

      expect(results).toHaveLength(2)
    })

    it('is case-insensitive', () => {
      useRecipeStore.setState({ recipes: [recipe1, recipe2] })

      const results = useRecipeStore.getState().searchRecipes('CHOCOLATE')

      expect(results).toHaveLength(2)
    })

    it('returns empty array for no matches', () => {
      useRecipeStore.setState({ recipes: [recipe1, recipe2] })

      const results = useRecipeStore.getState().searchRecipes('pizza')

      expect(results).toHaveLength(0)
    })

    it('handles empty search query', () => {
      useRecipeStore.setState({ recipes: [recipe1, recipe2] })

      const results = useRecipeStore.getState().searchRecipes('')

      expect(results).toHaveLength(2)
    })
  })
})
