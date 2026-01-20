import SwiftUI
import SwiftData

struct ContentView: View {
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            RecipeListView()
                .tabItem {
                    Label("Recipes", systemImage: "book.closed")
                }
                .tag(0)

            PantryView()
                .tabItem {
                    Label("Pantry", systemImage: "refrigerator")
                }
                .tag(1)

            MealPlanView()
                .tabItem {
                    Label("Meal Plan", systemImage: "calendar")
                }
                .tag(2)

            GroceryListView()
                .tabItem {
                    Label("Grocery List", systemImage: "cart")
                }
                .tag(3)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(4)
        }
        .tint(.orange)
        .handleSharedURLs()
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Recipe.self, GroceryList.self, PantryItem.self, MealPlan.self], inMemory: true)
}
