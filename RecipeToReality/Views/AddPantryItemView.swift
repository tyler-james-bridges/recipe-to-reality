import SwiftUI
import SwiftData

struct AddPantryItemView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    @State private var name = ""
    @State private var quantity = ""
    @State private var unit = ""
    @State private var category: Ingredient.IngredientCategory = .other
    @State private var hasExpiration = false
    @State private var expirationDate = Date().addingTimeInterval(7 * 24 * 60 * 60) // 1 week from now
    @State private var notes = ""

    var isValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Info
                Section("Item Details") {
                    TextField("Name (e.g., Eggs, Milk, Flour)", text: $name)
                        .textInputAutocapitalization(.words)

                    Picker("Category", selection: $category) {
                        ForEach(Ingredient.IngredientCategory.allCases, id: \.self) { cat in
                            Text(cat.rawValue).tag(cat)
                        }
                    }
                }

                // Quantity (Optional)
                Section("Quantity (Optional)") {
                    HStack {
                        TextField("Amount", text: $quantity)
                            .keyboardType(.decimalPad)
                            .frame(maxWidth: 100)

                        TextField("Unit (cups, lbs, etc.)", text: $unit)
                    }
                }

                // Expiration (Optional)
                Section {
                    Toggle("Track Expiration", isOn: $hasExpiration)

                    if hasExpiration {
                        DatePicker(
                            "Expires",
                            selection: $expirationDate,
                            displayedComponents: .date
                        )
                    }
                } footer: {
                    Text("Get notified when items are about to expire.")
                }

                // Notes (Optional)
                Section("Notes (Optional)") {
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                // Quick Add Section
                Section("Quick Add Common Items") {
                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: 8) {
                        ForEach(commonItems, id: \.name) { item in
                            QuickAddButton(item: item) {
                                addQuickItem(item)
                            }
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle("Add to Pantry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add") {
                        addItem()
                    }
                    .disabled(!isValid)
                    .fontWeight(.semibold)
                }
            }
        }
    }

    private func addItem() {
        let item = PantryItem(
            name: name.trimmingCharacters(in: .whitespaces),
            category: category,
            quantity: quantity.isEmpty ? nil : quantity,
            unit: unit.isEmpty ? nil : unit,
            expirationDate: hasExpiration ? expirationDate : nil,
            notes: notes.isEmpty ? nil : notes
        )
        modelContext.insert(item)
        dismiss()
    }

    private func addQuickItem(_ item: QuickItem) {
        let pantryItem = PantryItem(
            name: item.name,
            category: item.category
        )
        modelContext.insert(pantryItem)
    }

    // MARK: - Common Items

    struct QuickItem {
        let name: String
        let category: Ingredient.IngredientCategory
        let icon: String
    }

    private var commonItems: [QuickItem] {
        [
            QuickItem(name: "Eggs", category: .dairy, icon: "oval"),
            QuickItem(name: "Milk", category: .dairy, icon: "drop"),
            QuickItem(name: "Butter", category: .dairy, icon: "rectangle"),
            QuickItem(name: "Flour", category: .pantry, icon: "square.stack"),
            QuickItem(name: "Sugar", category: .pantry, icon: "cube"),
            QuickItem(name: "Salt", category: .spices, icon: "sparkle"),
            QuickItem(name: "Onion", category: .produce, icon: "circle"),
            QuickItem(name: "Garlic", category: .produce, icon: "leaf"),
            QuickItem(name: "Chicken", category: .meat, icon: "bird"),
        ]
    }
}

// MARK: - Quick Add Button

struct QuickAddButton: View {
    let item: AddPantryItemView.QuickItem
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: item.icon)
                    .font(.title3)
                Text(item.name)
                    .font(.caption)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 8)
            .background(Color.orange.opacity(0.1))
            .foregroundStyle(.orange)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }
}

#Preview {
    AddPantryItemView()
        .modelContainer(for: PantryItem.self, inMemory: true)
}
