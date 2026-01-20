import SwiftUI
import SwiftData

struct WhatCanIMakeView: View {
    @Environment(\.dismiss) private var dismiss
    let pantryItems: [PantryItem]
    let recipes: [Recipe]

    var rankedRecipes: [(recipe: Recipe, matchPercentage: Double, matchedCount: Int, missingIngredients: [Ingredient])] {
        recipes.map { recipe in
            let totalIngredients = recipe.ingredients.count
            guard totalIngredients > 0 else {
                return (recipe: recipe, matchPercentage: 0, matchedCount: 0, missingIngredients: recipe.ingredients)
            }

            var matchedCount = 0
            var missingIngredients: [Ingredient] = []

            for ingredient in recipe.ingredients {
                let isMatched = pantryItems.contains { pantryItem in
                    pantryItem.matches(ingredient: ingredient)
                }
                if isMatched {
                    matchedCount += 1
                } else {
                    missingIngredients.append(ingredient)
                }
            }

            let percentage = Double(matchedCount) / Double(totalIngredients) * 100
            return (recipe: recipe, matchPercentage: percentage, matchedCount: matchedCount, missingIngredients: missingIngredients)
        }
        .sorted { $0.matchPercentage > $1.matchPercentage }
    }

    var body: some View {
        NavigationStack {
            Group {
                if recipes.isEmpty {
                    noRecipesView
                } else if pantryItems.isEmpty {
                    emptyPantryView
                } else {
                    recipeMatchList
                }
            }
            .navigationTitle("What Can I Make?")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    // MARK: - Empty States

    private var noRecipesView: some View {
        ContentUnavailableView {
            Label("No Recipes", systemImage: "book.closed")
        } description: {
            Text("Add some recipes first, then come back to see what you can make!")
        }
    }

    private var emptyPantryView: some View {
        ContentUnavailableView {
            Label("Pantry is Empty", systemImage: "refrigerator")
        } description: {
            Text("Add items to your pantry to see which recipes you can make.")
        }
    }

    // MARK: - Recipe Match List

    private var recipeMatchList: some View {
        List {
            // Can make section (70%+ match)
            let canMake = rankedRecipes.filter { $0.matchPercentage >= 70 }
            if !canMake.isEmpty {
                Section {
                    ForEach(canMake, id: \.recipe.id) { item in
                        NavigationLink(destination: RecipeDetailView(recipe: item.recipe)) {
                            RecipeMatchRow(
                                recipe: item.recipe,
                                matchPercentage: item.matchPercentage,
                                matchedCount: item.matchedCount,
                                totalCount: item.recipe.ingredients.count,
                                missingIngredients: item.missingIngredients
                            )
                        }
                    }
                } header: {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Ready to Cook")
                    }
                }
            }

            // Almost there section (40-70% match)
            let almostThere = rankedRecipes.filter { $0.matchPercentage >= 40 && $0.matchPercentage < 70 }
            if !almostThere.isEmpty {
                Section {
                    ForEach(almostThere, id: \.recipe.id) { item in
                        NavigationLink(destination: RecipeDetailView(recipe: item.recipe)) {
                            RecipeMatchRow(
                                recipe: item.recipe,
                                matchPercentage: item.matchPercentage,
                                matchedCount: item.matchedCount,
                                totalCount: item.recipe.ingredients.count,
                                missingIngredients: item.missingIngredients
                            )
                        }
                    }
                } header: {
                    HStack {
                        Image(systemName: "clock.fill")
                            .foregroundStyle(.orange)
                        Text("Almost There")
                    }
                }
            }

            // Need more section (<40% match)
            let needMore = rankedRecipes.filter { $0.matchPercentage < 40 }
            if !needMore.isEmpty {
                Section {
                    ForEach(needMore, id: \.recipe.id) { item in
                        NavigationLink(destination: RecipeDetailView(recipe: item.recipe)) {
                            RecipeMatchRow(
                                recipe: item.recipe,
                                matchPercentage: item.matchPercentage,
                                matchedCount: item.matchedCount,
                                totalCount: item.recipe.ingredients.count,
                                missingIngredients: item.missingIngredients
                            )
                        }
                    }
                } header: {
                    HStack {
                        Image(systemName: "cart.fill")
                            .foregroundStyle(.gray)
                        Text("Need Shopping")
                    }
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Recipe Match Row

struct RecipeMatchRow: View {
    let recipe: Recipe
    let matchPercentage: Double
    let matchedCount: Int
    let totalCount: Int
    let missingIngredients: [Ingredient]

    var matchColor: Color {
        if matchPercentage >= 70 {
            return .green
        } else if matchPercentage >= 40 {
            return .orange
        } else {
            return .gray
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                // Recipe image
                AsyncImage(url: URL(string: recipe.imageURL ?? "")) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        RoundedRectangle(cornerRadius: 6)
                            .fill(Color.gray.opacity(0.2))
                            .overlay {
                                Image(systemName: "fork.knife")
                                    .foregroundStyle(.gray)
                            }
                    }
                }
                .frame(width: 50, height: 50)
                .clipShape(RoundedRectangle(cornerRadius: 6))

                VStack(alignment: .leading, spacing: 4) {
                    Text(recipe.title)
                        .font(.headline)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        // Match percentage
                        Text("\(Int(matchPercentage))%")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(matchColor)

                        Text("match")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("(\(matchedCount)/\(totalCount) ingredients)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Progress ring
                CircularProgressView(progress: matchPercentage / 100, color: matchColor)
                    .frame(width: 36, height: 36)
            }

            // Missing ingredients
            if !missingIngredients.isEmpty && missingIngredients.count <= 5 {
                HStack(spacing: 4) {
                    Text("Missing:")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text(missingIngredients.prefix(3).map { $0.name }.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)

                    if missingIngredients.count > 3 {
                        Text("+\(missingIngredients.count - 3) more")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Circular Progress View

struct CircularProgressView: View {
    let progress: Double
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(color.opacity(0.2), lineWidth: 4)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))

            Text("\(Int(progress * 100))")
                .font(.caption2)
                .fontWeight(.semibold)
        }
    }
}

#Preview {
    WhatCanIMakeView(
        pantryItems: [
            PantryItem(name: "Eggs", category: .dairy),
            PantryItem(name: "Flour", category: .pantry),
            PantryItem(name: "Sugar", category: .pantry),
            PantryItem(name: "Butter", category: .dairy)
        ],
        recipes: [
            Recipe(
                title: "Pancakes",
                ingredients: [
                    Ingredient(name: "flour", quantity: "2", unit: "cups"),
                    Ingredient(name: "eggs", quantity: "2"),
                    Ingredient(name: "milk", quantity: "1", unit: "cup"),
                    Ingredient(name: "sugar", quantity: "2", unit: "tbsp")
                ]
            ),
            Recipe(
                title: "Cookies",
                ingredients: [
                    Ingredient(name: "flour", quantity: "2", unit: "cups"),
                    Ingredient(name: "butter", quantity: "1", unit: "cup"),
                    Ingredient(name: "sugar", quantity: "1", unit: "cup"),
                    Ingredient(name: "eggs", quantity: "2"),
                    Ingredient(name: "chocolate chips", quantity: "1", unit: "cup")
                ]
            )
        ]
    )
}
