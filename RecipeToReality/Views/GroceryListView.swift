import SwiftUI
import SwiftData

struct GroceryListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var groceryLists: [GroceryList]
    @Query(filter: #Predicate<Recipe> { $0.isInQueue }) private var queuedRecipes: [Recipe]

    @State private var showingGenerateSheet = false

    private var currentList: GroceryList? {
        groceryLists.first
    }

    var body: some View {
        NavigationStack {
            Group {
                if let list = currentList, !list.items.isEmpty {
                    groceryListContent(list)
                } else {
                    emptyState
                }
            }
            .navigationTitle("Grocery List")
            .toolbar {
                if let list = currentList, !list.items.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Menu {
                            Button {
                                clearCheckedItems()
                            } label: {
                                Label("Clear Checked", systemImage: "checkmark.circle")
                            }

                            Button(role: .destructive) {
                                clearAllItems()
                            } label: {
                                Label("Clear All", systemImage: "trash")
                            }
                        } label: {
                            Image(systemName: "ellipsis.circle")
                        }
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingGenerateSheet = true
                    } label: {
                        Image(systemName: "wand.and.stars")
                    }
                }
            }
            .sheet(isPresented: $showingGenerateSheet) {
                GenerateGroceryListSheet()
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        ContentUnavailableView {
            Label("No Items Yet", systemImage: "cart")
        } description: {
            VStack(spacing: 8) {
                Text("Add ingredients from recipes or generate a list from your cooking queue.")

                if !queuedRecipes.isEmpty {
                    Text("\(queuedRecipes.count) recipes in your queue")
                        .font(.caption)
                        .foregroundStyle(.orange)
                }
            }
        } actions: {
            if !queuedRecipes.isEmpty {
                Button {
                    generateFromQueue()
                } label: {
                    Text("Generate from Queue")
                }
                .buttonStyle(.borderedProminent)
                .tint(.orange)
            }
        }
    }

    // MARK: - List Content

    private func groceryListContent(_ list: GroceryList) -> some View {
        VStack(spacing: 0) {
            // Progress header
            progressHeader(list)

            // Grouped items by category
            List {
                ForEach(groupedItems(list.items), id: \.category) { group in
                    Section(group.category.rawValue) {
                        ForEach(group.items) { item in
                            GroceryItemRow(item: item) {
                                toggleItem(item)
                            }
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    deleteItem(item, from: list)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }
            }
            .listStyle(.insetGrouped)
        }
    }

    private func progressHeader(_ list: GroceryList) -> some View {
        VStack(spacing: 8) {
            HStack {
                Text("\(list.completedCount) of \(list.totalCount) items")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Spacer()
                Text("\(Int(list.progress * 100))%")
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(.orange)
            }

            ProgressView(value: list.progress)
                .tint(.orange)
        }
        .padding()
        .background(Color(.systemBackground))
    }

    // MARK: - Grouped Items

    private struct CategoryGroup {
        let category: Ingredient.IngredientCategory
        let items: [GroceryItem]
    }

    private func groupedItems(_ items: [GroceryItem]) -> [CategoryGroup] {
        let grouped = Dictionary(grouping: items) { $0.category }
        return Ingredient.IngredientCategory.allCases.compactMap { category in
            guard let items = grouped[category], !items.isEmpty else { return nil }
            // Sort: unchecked first, then by name
            let sorted = items.sorted {
                if $0.isChecked != $1.isChecked {
                    return !$0.isChecked
                }
                return $0.name < $1.name
            }
            return CategoryGroup(category: category, items: sorted)
        }
    }

    // MARK: - Actions

    private func toggleItem(_ item: GroceryItem) {
        withAnimation {
            item.isChecked.toggle()
        }
    }

    private func deleteItem(_ item: GroceryItem, from list: GroceryList) {
        list.items.removeAll { $0.id == item.id }
    }

    private func clearCheckedItems() {
        guard let list = currentList else { return }
        list.items.removeAll { $0.isChecked }
    }

    private func clearAllItems() {
        guard let list = currentList else { return }
        list.items.removeAll()
    }

    private func generateFromQueue() {
        let list = GroceryList.generate(from: queuedRecipes)

        // Replace or create list
        if let existing = currentList {
            modelContext.delete(existing)
        }
        modelContext.insert(list)
    }
}

// MARK: - Grocery Item Row

struct GroceryItemRow: View {
    let item: GroceryItem
    let onToggle: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            Button {
                onToggle()
            } label: {
                Image(systemName: item.isChecked ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(item.isChecked ? .green : .gray)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 2) {
                Text(item.displayText)
                    .strikethrough(item.isChecked)
                    .foregroundStyle(item.isChecked ? .secondary : .primary)

                if item.sourceRecipeIds.count > 1 {
                    Text("From \(item.sourceRecipeIds.count) recipes")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onToggle()
        }
    }
}

// MARK: - Generate Grocery List Sheet

struct GenerateGroceryListSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext
    @Query private var recipes: [Recipe]
    @Query private var groceryLists: [GroceryList]
    @Query(sort: \MealPlan.date) private var mealPlans: [MealPlan]

    @State private var selectedRecipeIds: Set<UUID> = []
    @State private var generateMode: GenerateMode = .recipes
    @State private var startDate: Date = Date()
    @State private var endDate: Date = Calendar.current.date(byAdding: .day, value: 6, to: Date()) ?? Date()

    enum GenerateMode: String, CaseIterable {
        case recipes = "Recipes"
        case mealPlan = "Meal Plan"
    }

    private var queuedRecipes: [Recipe] {
        recipes.filter { $0.isInQueue }
    }

    private var mealPlanRecipeIds: Set<UUID> {
        let plansInRange = mealPlans.forDateRange(from: startDate, to: endDate)
        return Set(plansInRange.compactMap { $0.recipeId })
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Mode picker
                Picker("Generate Mode", selection: $generateMode) {
                    ForEach(GenerateMode.allCases, id: \.self) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                if generateMode == .recipes {
                    recipesSelectionView
                } else {
                    mealPlanSelectionView
                }
            }
            .navigationTitle("Generate List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Generate") {
                        generateList()
                    }
                    .disabled(generateMode == .recipes ? selectedRecipeIds.isEmpty : mealPlanRecipeIds.isEmpty)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    // MARK: - Recipes Selection View

    private var recipesSelectionView: some View {
        VStack(spacing: 0) {
            if recipes.isEmpty {
                ContentUnavailableView(
                    "No Recipes",
                    systemImage: "book.closed",
                    description: Text("Add some recipes first to generate a grocery list.")
                )
            } else {
                // Quick select options
                HStack {
                    Button("Select Queue (\(queuedRecipes.count))") {
                        selectedRecipeIds = Set(queuedRecipes.map { $0.id })
                    }
                    .disabled(queuedRecipes.isEmpty)

                    Spacer()

                    Button("Clear") {
                        selectedRecipeIds.removeAll()
                    }
                }
                .font(.subheadline)
                .padding()

                Divider()

                List {
                    ForEach(recipes) { recipe in
                        HStack {
                            Image(systemName: selectedRecipeIds.contains(recipe.id)
                                  ? "checkmark.circle.fill"
                                  : "circle")
                            .foregroundStyle(selectedRecipeIds.contains(recipe.id)
                                           ? .orange
                                           : .gray)

                            VStack(alignment: .leading) {
                                Text(recipe.title)
                                    .lineLimit(1)

                                Text("\(recipe.ingredients.count) ingredients")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if recipe.isInQueue {
                                Image(systemName: "clock")
                                    .font(.caption)
                                    .foregroundStyle(.orange)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            toggleRecipe(recipe.id)
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    // MARK: - Meal Plan Selection View

    private var mealPlanSelectionView: some View {
        VStack(spacing: 0) {
            // Date range picker
            VStack(spacing: 12) {
                DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
                DatePicker("End Date", selection: $endDate, in: startDate..., displayedComponents: .date)
            }
            .padding()

            Divider()

            // Show planned meals in range
            let plansInRange = mealPlans.forDateRange(from: startDate, to: endDate)

            if plansInRange.isEmpty {
                ContentUnavailableView(
                    "No Meals Planned",
                    systemImage: "calendar",
                    description: Text("No meals planned for this date range.")
                )
            } else {
                List {
                    let groupedByDate = plansInRange.groupedByDate()
                    ForEach(groupedByDate.keys.sorted(), id: \.self) { date in
                        Section(date.formatted(.dateTime.weekday().month().day())) {
                            ForEach(groupedByDate[date] ?? []) { plan in
                                HStack {
                                    Image(systemName: plan.mealType.icon)
                                        .foregroundStyle(.orange)
                                        .frame(width: 24)

                                    VStack(alignment: .leading) {
                                        Text(plan.mealType.rawValue)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                        Text(plan.recipeName ?? "Custom meal")
                                            .lineLimit(1)
                                    }

                                    Spacer()

                                    if plan.recipeId != nil {
                                        Image(systemName: "checkmark.circle.fill")
                                            .foregroundStyle(.green)
                                            .font(.caption)
                                    } else {
                                        Text("No recipe")
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                    }
                }
                .listStyle(.insetGrouped)

                // Summary
                Text("\(mealPlanRecipeIds.count) recipes to shop for")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding()
            }
        }
    }

    // MARK: - Actions

    private func toggleRecipe(_ id: UUID) {
        if selectedRecipeIds.contains(id) {
            selectedRecipeIds.remove(id)
        } else {
            selectedRecipeIds.insert(id)
        }
    }

    private func generateList() {
        let recipesToUse: [Recipe]

        if generateMode == .recipes {
            recipesToUse = recipes.filter { selectedRecipeIds.contains($0.id) }
        } else {
            recipesToUse = recipes.filter { mealPlanRecipeIds.contains($0.id) }
        }

        let list = GroceryList.generate(from: recipesToUse)

        // Replace existing list
        for existing in groceryLists {
            modelContext.delete(existing)
        }
        modelContext.insert(list)

        dismiss()
    }
}

#Preview {
    GroceryListView()
        .modelContainer(for: [Recipe.self, GroceryList.self, MealPlan.self], inMemory: true)
}
