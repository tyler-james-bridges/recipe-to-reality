import Foundation

// MARK: - AI Provider Protocol

protocol AIProvider {
    var name: String { get }
    var requiresAPIKey: Bool { get }
    func extractRecipe(from content: String, url: URL) async throws -> ExtractedRecipe
}

// MARK: - Provider Type

enum AIProviderType: String, CaseIterable, Codable {
    case openAI = "openai"
    case anthropic = "anthropic"
    case google = "google"

    var displayName: String {
        switch self {
        case .openAI: return "OpenAI"
        case .anthropic: return "Anthropic (Claude)"
        case .google: return "Google (Gemini)"
        }
    }

    var keyPrefix: String {
        switch self {
        case .openAI: return "sk-"
        case .anthropic: return "sk-ant-"
        case .google: return "AI"
        }
    }

    var apiKeyURL: URL {
        switch self {
        case .openAI: return URL(string: "https://platform.openai.com/api-keys")!
        case .anthropic: return URL(string: "https://console.anthropic.com/settings/keys")!
        case .google: return URL(string: "https://aistudio.google.com/app/apikey")!
        }
    }

    var pricingURL: URL {
        switch self {
        case .openAI: return URL(string: "https://openai.com/pricing")!
        case .anthropic: return URL(string: "https://www.anthropic.com/pricing")!
        case .google: return URL(string: "https://ai.google.dev/pricing")!
        }
    }

    func createProvider(apiKey: String) -> AIProvider {
        switch self {
        case .openAI: return OpenAIProvider(apiKey: apiKey)
        case .anthropic: return AnthropicProvider(apiKey: apiKey)
        case .google: return GoogleProvider(apiKey: apiKey)
        }
    }
}

// MARK: - Shared Extraction Prompt

enum RecipePrompts {
    static let system = """
        You are a recipe extraction assistant. Extract recipe information from the provided webpage content.
        Return a JSON object with the following structure:
        {
            "title": "Recipe Title",
            "servings": 4,
            "prepTime": "15 minutes",
            "cookTime": "30 minutes",
            "ingredients": [
                {"name": "ingredient name", "quantity": "2", "unit": "cups", "category": "produce"},
                ...
            ],
            "instructions": ["Step 1...", "Step 2...", ...],
            "imageURL": "https://..." (if found)
        }

        For ingredient categories, use one of: produce, meat, dairy, bakery, pantry, frozen, beverages, condiments, spices, other

        If you cannot find a recipe in the content, return:
        {"error": "No recipe found"}

        Only return valid JSON, no other text.
        """

    static func user(content: String) -> String {
        "Extract the recipe from this webpage content:\n\n\(content)"
    }
}

// MARK: - OpenAI Provider

struct OpenAIProvider: AIProvider {
    let name = "OpenAI"
    let requiresAPIKey = true
    let apiKey: String

    func extractRecipe(from content: String, url: URL) async throws -> ExtractedRecipe {
        let requestBody: [String: Any] = [
            "model": "gpt-4o-mini",
            "messages": [
                ["role": "system", "content": RecipePrompts.system],
                ["role": "user", "content": RecipePrompts.user(content: content)]
            ],
            "temperature": 0.1,
            "response_format": ["type": "json_object"]
        ]

        var request = URLRequest(url: URL(string: "https://api.openai.com/v1/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateResponse(response, data: data)

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let message = choices.first?["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw AIProviderError.parsingError
        }

        return try parseRecipeJSON(content, url: url)
    }
}

// MARK: - Anthropic Provider

struct AnthropicProvider: AIProvider {
    let name = "Anthropic"
    let requiresAPIKey = true
    let apiKey: String

    func extractRecipe(from content: String, url: URL) async throws -> ExtractedRecipe {
        let requestBody: [String: Any] = [
            "model": "claude-3-5-haiku-latest",
            "max_tokens": 4096,
            "system": RecipePrompts.system,
            "messages": [
                ["role": "user", "content": RecipePrompts.user(content: content)]
            ]
        ]

        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateResponse(response, data: data)

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let contentArray = json["content"] as? [[String: Any]],
              let textBlock = contentArray.first(where: { $0["type"] as? String == "text" }),
              let text = textBlock["text"] as? String else {
            throw AIProviderError.parsingError
        }

        return try parseRecipeJSON(text, url: url)
    }
}

// MARK: - Google Provider

struct GoogleProvider: AIProvider {
    let name = "Google"
    let requiresAPIKey = true
    let apiKey: String

    func extractRecipe(from content: String, url: URL) async throws -> ExtractedRecipe {
        let requestBody: [String: Any] = [
            "contents": [
                ["parts": [["text": "\(RecipePrompts.system)\n\n\(RecipePrompts.user(content: content))"]]]
            ],
            "generationConfig": [
                "temperature": 0.1,
                "responseMimeType": "application/json"
            ]
        ]

        let urlString = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=\(apiKey)"
        var request = URLRequest(url: URL(string: urlString)!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)
        try validateResponse(response, data: data)

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let candidates = json["candidates"] as? [[String: Any]],
              let content = candidates.first?["content"] as? [String: Any],
              let parts = content["parts"] as? [[String: Any]],
              let text = parts.first?["text"] as? String else {
            throw AIProviderError.parsingError
        }

        return try parseRecipeJSON(text, url: url)
    }
}

// MARK: - Shared Helpers

enum AIProviderError: LocalizedError {
    case invalidURL
    case networkError(Error)
    case parsingError
    case apiError(String)
    case contentNotFound
    case rateLimited
    case invalidAPIKey

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid URL"
        case .networkError(let error): return "Network error: \(error.localizedDescription)"
        case .parsingError: return "Failed to parse response"
        case .apiError(let message): return message
        case .contentNotFound: return "No recipe found in content"
        case .rateLimited: return "Rate limited. Try again later."
        case .invalidAPIKey: return "Invalid API key"
        }
    }
}

private func validateResponse(_ response: URLResponse, data: Data) throws {
    guard let httpResponse = response as? HTTPURLResponse else {
        throw AIProviderError.networkError(URLError(.unknown))
    }

    switch httpResponse.statusCode {
    case 200...299:
        return
    case 401:
        throw AIProviderError.invalidAPIKey
    case 429:
        throw AIProviderError.rateLimited
    default:
        if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            let message = (errorJson["error"] as? [String: Any])?["message"] as? String
                ?? errorJson["message"] as? String
                ?? "HTTP \(httpResponse.statusCode)"
            throw AIProviderError.apiError(message)
        }
        throw AIProviderError.apiError("HTTP \(httpResponse.statusCode)")
    }
}

private func parseRecipeJSON(_ jsonString: String, url: URL) throws -> ExtractedRecipe {
    // Extract JSON from potential markdown code blocks
    var cleanJSON = jsonString
    if let jsonStart = jsonString.range(of: "{"),
       let jsonEnd = jsonString.range(of: "}", options: .backwards) {
        cleanJSON = String(jsonString[jsonStart.lowerBound...jsonEnd.upperBound])
    }

    guard let data = cleanJSON.data(using: .utf8),
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
        throw AIProviderError.parsingError
    }

    if json["error"] != nil {
        throw AIProviderError.contentNotFound
    }

    let ingredients = (json["ingredients"] as? [[String: Any]] ?? []).compactMap { item -> ExtractedIngredient? in
        guard let name = item["name"] as? String else { return nil }
        return ExtractedIngredient(
            name: name,
            quantity: item["quantity"] as? String,
            unit: item["unit"] as? String,
            category: mapCategory(item["category"] as? String)
        )
    }

    return ExtractedRecipe(
        title: json["title"] as? String ?? "Untitled Recipe",
        servings: json["servings"] as? Int,
        prepTime: json["prepTime"] as? String,
        cookTime: json["cookTime"] as? String,
        ingredients: ingredients,
        instructions: json["instructions"] as? [String] ?? [],
        imageURL: json["imageURL"] as? String,
        sourceURL: url.absoluteString,
        sourceType: determineSourceType(from: url)
    )
}

private func mapCategory(_ category: String?) -> Ingredient.IngredientCategory {
    switch category?.lowercased() {
    case "produce": return .produce
    case "meat", "meat & seafood": return .meat
    case "dairy", "dairy & eggs": return .dairy
    case "bakery": return .bakery
    case "pantry": return .pantry
    case "frozen": return .frozen
    case "beverages": return .beverages
    case "condiments", "condiments & sauces": return .condiments
    case "spices", "spices & seasonings": return .spices
    default: return .other
    }
}

private func determineSourceType(from url: URL) -> Recipe.SourceType {
    let host = url.host?.lowercased() ?? ""
    if host.contains("youtube.com") || host.contains("youtu.be") { return .youtube }
    if host.contains("tiktok.com") { return .tiktok }
    if host.contains("instagram.com") { return .instagram }
    return .url
}
