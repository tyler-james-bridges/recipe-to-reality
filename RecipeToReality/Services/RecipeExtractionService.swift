import Foundation

/// Service for extracting recipe data from URLs using AI
actor RecipeExtractionService {
    static let shared = RecipeExtractionService()

    private init() {}

    /// Extract recipe from a URL using the configured AI provider
    func extractRecipe(from url: URL) async throws -> ExtractedRecipe {
        // Fetch webpage content
        let content = try await fetchWebContent(from: url)

        // Get configured AI provider
        let provider = try await AISettingsManager.shared.createProvider()

        // Extract recipe using provider
        return try await provider.extractRecipe(from: content, url: url)
    }

    private func fetchWebContent(from url: URL) async throws -> String {
        var request = URLRequest(url: url)
        request.setValue(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            forHTTPHeaderField: "User-Agent"
        )

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw AIProviderError.networkError(URLError(.badServerResponse))
        }

        guard let content = String(data: data, encoding: .utf8) else {
            throw AIProviderError.contentNotFound
        }

        return stripHTML(content)
    }

    private func stripHTML(_ html: String) -> String {
        var result = html
        result = result.replacingOccurrences(of: "<script[^>]*>[\\s\\S]*?</script>", with: "", options: .regularExpression)
        result = result.replacingOccurrences(of: "<style[^>]*>[\\s\\S]*?</style>", with: "", options: .regularExpression)
        result = result.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
        result = result.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        result = result.replacingOccurrences(of: "&nbsp;", with: " ")
        result = result.replacingOccurrences(of: "&amp;", with: "&")

        if result.count > 15000 {
            result = String(result.prefix(15000))
        }
        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Extracted Recipe DTOs

struct ExtractedRecipe {
    let title: String
    let servings: Int?
    let prepTime: String?
    let cookTime: String?
    let ingredients: [ExtractedIngredient]
    let instructions: [String]
    let imageURL: String?
    let sourceURL: String
    let sourceType: Recipe.SourceType

    func toRecipe() -> Recipe {
        let recipe = Recipe(
            title: title,
            sourceURL: sourceURL,
            sourceType: sourceType,
            imageURL: imageURL,
            servings: servings,
            prepTime: prepTime,
            cookTime: cookTime,
            instructions: instructions
        )

        let recipeIngredients = ingredients.map { extracted in
            Ingredient(
                name: extracted.name,
                quantity: extracted.quantity,
                unit: extracted.unit,
                category: extracted.category,
                recipe: recipe
            )
        }
        recipe.ingredients = recipeIngredients
        return recipe
    }
}

struct ExtractedIngredient {
    let name: String
    let quantity: String?
    let unit: String?
    let category: Ingredient.IngredientCategory
}
