import XCTest
@testable import RecipeToReality

final class IngredientParsingTests: XCTestCase {

    // MARK: - Ingredient Display Text Tests

    func testDisplayTextComplete() {
        let ingredient = Ingredient(
            name: "all-purpose flour",
            quantity: "2 1/2",
            unit: "cups"
        )
        XCTAssertEqual(ingredient.displayText, "2 1/2 cups all-purpose flour")
    }

    func testDisplayTextNoUnit() {
        let ingredient = Ingredient(
            name: "eggs",
            quantity: "3"
        )
        XCTAssertEqual(ingredient.displayText, "3 eggs")
    }

    func testDisplayTextNoQuantity() {
        let ingredient = Ingredient(
            name: "salt",
            unit: "to taste"
        )
        XCTAssertEqual(ingredient.displayText, "to taste salt")
    }

    func testDisplayTextNameOnly() {
        let ingredient = Ingredient(name: "fresh herbs")
        XCTAssertEqual(ingredient.displayText, "fresh herbs")
    }

    // MARK: - Ingredient Category Tests

    func testCategoryProduce() {
        let ingredient = Ingredient(name: "Carrots", category: .produce)
        XCTAssertEqual(ingredient.category, .produce)
        XCTAssertEqual(ingredient.category.rawValue, "Produce")
    }

    func testCategoryMeat() {
        let ingredient = Ingredient(name: "Chicken Breast", category: .meat)
        XCTAssertEqual(ingredient.category, .meat)
        XCTAssertEqual(ingredient.category.rawValue, "Meat & Seafood")
    }

    func testCategoryDairy() {
        let ingredient = Ingredient(name: "Milk", category: .dairy)
        XCTAssertEqual(ingredient.category, .dairy)
        XCTAssertEqual(ingredient.category.rawValue, "Dairy & Eggs")
    }

    func testCategoryDefaultsToOther() {
        let ingredient = Ingredient(name: "Mystery Item")
        XCTAssertEqual(ingredient.category, .other)
    }

    // MARK: - Optional Ingredient Tests

    func testOptionalIngredientDefault() {
        let ingredient = Ingredient(name: "Basil")
        XCTAssertFalse(ingredient.isOptional)
    }

    func testOptionalIngredientExplicit() {
        let ingredient = Ingredient(name: "Pine nuts", isOptional: true)
        XCTAssertTrue(ingredient.isOptional)
    }

    // MARK: - All Categories Available

    func testAllCategoriesExist() {
        let allCategories = Ingredient.IngredientCategory.allCases

        XCTAssertTrue(allCategories.contains(.produce))
        XCTAssertTrue(allCategories.contains(.meat))
        XCTAssertTrue(allCategories.contains(.dairy))
        XCTAssertTrue(allCategories.contains(.bakery))
        XCTAssertTrue(allCategories.contains(.pantry))
        XCTAssertTrue(allCategories.contains(.frozen))
        XCTAssertTrue(allCategories.contains(.beverages))
        XCTAssertTrue(allCategories.contains(.condiments))
        XCTAssertTrue(allCategories.contains(.spices))
        XCTAssertTrue(allCategories.contains(.other))

        XCTAssertEqual(allCategories.count, 10)
    }

    // MARK: - Quantity Format Edge Cases

    func testQuantityWithRange() {
        // "1-2 tablespoons" - quantity contains the range
        let ingredient = Ingredient(
            name: "olive oil",
            quantity: "1-2",
            unit: "tablespoons"
        )
        XCTAssertEqual(ingredient.displayText, "1-2 tablespoons olive oil")
    }

    func testQuantityWithSpecialCharacters() {
        let ingredient = Ingredient(
            name: "garlic",
            quantity: "2-3",
            unit: "cloves"
        )
        XCTAssertEqual(ingredient.displayText, "2-3 cloves garlic")
    }

    func testEmptyQuantityAndUnit() {
        let ingredient = Ingredient(
            name: "fresh parsley",
            quantity: "",
            unit: ""
        )
        // Empty strings should still work
        XCTAssertTrue(ingredient.displayText.contains("fresh parsley"))
    }

    // MARK: - Unicode and Special Characters

    func testIngredientWithUnicode() {
        let ingredient = Ingredient(
            name: "jalapeño peppers",
            quantity: "2",
            category: .produce
        )
        XCTAssertEqual(ingredient.name, "jalapeño peppers")
        XCTAssertEqual(ingredient.displayText, "2 jalapeño peppers")
    }

    func testIngredientWithApostrophe() {
        let ingredient = Ingredient(
            name: "baker's yeast",
            quantity: "1",
            unit: "packet"
        )
        XCTAssertEqual(ingredient.displayText, "1 packet baker's yeast")
    }
}

// MARK: - Common Ingredient Patterns

extension IngredientParsingTests {

    func testCommonFlourPattern() {
        let ingredient = Ingredient(
            name: "all-purpose flour",
            quantity: "2",
            unit: "cups",
            category: .pantry
        )
        XCTAssertEqual(ingredient.displayText, "2 cups all-purpose flour")
        XCTAssertEqual(ingredient.category, .pantry)
    }

    func testCommonSugarPattern() {
        let ingredient = Ingredient(
            name: "granulated sugar",
            quantity: "1/2",
            unit: "cup",
            category: .pantry
        )
        XCTAssertEqual(ingredient.displayText, "1/2 cup granulated sugar")
    }

    func testCommonButterPattern() {
        let ingredient = Ingredient(
            name: "unsalted butter",
            quantity: "1",
            unit: "stick",
            category: .dairy
        )
        XCTAssertEqual(ingredient.displayText, "1 stick unsalted butter")
        XCTAssertEqual(ingredient.category, .dairy)
    }

    func testCommonMeatPattern() {
        let ingredient = Ingredient(
            name: "ground beef",
            quantity: "1",
            unit: "lb",
            category: .meat
        )
        XCTAssertEqual(ingredient.displayText, "1 lb ground beef")
        XCTAssertEqual(ingredient.category, .meat)
    }
}
