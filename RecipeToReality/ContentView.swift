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

            GroceryListView()
                .tabItem {
                    Label("Grocery List", systemImage: "cart")
                }
                .tag(1)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .tag(2)
        }
        .tint(.orange)
        .handleSharedURLs()
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Recipe.self, GroceryList.self], inMemory: true)
}
