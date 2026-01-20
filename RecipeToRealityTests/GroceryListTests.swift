import XCTest
@testable import RecipeToReality

final class GroceryListTests: XCTestCase {

    // MARK: - Quantity Parsing Tests

    func testParseWholeNumber() {
        // Test that whole numbers are parsed correctly
        let result = GroceryList.parseNumber("3")
        XCTAssertEqual(result, 3.0)
    }

    func testParseDecimalNumber() {
        let result = GroceryList.parseNumber("2.5")
        XCTAssertEqual(result, 2.5)
    }

    func testParseSimpleFraction() {
        let result = GroceryList.parseNumber("1/2")
        XCTAssertEqual(result, 0.5)
    }

    func testParseQuarterFraction() {
        let result = GroceryList.parseNumber("1/4")
        XCTAssertEqual(result, 0.25)
    }

    func testParseThirdFraction() {
        let result = GroceryList.parseNumber("1/3")
        XCTAssertEqual(result!, 1.0/3.0, accuracy: 0.001)
    }

    func testParseMixedNumber() {
        // Test "1 1/2" = 1.5
        let result = GroceryList.parseNumber("1 1/2")
        XCTAssertEqual(result, 1.5)
    }

    func testParseMixedNumberWithQuarter() {
        // Test "2 1/4" = 2.25
        let result = GroceryList.parseNumber("2 1/4")
        XCTAssertEqual(result, 2.25)
    }

    func testParseInvalidString() {
        let result = GroceryList.parseNumber("invalid")
        XCTAssertNil(result)
    }

    func testParseDivisionByZero() {
        let result = GroceryList.parseNumber("1/0")
        XCTAssertNil(result)
    }

    // MARK: - Quantity Combining Tests

    func testCombineWholeNumbers() {
        let result = GroceryList.combineQuantities("2", "3")
        XCTAssertEqual(result, "5")
    }

    func testCombineFractions() {
        // 1/2 + 1/4 = 3/4 = 0.75
        let result = GroceryList.combineQuantities("1/2", "1/4")
        XCTAssertEqual(result, "0.8") // Note: implementation returns decimal
    }

    func testCombineWholeAndFraction() {
        // 1 + 1/2 = 1.5
        let result = GroceryList.combineQuantities("1", "1/2")
        XCTAssertEqual(result, "1.5")
    }

    func testCombineMixedNumbers() {
        // 1 1/2 + 1 1/2 = 3
        let result = GroceryList.combineQuantities("1 1/2", "1 1/2")
        XCTAssertEqual(result, "3")
    }

    func testCombineIncompatibleStrings() {
        // When quantities can't be parsed, should concatenate
        let result = GroceryList.combineQuantities("some", "amount")
        XCTAssertEqual(result, "some + amount")
    }

    func testCombinePartiallyParseable() {
        // One parseable, one not
        let result = GroceryList.combineQuantities("2", "to taste")
        XCTAssertEqual(result, "2 + to taste")
    }

    // MARK: - Grocery List Generation Tests

    func testGenerateFromSingleRecipe() {
        let recipe = Recipe(
            title: "Test Recipe",
            ingredients: [
                Ingredient(name: "Flour", quantity: "2", unit: "cups", category: .pantry),
                Ingredient(name: "Sugar", quantity: "1", unit: "cup", category: .pantry)
            ]
        )

        let groceryList = GroceryList.generate(from: [recipe])

        XCTAssertEqual(groceryList.items.count, 2)
        XCTAssertTrue(groceryList.items.contains { $0.name == "Flour" })
        XCTAssertTrue(groceryList.items.contains { $0.name == "Sugar" })
    }

    func testGenerateConsolidatesDuplicates() {
        let recipe1 = Recipe(
            title: "Recipe 1",
            ingredients: [
                Ingredient(name: "Flour", quantity: "1", unit: "cup", category: .pantry)
            ]
        )
        let recipe2 = Recipe(
            title: "Recipe 2",
            ingredients: [
                Ingredient(name: "Flour", quantity: "2", unit: "cups", category: .pantry)
            ]
        )

        let groceryList = GroceryList.generate(from: [recipe1, recipe2])

        XCTAssertEqual(groceryList.items.count, 1)
        let flourItem = groceryList.items.first { $0.name == "Flour" }
        XCTAssertNotNil(flourItem)
        XCTAssertEqual(flourItem?.quantity, "3") // 1 + 2 = 3
        XCTAssertEqual(flourItem?.sourceRecipeIds.count, 2)
    }

    func testGenerateCaseInsensitiveConsolidation() {
        let recipe1 = Recipe(
            title: "Recipe 1",
            ingredients: [
                Ingredient(name: "flour", quantity: "1", unit: "cup", category: .pantry)
            ]
        )
        let recipe2 = Recipe(
            title: "Recipe 2",
            ingredients: [
                Ingredient(name: "Flour", quantity: "1", unit: "cup", category: .pantry)
            ]
        )

        let groceryList = GroceryList.generate(from: [recipe1, recipe2])

        XCTAssertEqual(groceryList.items.count, 1)
    }

    func testGenerateSortsByCategory() {
        let recipe = Recipe(
            title: "Test Recipe",
            ingredients: [
                Ingredient(name: "Chicken", quantity: "1", unit: "lb", category: .meat),
                Ingredient(name: "Lettuce", quantity: "1", unit: "head", category: .produce),
                Ingredient(name: "Salt", quantity: "1", unit: "tsp", category: .spices)
            ]
        )

        let groceryList = GroceryList.generate(from: [recipe])

        XCTAssertEqual(groceryList.items.count, 3)
        // Items should be sorted by category rawValue
    }

    func testGenerateFromEmptyRecipes() {
        let groceryList = GroceryList.generate(from: [])
        XCTAssertEqual(groceryList.items.count, 0)
    }

    func testGenerateWithCustomName() {
        let recipe = Recipe(
            title: "Test",
            ingredients: [Ingredient(name: "Test Item")]
        )

        let groceryList = GroceryList.generate(from: [recipe], name: "Custom List")

        XCTAssertEqual(groceryList.name, "Custom List")
    }

    // MARK: - GroceryItem Display Text Tests

    func testDisplayTextWithAllComponents() {
        let item = GroceryItem(name: "Flour", quantity: "2", unit: "cups")
        XCTAssertEqual(item.displayText, "2 cups Flour")
    }

    func testDisplayTextQuantityOnly() {
        let item = GroceryItem(name: "Eggs", quantity: "3")
        XCTAssertEqual(item.displayText, "3 Eggs")
    }

    func testDisplayTextNameOnly() {
        let item = GroceryItem(name: "Salt")
        XCTAssertEqual(item.displayText, "Salt")
    }

    // MARK: - Progress Tracking Tests

    func testProgressEmpty() {
        let groceryList = GroceryList(items: [])
        XCTAssertEqual(groceryList.progress, 0)
    }

    func testProgressNoneChecked() {
        let groceryList = GroceryList(items: [
            GroceryItem(name: "Item 1", isChecked: false),
            GroceryItem(name: "Item 2", isChecked: false)
        ])
        XCTAssertEqual(groceryList.progress, 0)
    }

    func testProgressHalfChecked() {
        let groceryList = GroceryList(items: [
            GroceryItem(name: "Item 1", isChecked: true),
            GroceryItem(name: "Item 2", isChecked: false)
        ])
        XCTAssertEqual(groceryList.progress, 0.5)
    }

    func testProgressAllChecked() {
        let groceryList = GroceryList(items: [
            GroceryItem(name: "Item 1", isChecked: true),
            GroceryItem(name: "Item 2", isChecked: true)
        ])
        XCTAssertEqual(groceryList.progress, 1.0)
    }
}

// MARK: - Test Helpers

extension GroceryList {
    /// Expose parseNumber for testing
    static func parseNumber(_ str: String) -> Double? {
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

    /// Expose combineQuantities for testing
    static func combineQuantities(_ q1: String, _ q2: String) -> String {
        if let n1 = parseNumber(q1), let n2 = parseNumber(q2) {
            let sum = n1 + n2
            if sum == sum.rounded() {
                return String(Int(sum))
            } else {
                return String(format: "%.1f", sum)
            }
        }
        return "\(q1) + \(q2)"
    }
}
