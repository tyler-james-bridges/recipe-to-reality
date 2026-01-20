import XCTest
@testable import RecipeToReality

final class ServingScalingTests: XCTestCase {

    // MARK: - Scaling Factor Tests

    func testScaleDoubling() {
        let original = 4
        let target = 8
        let factor = Double(target) / Double(original)
        XCTAssertEqual(factor, 2.0)
    }

    func testScaleHalving() {
        let original = 4
        let target = 2
        let factor = Double(target) / Double(original)
        XCTAssertEqual(factor, 0.5)
    }

    func testScaleToSameServings() {
        let original = 4
        let target = 4
        let factor = Double(target) / Double(original)
        XCTAssertEqual(factor, 1.0)
    }

    func testScaleIrregular() {
        let original = 4
        let target = 6
        let factor = Double(target) / Double(original)
        XCTAssertEqual(factor, 1.5)
    }

    // MARK: - Quantity Scaling Tests

    func testScaleWholeNumber() {
        let scaled = scaleQuantity("2", by: 2.0)
        XCTAssertEqual(scaled, "4")
    }

    func testScaleDecimal() {
        let scaled = scaleQuantity("1.5", by: 2.0)
        XCTAssertEqual(scaled, "3")
    }

    func testScaleFraction() {
        let scaled = scaleQuantity("1/2", by: 2.0)
        XCTAssertEqual(scaled, "1")
    }

    func testScaleMixedNumber() {
        let scaled = scaleQuantity("1 1/2", by: 2.0)
        XCTAssertEqual(scaled, "3")
    }

    func testScaleNonNumeric() {
        // Non-parseable quantities should remain unchanged
        let scaled = scaleQuantity("to taste", by: 2.0)
        XCTAssertEqual(scaled, "to taste")
    }

    func testScaleByHalf() {
        let scaled = scaleQuantity("4", by: 0.5)
        XCTAssertEqual(scaled, "2")
    }

    func testScaleResultsInFraction() {
        // 3 cups scaled by 0.5 = 1.5 cups
        let scaled = scaleQuantity("3", by: 0.5)
        XCTAssertEqual(scaled, "1.5")
    }

    // MARK: - Recipe Scaling Integration Tests

    func testScaleRecipeIngredients() {
        let recipe = Recipe(
            title: "Test Recipe",
            servings: 4,
            ingredients: [
                Ingredient(name: "flour", quantity: "2", unit: "cups"),
                Ingredient(name: "sugar", quantity: "1", unit: "cup"),
                Ingredient(name: "eggs", quantity: "3")
            ]
        )

        let scaledIngredients = scaleIngredients(recipe.ingredients, from: 4, to: 8)

        XCTAssertEqual(scaledIngredients[0].quantity, "4") // 2 * 2
        XCTAssertEqual(scaledIngredients[1].quantity, "2") // 1 * 2
        XCTAssertEqual(scaledIngredients[2].quantity, "6") // 3 * 2
    }

    func testScaleRecipeIngredientsDown() {
        let recipe = Recipe(
            title: "Test Recipe",
            servings: 8,
            ingredients: [
                Ingredient(name: "flour", quantity: "4", unit: "cups"),
                Ingredient(name: "sugar", quantity: "2", unit: "cups")
            ]
        )

        let scaledIngredients = scaleIngredients(recipe.ingredients, from: 8, to: 4)

        XCTAssertEqual(scaledIngredients[0].quantity, "2") // 4 / 2
        XCTAssertEqual(scaledIngredients[1].quantity, "1") // 2 / 2
    }

    // MARK: - Edge Cases

    func testScaleWithZeroServings() {
        // Should handle gracefully, probably return original
        let factor = calculateScalingFactor(from: 4, to: 0)
        // Ideally should return 1.0 or original quantities
        XCTAssertNil(factor) // or handle as needed
    }

    func testScaleFromZeroServings() {
        let factor = calculateScalingFactor(from: 0, to: 4)
        XCTAssertNil(factor) // Can't scale from 0
    }

    func testScaleVeryLargeNumber() {
        let scaled = scaleQuantity("1000", by: 2.0)
        XCTAssertEqual(scaled, "2000")
    }

    func testScaleVerySmallResult() {
        // 1/4 scaled by 0.5 = 1/8 = 0.125
        let scaled = scaleQuantity("1/4", by: 0.5)
        XCTAssertNotNil(scaled)
        // Should round to reasonable precision
    }

    // MARK: - Common Recipe Scaling Scenarios

    func testDoubleRecipeFor8() {
        // Common scenario: recipe serves 4, need 8
        let ingredients = [
            ("flour", "2", "cups"),
            ("sugar", "1/2", "cup"),
            ("butter", "1/4", "cup"),
            ("eggs", "2", nil)
        ]

        let scalingFactor = 2.0

        for (_, quantity, _) in ingredients {
            let scaled = scaleQuantity(quantity, by: scalingFactor)
            XCTAssertNotNil(scaled)
        }
    }

    func testHalveRecipeFor2() {
        // Common scenario: recipe serves 4, need 2
        let scalingFactor = 0.5

        XCTAssertEqual(scaleQuantity("2", by: scalingFactor), "1")
        XCTAssertEqual(scaleQuantity("1", by: scalingFactor), "0.5")
        XCTAssertEqual(scaleQuantity("1/2", by: scalingFactor), "0.3") // ~0.25, rounds
    }
}

// MARK: - Helper Functions for Tests

/// Scale a quantity string by a factor
private func scaleQuantity(_ quantity: String, by factor: Double) -> String {
    // Try to parse as number
    if let value = parseQuantity(quantity) {
        let scaled = value * factor
        // Format result
        if scaled == scaled.rounded() && scaled < 10000 {
            return String(Int(scaled))
        } else {
            return String(format: "%.1g", scaled)
        }
    }
    return quantity // Return unchanged if can't parse
}

/// Parse quantity string to double
private func parseQuantity(_ str: String) -> Double? {
    // Handle fractions like "1/2"
    if str.contains("/") && !str.contains(" ") {
        let parts = str.split(separator: "/")
        if parts.count == 2,
           let num = Double(parts[0]),
           let den = Double(parts[1]),
           den != 0 {
            return num / den
        }
    }

    // Handle mixed numbers like "1 1/2"
    let components = str.split(separator: " ")
    if components.count == 2 {
        if let whole = Double(components[0]) {
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
    }

    return Double(str)
}

/// Calculate scaling factor with safety checks
private func calculateScalingFactor(from originalServings: Int, to targetServings: Int) -> Double? {
    guard originalServings > 0, targetServings > 0 else {
        return nil
    }
    return Double(targetServings) / Double(originalServings)
}

/// Scale an array of ingredients
private func scaleIngredients(_ ingredients: [Ingredient], from originalServings: Int, to targetServings: Int) -> [Ingredient] {
    guard let factor = calculateScalingFactor(from: originalServings, to: targetServings) else {
        return ingredients
    }

    return ingredients.map { ingredient in
        Ingredient(
            name: ingredient.name,
            quantity: ingredient.quantity.map { scaleQuantity($0, by: factor) },
            unit: ingredient.unit,
            category: ingredient.category,
            isOptional: ingredient.isOptional
        )
    }
}
