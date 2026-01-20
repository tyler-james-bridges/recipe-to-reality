import SwiftUI
import SwiftData

struct RecipeDetailView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var pantryItems: [PantryItem]
    @Bindable var recipe: Recipe

    @State private var showingAddToList = false
    @State private var showingAddToMealPlan = false
    @State private var selectedServings: Int = 0
    @State private var showingCopiedToast = false

    private let servingPresets = [2, 4, 6, 8]

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header Image
                headerSection

                VStack(alignment: .leading, spacing: 24) {
                    // Title and Meta
                    titleSection

                    // Quick Actions
                    actionButtons

                    Divider()

                    // Ingredients
                    ingredientsSection

                    Divider()

                    // Instructions
                    instructionsSection

                    // Source Link
                    if let sourceURL = recipe.sourceURL, let url = URL(string: sourceURL) {
                        Divider()
                        sourceSection(url: url)
                    }
                }
                .padding(.horizontal)
            }
        }
        .navigationTitle(recipe.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button {
                        HapticManager.mediumImpact()
                        recipe.isInQueue.toggle()
                    } label: {
                        Label(
                            recipe.isInQueue ? "Remove from Queue" : "Add to Queue",
                            systemImage: recipe.isInQueue ? "minus.circle" : "plus.circle"
                        )
                    }

                    Button {
                        HapticManager.success()
                        recipe.dateCooked = Date()
                    } label: {
                        Label("Mark as Cooked", systemImage: "checkmark.circle")
                    }

                    Button {
                        showingAddToMealPlan = true
                    } label: {
                        Label("Add to Meal Plan", systemImage: "calendar.badge.plus")
                    }

                    Button {
                        copyIngredients()
                    } label: {
                        Label("Copy Ingredients", systemImage: "doc.on.doc")
                    }

                    if recipe.sourceURL != nil {
                        Button {
                            shareRecipe()
                        } label: {
                            Label("Share", systemImage: "square.and.arrow.up")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .onAppear {
            selectedServings = recipe.servings ?? 4
        }
        .sheet(isPresented: $showingAddToList) {
            AddToGroceryListSheet(recipe: recipe)
        }
        .sheet(isPresented: $showingAddToMealPlan) {
            AddRecipeToMealPlanSheet(recipe: recipe)
        }
        .overlay(alignment: .top) {
            if showingCopiedToast {
                copiedToastView
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.spring(response: 0.3), value: showingCopiedToast)
    }

    // MARK: - Copied Toast

    private var copiedToastView: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text("Ingredients copied to clipboard")
                .font(.subheadline)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
        .padding(.top, 8)
    }

    // MARK: - Header Section

    private var headerSection: some View {
        Group {
            if let imageURL = recipe.imageURL, let url = URL(string: imageURL) {
                CachedAsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure, .empty:
                        placeholderImage
                    @unknown default:
                        placeholderImage
                    }
                }
                .frame(height: 250)
                .clipped()
            } else {
                placeholderImage
                    .frame(height: 200)
            }
        }
    }

    private var placeholderImage: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [.orange.opacity(0.3), .orange.opacity(0.1)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay {
                Image(systemName: "fork.knife")
                    .font(.system(size: 60))
                    .foregroundStyle(.orange.opacity(0.5))
            }
    }

    // MARK: - Title Section

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(recipe.title)
                .font(.title2)
                .fontWeight(.bold)

            HStack(spacing: 16) {
                if let servings = recipe.servings {
                    Label("\(servings) servings", systemImage: "person.2")
                }
                if let prepTime = recipe.prepTime {
                    Label(prepTime, systemImage: "clock")
                }
                if let cookTime = recipe.cookTime {
                    Label(cookTime, systemImage: "flame")
                }
            }
            .font(.subheadline)
            .foregroundStyle(.secondary)
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button {
                HapticManager.mediumImpact()
                recipe.isInQueue.toggle()
                if recipe.isInQueue {
                    HapticManager.success()
                }
            } label: {
                Label(
                    recipe.isInQueue ? "In Queue" : "Add to Queue",
                    systemImage: recipe.isInQueue ? "checkmark.circle.fill" : "plus.circle"
                )
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(recipe.isInQueue ? Color.orange : Color.gray.opacity(0.2))
                .foregroundStyle(recipe.isInQueue ? .white : .primary)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            Button {
                HapticManager.lightImpact()
                showingAddToList = true
            } label: {
                Label("Add to List", systemImage: "cart.badge.plus")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.orange)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    // MARK: - Ingredients Section

    private var ingredientsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Ingredients")
                    .font(.headline)

                Spacer()

                Button {
                    copyIngredients()
                } label: {
                    Image(systemName: "doc.on.doc")
                        .font(.subheadline)
                }
                .foregroundStyle(.secondary)
            }

            // Serving presets
            if recipe.servings != nil {
                servingPresetsView
            }

            ForEach(recipe.ingredients) { ingredient in
                let isOwned = pantryItems.contains { $0.matches(ingredient: ingredient) }
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: isOwned ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: isOwned ? 14 : 8))
                        .foregroundStyle(isOwned ? .green : .orange)
                        .padding(.top, isOwned ? 3 : 6)

                    Text(scaledIngredient(ingredient))
                        .font(.body)
                        .foregroundStyle(isOwned ? .primary : .primary)

                    Spacer()

                    if isOwned {
                        Text("In Pantry")
                            .font(.caption)
                            .foregroundStyle(.green)
                    }
                }
            }
        }
    }

    private var servingPresetsView: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Preset buttons
            HStack(spacing: 8) {
                ForEach(servingPresets, id: \.self) { preset in
                    Button {
                        HapticManager.selection()
                        selectedServings = preset
                    } label: {
                        Text("\(preset)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .frame(width: 40, height: 32)
                            .background(selectedServings == preset ? Color.orange : Color.gray.opacity(0.2))
                            .foregroundStyle(selectedServings == preset ? .white : .primary)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                }

                Spacer()

                // Fine-tune controls
                HStack(spacing: 4) {
                    Button {
                        if selectedServings > 1 {
                            HapticManager.selection()
                            selectedServings -= 1
                        }
                    } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.title3)
                    }
                    .disabled(selectedServings <= 1)

                    Text("\(selectedServings)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .frame(minWidth: 24)

                    Button {
                        HapticManager.selection()
                        selectedServings += 1
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                    }
                }
                .foregroundStyle(.orange)
            }

            if selectedServings != recipe.servings {
                Text("Scaled from \(recipe.servings ?? 0) servings")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }

    private func scaledIngredient(_ ingredient: Ingredient) -> String {
        guard let originalServings = recipe.servings,
              originalServings > 0,
              selectedServings != originalServings else {
            return ingredient.displayText
        }

        let scale = Double(selectedServings) / Double(originalServings)

        // Try to scale the quantity
        if let quantity = ingredient.quantity,
           let numericValue = parseQuantity(quantity) {
            let scaledValue = numericValue * scale
            let scaledQuantity = formatQuantity(scaledValue)

            var parts: [String] = [scaledQuantity]
            if let unit = ingredient.unit {
                parts.append(unit)
            }
            parts.append(ingredient.name)
            return parts.joined(separator: " ")
        }

        return ingredient.displayText
    }

    private func parseQuantity(_ str: String) -> Double? {
        // Handle fractions
        if str.contains("/") {
            let parts = str.split(separator: "/")
            if parts.count == 2,
               let num = Double(parts[0]),
               let den = Double(parts[1]),
               den != 0 {
                return num / den
            }
        }
        return Double(str)
    }

    private func formatQuantity(_ value: Double) -> String {
        if value == value.rounded() {
            return String(Int(value))
        }
        return String(format: "%.1f", value)
    }

    // MARK: - Instructions Section

    private var instructionsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Instructions")
                .font(.headline)

            ForEach(Array(recipe.instructions.enumerated()), id: \.offset) { index, instruction in
                HStack(alignment: .top, spacing: 12) {
                    Text("\(index + 1)")
                        .font(.headline)
                        .foregroundStyle(.white)
                        .frame(width: 28, height: 28)
                        .background(Color.orange)
                        .clipShape(Circle())

                    Text(instruction)
                        .font(.body)
                }
                .padding(.vertical, 4)
            }
        }
    }

    // MARK: - Source Section

    private func sourceSection(url: URL) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Source")
                .font(.headline)

            Link(destination: url) {
                HStack {
                    sourceIcon
                    Text(url.host ?? "Original Recipe")
                        .lineLimit(1)
                    Spacer()
                    Image(systemName: "arrow.up.right")
                }
                .font(.subheadline)
                .foregroundStyle(.orange)
                .padding()
                .background(Color.orange.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }

    private var sourceIcon: some View {
        Group {
            switch recipe.sourceType {
            case .youtube:
                Image(systemName: "play.rectangle.fill")
            case .tiktok:
                Image(systemName: "music.note")
            case .instagram:
                Image(systemName: "camera.fill")
            default:
                Image(systemName: "link")
            }
        }
    }

    // MARK: - Actions

    private func copyIngredients() {
        HapticManager.success()

        let ingredientsList = recipe.ingredients.map { scaledIngredient($0) }.joined(separator: "\n")
        let header = "Ingredients for \(recipe.title) (\(selectedServings) servings):\n\n"
        UIPasteboard.general.string = header + ingredientsList

        withAnimation {
            showingCopiedToast = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                showingCopiedToast = false
            }
        }
    }

    private func shareRecipe() {
        guard let sourceURL = recipe.sourceURL,
              let url = URL(string: sourceURL) else { return }

        let activityVC = UIActivityViewController(
            activityItems: [url],
            applicationActivities: nil
        )

        if let windowScene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
           let window = windowScene.windows.first,
           let rootVC = window.rootViewController {
            rootVC.present(activityVC, animated: true)
        }
    }
}

// MARK: - Add to Grocery List Sheet

struct AddToGroceryListSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Query private var groceryLists: [GroceryList]

    let recipe: Recipe

    @State private var selectedIngredients: Set<UUID> = []
    @State private var listName = "Shopping List"

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Select All / None
                HStack {
                    Button("Select All") {
                        HapticManager.lightImpact()
                        selectedIngredients = Set(recipe.ingredients.map { $0.id })
                    }
                    Spacer()
                    Button("Select None") {
                        HapticManager.lightImpact()
                        selectedIngredients.removeAll()
                    }
                }
                .font(.subheadline)
                .padding()

                Divider()

                // Ingredient list
                List {
                    ForEach(recipe.ingredients) { ingredient in
                        HStack {
                            Image(systemName: selectedIngredients.contains(ingredient.id)
                                  ? "checkmark.circle.fill"
                                  : "circle")
                            .foregroundStyle(selectedIngredients.contains(ingredient.id)
                                           ? .orange
                                           : .gray)

                            Text(ingredient.displayText)
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            HapticManager.selection()
                            toggleIngredient(ingredient.id)
                        }
                    }
                }
                .listStyle(.plain)
            }
            .navigationTitle("Add to Grocery List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add") {
                        HapticManager.success()
                        addToGroceryList()
                    }
                    .disabled(selectedIngredients.isEmpty)
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                // Select all by default
                selectedIngredients = Set(recipe.ingredients.map { $0.id })
            }
        }
    }

    private func toggleIngredient(_ id: UUID) {
        if selectedIngredients.contains(id) {
            selectedIngredients.remove(id)
        } else {
            selectedIngredients.insert(id)
        }
    }

    private func addToGroceryList() {
        // Get or create grocery list
        let list: GroceryList
        if let existingList = groceryLists.first {
            list = existingList
        } else {
            list = GroceryList(name: listName)
            modelContext.insert(list)
        }

        // Add selected ingredients
        for ingredient in recipe.ingredients where selectedIngredients.contains(ingredient.id) {
            // Check if item already exists
            if let existing = list.items.first(where: {
                $0.name.lowercased() == ingredient.name.lowercased()
            }) {
                existing.sourceRecipeIds.append(recipe.id)
            } else {
                let item = GroceryItem(
                    name: ingredient.name,
                    quantity: ingredient.quantity,
                    unit: ingredient.unit,
                    category: ingredient.category,
                    sourceRecipeIds: [recipe.id]
                )
                list.items.append(item)
            }
        }

        dismiss()
    }
}

// MARK: - Add Recipe to Meal Plan Sheet

struct AddRecipeToMealPlanSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    let recipe: Recipe

    @State private var selectedDate = Date()
    @State private var selectedMealType: MealPlan.MealType = .dinner
    @State private var enableReminder = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Date & Meal") {
                    DatePicker(
                        "Date",
                        selection: $selectedDate,
                        displayedComponents: .date
                    )

                    Picker("Meal", selection: $selectedMealType) {
                        ForEach(MealPlan.MealType.allCases, id: \.self) { type in
                            Label(type.rawValue, systemImage: type.icon)
                                .tag(type)
                        }
                    }
                }

                Section {
                    Toggle("Set Reminder", isOn: $enableReminder)
                } footer: {
                    Text("Get notified when it's time to start cooking.")
                }

                Section("Recipe") {
                    HStack(spacing: 12) {
                        AsyncImage(url: URL(string: recipe.imageURL ?? "")) { phase in
                            switch phase {
                            case .success(let image):
                                image.resizable().aspectRatio(contentMode: .fill)
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
                                .font(.subheadline)
                                .fontWeight(.medium)

                            HStack {
                                if let cookTime = recipe.cookTime {
                                    Label(cookTime, systemImage: "clock")
                                }
                                if let servings = recipe.servings {
                                    Label("\(servings)", systemImage: "person.2")
                                }
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Add to Meal Plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add") {
                        addToMealPlan()
                    }
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func addToMealPlan() {
        let calendar = Calendar.current
        let defaultTime = selectedMealType.defaultTime
        var components = calendar.dateComponents([.year, .month, .day], from: selectedDate)
        components.hour = defaultTime.hour
        components.minute = defaultTime.minute
        let reminderTime = calendar.date(from: components)

        let mealPlan = MealPlan(
            date: selectedDate,
            mealType: selectedMealType,
            recipeId: recipe.id,
            recipeName: recipe.title,
            reminder: enableReminder,
            reminderTime: enableReminder ? reminderTime : nil
        )

        modelContext.insert(mealPlan)
        dismiss()
    }
}

#Preview {
    NavigationStack {
        RecipeDetailView(recipe: Recipe(
            title: "Classic Spaghetti Carbonara",
            servings: 4,
            prepTime: "10 min",
            cookTime: "20 min",
            ingredients: [
                Ingredient(name: "spaghetti", quantity: "400", unit: "g"),
                Ingredient(name: "pancetta", quantity: "200", unit: "g"),
                Ingredient(name: "eggs", quantity: "4", unit: nil),
                Ingredient(name: "parmesan", quantity: "100", unit: "g"),
                Ingredient(name: "black pepper", quantity: nil, unit: nil)
            ],
            instructions: [
                "Bring a large pot of salted water to boil",
                "Cook spaghetti according to package directions",
                "Meanwhile, cook pancetta until crispy",
                "Mix eggs with parmesan and pepper",
                "Combine hot pasta with egg mixture and pancetta"
            ]
        ))
    }
    .modelContainer(for: [Recipe.self, PantryItem.self, MealPlan.self], inMemory: true)
}
