import SwiftUI
import SwiftData

struct AddRecipeView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var urlText = ""
    @State private var isExtracting = false
    @State private var extractedRecipe: ExtractedRecipe?
    @State private var error: Error?
    @State private var showingError = false
    @State private var showingManualEntry = false

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // URL Input Section
                VStack(alignment: .leading, spacing: 12) {
                    Text("Paste a recipe link")
                        .font(.headline)

                    TextField("https://example.com/recipe", text: $urlText)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .keyboardType(.URL)

                    Text("Supports blogs, YouTube, TikTok, Instagram, and more")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // Extract Button
                Button {
                    Task {
                        await extractRecipe()
                    }
                } label: {
                    HStack {
                        if isExtracting {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "wand.and.stars")
                        }
                        Text(isExtracting ? "Extracting Recipe..." : "Extract Recipe")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(urlText.isEmpty ? Color.gray : Color.orange)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(urlText.isEmpty || isExtracting)

                // Extracted Recipe Preview
                if let recipe = extractedRecipe {
                    extractedRecipePreview(recipe)
                }

                Spacer()

                // Manual Entry Option
                Button {
                    showingManualEntry = true
                } label: {
                    Text("Or enter recipe manually")
                        .font(.subheadline)
                        .foregroundStyle(.orange)
                }
            }
            .padding()
            .navigationTitle("Add Recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                if extractedRecipe != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Save") {
                            saveRecipe()
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") {}
            } message: {
                Text(error?.localizedDescription ?? "Unknown error")
            }
            .sheet(isPresented: $showingManualEntry) {
                ManualRecipeEntryView()
            }
        }
    }

    private func extractedRecipePreview(_ recipe: ExtractedRecipe) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Divider()

            Text("Preview")
                .font(.headline)

            VStack(alignment: .leading, spacing: 8) {
                Text(recipe.title)
                    .font(.title3)
                    .fontWeight(.semibold)

                HStack(spacing: 16) {
                    if let servings = recipe.servings {
                        Label("\(servings) servings", systemImage: "person.2")
                    }
                    if let prepTime = recipe.prepTime {
                        Label(prepTime, systemImage: "clock")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)

                Text("\(recipe.ingredients.count) ingredients")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Text("\(recipe.instructions.count) steps")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func extractRecipe() async {
        guard let url = URL(string: urlText) else {
            error = AIProviderError.invalidURL
            showingError = true
            return
        }

        isExtracting = true
        defer { isExtracting = false }

        do {
            extractedRecipe = try await RecipeExtractionService.shared.extractRecipe(from: url)
        } catch AISettingsManager.KeychainError.notFound {
            error = NSError(
                domain: "RecipeToReality",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Please configure an AI provider in Settings first"]
            )
            showingError = true
        } catch {
            self.error = error
            showingError = true
        }
    }

    private func saveRecipe() {
        guard let extracted = extractedRecipe else { return }

        let recipe = extracted.toRecipe()
        modelContext.insert(recipe)

        dismiss()
    }
}

// MARK: - Manual Entry View

struct ManualRecipeEntryView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var title = ""
    @State private var servings = ""
    @State private var prepTime = ""
    @State private var cookTime = ""
    @State private var ingredientsText = ""
    @State private var instructionsText = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Basic Info") {
                    TextField("Recipe Title", text: $title)

                    HStack {
                        TextField("Servings", text: $servings)
                            .keyboardType(.numberPad)
                        TextField("Prep Time", text: $prepTime)
                        TextField("Cook Time", text: $cookTime)
                    }
                }

                Section("Ingredients") {
                    TextEditor(text: $ingredientsText)
                        .frame(minHeight: 100)

                    Text("Enter one ingredient per line")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("Instructions") {
                    TextEditor(text: $instructionsText)
                        .frame(minHeight: 150)

                    Text("Enter one step per line")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Add Recipe Manually")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        saveManualRecipe()
                    }
                    .disabled(title.isEmpty)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func saveManualRecipe() {
        let recipe = Recipe(
            title: title,
            sourceType: .manual,
            servings: Int(servings),
            prepTime: prepTime.isEmpty ? nil : prepTime,
            cookTime: cookTime.isEmpty ? nil : cookTime,
            instructions: instructionsText
                .components(separatedBy: .newlines)
                .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }
        )

        // Parse ingredients
        let ingredientLines = ingredientsText
            .components(separatedBy: .newlines)
            .filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }

        for line in ingredientLines {
            let ingredient = Ingredient(name: line, recipe: recipe)
            recipe.ingredients.append(ingredient)
        }

        modelContext.insert(recipe)
        dismiss()
    }
}

#Preview {
    AddRecipeView()
        .modelContainer(for: Recipe.self, inMemory: true)
}
