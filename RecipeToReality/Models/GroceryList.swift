import Foundation
import SwiftData

@Model
final class GroceryList {
    var id: UUID
    var name: String
    var dateCreated: Date
    var items: [GroceryItem]

    init(
        id: UUID = UUID(),
        name: String = "Shopping List",
        dateCreated: Date = Date(),
        items: [GroceryItem] = []
    ) {
        self.id = id
        self.name = name
        self.dateCreated = dateCreated
        self.items = items
    }

    var completedCount: Int {
        items.filter { $0.isChecked }.count
    }

    var totalCount: Int {
        items.count
    }

    var progress: Double {
        guard totalCount > 0 else { return 0 }
        return Double(completedCount) / Double(totalCount)
    }
}

@Model
final class GroceryItem {
    var id: UUID
    var name: String
    var quantity: String?
    var unit: String?
    var category: Ingredient.IngredientCategory
    var isChecked: Bool
    var sourceRecipeIds: [UUID]

    init(
        id: UUID = UUID(),
        name: String,
        quantity: String? = nil,
        unit: String? = nil,
        category: Ingredient.IngredientCategory = .other,
        isChecked: Bool = false,
        sourceRecipeIds: [UUID] = []
    ) {
        self.id = id
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.category = category
        self.isChecked = isChecked
        self.sourceRecipeIds = sourceRecipeIds
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

// MARK: - Grocery List Generation

extension GroceryList {
    /// Creates a consolidated grocery list from multiple recipes
    static func generate(from recipes: [Recipe], name: String = "Shopping List") -> GroceryList {
        var consolidatedItems: [String: GroceryItem] = [:]

        for recipe in recipes {
            for ingredient in recipe.ingredients {
                let key = ingredient.name.lowercased().trimmingCharacters(in: .whitespaces)

                if let existing = consolidatedItems[key] {
                    // Combine quantities if possible
                    existing.sourceRecipeIds.append(recipe.id)
                    if let newQty = ingredient.quantity,
                       let existingQty = existing.quantity {
                        existing.quantity = combineQuantities(existingQty, newQty)
                    }
                } else {
                    let item = GroceryItem(
                        name: ingredient.name,
                        quantity: ingredient.quantity,
                        unit: ingredient.unit,
                        category: ingredient.category,
                        sourceRecipeIds: [recipe.id]
                    )
                    consolidatedItems[key] = item
                }
            }
        }

        return GroceryList(
            name: name,
            items: Array(consolidatedItems.values).sorted { $0.category.rawValue < $1.category.rawValue }
        )
    }

    /// Attempts to combine two quantity strings
    private static func combineQuantities(_ q1: String, _ q2: String) -> String {
        // Try to parse as numbers
        if let n1 = parseNumber(q1), let n2 = parseNumber(q2) {
            let sum = n1 + n2
            if sum == sum.rounded() {
                return String(Int(sum))
            } else {
                return String(format: "%.1f", sum)
            }
        }
        // Can't combine, just list both
        return "\(q1) + \(q2)"
    }

    private static func parseNumber(_ str: String) -> Double? {
        // Handle fractions like "1/2"
        if str.contains("/") {
            let parts = str.split(separator: "/")
            if parts.count == 2,
               let numerator = Double(parts[0]),
               let denominator = Double(parts[1]),
               denominator != 0 {
                return numerator / denominator
            }
        }
        // Handle mixed numbers like "1 1/2"
        let components = str.split(separator: " ")
        if components.count == 2,
           let whole = Double(components[0]) {
            if components[1].contains("/") {
                let fracParts = components[1].split(separator: "/")
                if fracParts.count == 2,
                   let num = Double(fracParts[0]),
                   let den = Double(fracParts[1]),
                   den != 0 {
                    return whole + (num / den)
                }
            }
        }
        return Double(str)
    }
}
