import Foundation
import SwiftData

@Model
final class PantryItem {
    var id: UUID
    var name: String
    var category: Ingredient.IngredientCategory
    var quantity: String?
    var unit: String?
    var dateAdded: Date
    var expirationDate: Date?
    var notes: String?

    init(
        id: UUID = UUID(),
        name: String,
        category: Ingredient.IngredientCategory = .other,
        quantity: String? = nil,
        unit: String? = nil,
        dateAdded: Date = Date(),
        expirationDate: Date? = nil,
        notes: String? = nil
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.quantity = quantity
        self.unit = unit
        self.dateAdded = dateAdded
        self.expirationDate = expirationDate
        self.notes = notes
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

    var isExpired: Bool {
        guard let expiration = expirationDate else { return false }
        return expiration < Date()
    }

    var isExpiringSoon: Bool {
        guard let expiration = expirationDate else { return false }
        let threeDaysFromNow = Calendar.current.date(byAdding: .day, value: 3, to: Date()) ?? Date()
        return expiration <= threeDaysFromNow && !isExpired
    }
}

// MARK: - Pantry Matching

extension PantryItem {
    /// Check if this pantry item matches an ingredient (case-insensitive, partial match)
    func matches(ingredient: Ingredient) -> Bool {
        let pantryName = name.lowercased().trimmingCharacters(in: .whitespaces)
        let ingredientName = ingredient.name.lowercased().trimmingCharacters(in: .whitespaces)

        // Exact match
        if pantryName == ingredientName {
            return true
        }

        // Partial match (e.g., "flour" matches "all-purpose flour")
        if ingredientName.contains(pantryName) || pantryName.contains(ingredientName) {
            return true
        }

        // Check common variations
        let pantryWords = Set(pantryName.split(separator: " ").map { String($0) })
        let ingredientWords = Set(ingredientName.split(separator: " ").map { String($0) })

        // If main word matches (ignoring modifiers like "fresh", "large", etc.)
        let commonModifiers = Set(["fresh", "large", "small", "medium", "organic", "chopped", "diced", "minced", "sliced"])
        let pantryKeyWords = pantryWords.subtracting(commonModifiers)
        let ingredientKeyWords = ingredientWords.subtracting(commonModifiers)

        return !pantryKeyWords.isDisjoint(with: ingredientKeyWords)
    }
}
