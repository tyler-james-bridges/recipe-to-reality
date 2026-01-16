import Foundation
import SwiftData

@Model
final class Recipe {
    var id: UUID
    var title: String
    var sourceURL: String?
    var sourceType: SourceType
    var imageURL: String?
    var servings: Int?
    var prepTime: String?
    var cookTime: String?
    var instructions: [String]
    var notes: String?
    var isInQueue: Bool
    var dateAdded: Date
    var dateCooked: Date?

    @Relationship(deleteRule: .cascade, inverse: \Ingredient.recipe)
    var ingredients: [Ingredient]

    enum SourceType: String, Codable {
        case url = "url"
        case video = "video"
        case manual = "manual"
        case instagram = "instagram"
        case tiktok = "tiktok"
        case youtube = "youtube"
    }

    init(
        id: UUID = UUID(),
        title: String,
        sourceURL: String? = nil,
        sourceType: SourceType = .manual,
        imageURL: String? = nil,
        servings: Int? = nil,
        prepTime: String? = nil,
        cookTime: String? = nil,
        ingredients: [Ingredient] = [],
        instructions: [String] = [],
        notes: String? = nil,
        isInQueue: Bool = false,
        dateAdded: Date = Date(),
        dateCooked: Date? = nil
    ) {
        self.id = id
        self.title = title
        self.sourceURL = sourceURL
        self.sourceType = sourceType
        self.imageURL = imageURL
        self.servings = servings
        self.prepTime = prepTime
        self.cookTime = cookTime
        self.ingredients = ingredients
        self.instructions = instructions
        self.notes = notes
        self.isInQueue = isInQueue
        self.dateAdded = dateAdded
        self.dateCooked = dateCooked
    }
}

@Model
final class Ingredient {
    var id: UUID
    var name: String
    var quantity: String?
    var unit: String?
    var category: IngredientCategory
    var isOptional: Bool
    var recipe: Recipe?

    enum IngredientCategory: String, Codable, CaseIterable {
        case produce = "Produce"
        case meat = "Meat & Seafood"
        case dairy = "Dairy & Eggs"
        case bakery = "Bakery"
        case pantry = "Pantry"
        case frozen = "Frozen"
        case beverages = "Beverages"
        case condiments = "Condiments & Sauces"
        case spices = "Spices & Seasonings"
        case other = "Other"
    }

    init(
        id: UUID = UUID(),
        name: String,
        quantity: String? = nil,
        unit: String? = nil,
        category: IngredientCategory = .other,
        isOptional: Bool = false,
        recipe: Recipe? = nil
    ) {
        self.id = id
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.category = category
        self.isOptional = isOptional
        self.recipe = recipe
    }

    var displayText: String {
        var parts: [String] = []
        if let quantity = quantity {
            parts.append(quantity)
        }
        if let unit = unit {
            parts.append(unit)
        }
        parts.append(name)
        return parts.joined(separator: " ")
    }
}
