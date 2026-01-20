import SwiftUI
import SwiftData

struct PantryView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \PantryItem.name) private var pantryItems: [PantryItem]
    @Query(sort: \Recipe.dateAdded, order: .reverse) private var recipes: [Recipe]

    @State private var showingAddItem = false
    @State private var showingWhatCanIMake = false
    @State private var searchText = ""
    @State private var selectedCategory: Ingredient.IngredientCategory?

    var filteredItems: [PantryItem] {
        var result = pantryItems

        if !searchText.isEmpty {
            result = result.filter {
                $0.name.localizedCaseInsensitiveContains(searchText)
            }
        }

        if let category = selectedCategory {
            result = result.filter { $0.category == category }
        }

        return result
    }

    var groupedItems: [Ingredient.IngredientCategory: [PantryItem]] {
        Dictionary(grouping: filteredItems) { $0.category }
    }

    var sortedCategories: [Ingredient.IngredientCategory] {
        groupedItems.keys.sorted { $0.rawValue < $1.rawValue }
    }

    var body: some View {
        NavigationStack {
            Group {
                if pantryItems.isEmpty {
                    emptyState
                } else {
                    pantryList
                }
            }
            .navigationTitle("Pantry")
            .searchable(text: $searchText, prompt: "Search pantry items")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !pantryItems.isEmpty {
                        Button {
                            showingWhatCanIMake = true
                        } label: {
                            Image(systemName: "lightbulb")
                        }
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddItem = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddItem) {
                AddPantryItemView()
            }
            .sheet(isPresented: $showingWhatCanIMake) {
                WhatCanIMakeView(pantryItems: pantryItems, recipes: recipes)
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        ContentUnavailableView {
            Label("Pantry is Empty", systemImage: "refrigerator")
        } description: {
            Text("Add ingredients you have on hand to see what recipes you can make.")
        } actions: {
            Button {
                showingAddItem = true
            } label: {
                Text("Add First Item")
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
    }

    // MARK: - Pantry List

    private var pantryList: some View {
        VStack(spacing: 0) {
            // Category filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(
                        title: "All",
                        isSelected: selectedCategory == nil
                    ) {
                        selectedCategory = nil
                    }

                    ForEach(Ingredient.IngredientCategory.allCases, id: \.self) { category in
                        let count = pantryItems.filter { $0.category == category }.count
                        if count > 0 {
                            FilterChip(
                                title: category.rawValue,
                                count: count,
                                isSelected: selectedCategory == category
                            ) {
                                selectedCategory = category
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
            }

            Divider()

            // Items list
            List {
                ForEach(sortedCategories, id: \.self) { category in
                    Section(header: Text(category.rawValue)) {
                        ForEach(groupedItems[category] ?? []) { item in
                            PantryItemRow(item: item)
                                .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                    Button(role: .destructive) {
                                        deleteItem(item)
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

    private func deleteItem(_ item: PantryItem) {
        modelContext.delete(item)
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    var count: Int?
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                if let count = count {
                    Text("(\(count))")
                        .font(.caption)
                }
            }
            .font(.subheadline)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Color.orange : Color.gray.opacity(0.2))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(Capsule())
        }
    }
}

// MARK: - Pantry Item Row

struct PantryItemRow: View {
    let item: PantryItem

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.body)

                if let quantity = item.quantity {
                    Text(item.unit != nil ? "\(quantity) \(item.unit!)" : quantity)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            // Expiration indicator
            if item.isExpired {
                Label("Expired", systemImage: "exclamationmark.triangle.fill")
                    .font(.caption)
                    .foregroundStyle(.red)
            } else if item.isExpiringSoon {
                Label("Expiring", systemImage: "clock.fill")
                    .font(.caption)
                    .foregroundStyle(.orange)
            }
        }
        .padding(.vertical, 2)
    }
}

#Preview {
    PantryView()
        .modelContainer(for: [PantryItem.self, Recipe.self], inMemory: true)
}
