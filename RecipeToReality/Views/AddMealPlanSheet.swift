import SwiftUI
import SwiftData

struct AddMealPlanSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    let date: Date
    let mealType: MealPlan.MealType
    let recipes: [Recipe]

    @State private var selectedRecipeId: UUID?
    @State private var customMealName: String = ""
    @State private var notes: String = ""
    @State private var enableReminder: Bool = false
    @State private var reminderTime: Date
    @State private var searchText: String = ""
    @State private var showingCustomMeal: Bool = false

    var filteredRecipes: [Recipe] {
        if searchText.isEmpty {
            return recipes
        }
        return recipes.filter {
            $0.title.localizedCaseInsensitiveContains(searchText)
        }
    }

    var isValid: Bool {
        selectedRecipeId != nil || !customMealName.trimmingCharacters(in: .whitespaces).isEmpty
    }

    init(date: Date, mealType: MealPlan.MealType, recipes: [Recipe]) {
        self.date = date
        self.mealType = mealType
        self.recipes = recipes

        // Set default reminder time based on meal type
        let calendar = Calendar.current
        let defaultTime = mealType.defaultTime
        var components = calendar.dateComponents([.year, .month, .day], from: date)
        components.hour = defaultTime.hour
        components.minute = defaultTime.minute
        _reminderTime = State(initialValue: calendar.date(from: components) ?? date)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Header
                mealHeader

                if showingCustomMeal {
                    customMealForm
                } else {
                    recipeSelectionList
                }
            }
            .navigationTitle("Add \(mealType.rawValue)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add") {
                        addMealPlan()
                    }
                    .disabled(!isValid)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    // MARK: - Meal Header

    private var mealHeader: some View {
        VStack(spacing: 12) {
            HStack {
                Image(systemName: mealType.icon)
                    .font(.title2)
                    .foregroundStyle(.orange)

                VStack(alignment: .leading) {
                    Text(mealType.rawValue)
                        .font(.headline)
                    Text(date.formatted(.dateTime.weekday(.wide).month().day()))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }

            // Toggle between recipe selection and custom meal
            Picker("Meal Type", selection: $showingCustomMeal) {
                Text("Choose Recipe").tag(false)
                Text("Custom Meal").tag(true)
            }
            .pickerStyle(.segmented)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
    }

    // MARK: - Recipe Selection List

    private var recipeSelectionList: some View {
        VStack(spacing: 0) {
            // Search
            HStack {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(.secondary)
                TextField("Search recipes", text: $searchText)
            }
            .padding(10)
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .padding()

            if recipes.isEmpty {
                noRecipesView
            } else if filteredRecipes.isEmpty {
                noResultsView
            } else {
                recipeList
            }
        }
    }

    private var noRecipesView: some View {
        ContentUnavailableView {
            Label("No Recipes", systemImage: "book.closed")
        } description: {
            Text("Add some recipes first, then come back to plan your meals!")
        }
    }

    private var noResultsView: some View {
        ContentUnavailableView {
            Label("No Results", systemImage: "magnifyingglass")
        } description: {
            Text("No recipes match \"\(searchText)\"")
        }
    }

    private var recipeList: some View {
        List {
            ForEach(filteredRecipes) { recipe in
                RecipeSelectionRow(
                    recipe: recipe,
                    isSelected: selectedRecipeId == recipe.id
                ) {
                    if selectedRecipeId == recipe.id {
                        selectedRecipeId = nil
                    } else {
                        selectedRecipeId = recipe.id
                        customMealName = ""
                    }
                }
            }
        }
        .listStyle(.plain)
    }

    // MARK: - Custom Meal Form

    private var customMealForm: some View {
        Form {
            Section("Meal Name") {
                TextField("e.g., Leftovers, Eating Out", text: $customMealName)
            }

            Section("Notes (Optional)") {
                TextField("Notes", text: $notes, axis: .vertical)
                    .lineLimit(2...4)
            }

            Section {
                Toggle("Reminder", isOn: $enableReminder)

                if enableReminder {
                    DatePicker(
                        "Reminder Time",
                        selection: $reminderTime,
                        displayedComponents: [.hourAndMinute]
                    )
                }
            }
        }
    }

    // MARK: - Actions

    private func addMealPlan() {
        let selectedRecipe = recipes.first { $0.id == selectedRecipeId }

        let mealPlan = MealPlan(
            date: date,
            mealType: mealType,
            recipeId: selectedRecipeId,
            recipeName: selectedRecipe?.title ?? (customMealName.isEmpty ? nil : customMealName),
            notes: notes.isEmpty ? nil : notes,
            reminder: enableReminder,
            reminderTime: enableReminder ? reminderTime : nil
        )

        modelContext.insert(mealPlan)

        // Schedule notification if reminder is enabled
        if enableReminder {
            scheduleReminder(for: mealPlan)
        }

        dismiss()
    }

    private func scheduleReminder(for mealPlan: MealPlan) {
        guard let reminderTime = mealPlan.reminderTime else { return }

        let content = UNMutableNotificationContent()
        content.title = "Meal Reminder: \(mealPlan.mealType.rawValue)"
        content.body = mealPlan.recipeName ?? "Time to prepare your meal!"
        content.sound = .default

        let triggerDate = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: reminderTime)
        let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: false)

        let request = UNNotificationRequest(
            identifier: mealPlan.id.uuidString,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error = error {
                print("Failed to schedule notification: \(error)")
            }
        }
    }
}

// MARK: - Recipe Selection Row

struct RecipeSelectionRow: View {
    let recipe: Recipe
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
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
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    HStack(spacing: 8) {
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

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(.orange)
                        .font(.title3)
                } else {
                    Image(systemName: "circle")
                        .foregroundStyle(.secondary)
                        .font(.title3)
                }
            }
        }
        .contentShape(Rectangle())
    }
}

#Preview {
    AddMealPlanSheet(
        date: Date(),
        mealType: .dinner,
        recipes: [
            Recipe(title: "Spaghetti Carbonara", servings: 4, cookTime: "30 min"),
            Recipe(title: "Grilled Chicken Salad", servings: 2, cookTime: "20 min"),
            Recipe(title: "Beef Tacos", servings: 6, cookTime: "25 min")
        ]
    )
}
