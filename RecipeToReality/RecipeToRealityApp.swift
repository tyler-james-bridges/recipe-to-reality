import SwiftUI
import SwiftData
import RevenueCat

@main
struct RecipeToRealityApp: App {
    let modelContainer: ModelContainer

    init() {
        // Configure SwiftData
        do {
            modelContainer = try ModelContainer(for: Recipe.self, GroceryList.self, PantryItem.self)
        } catch {
            fatalError("Failed to initialize ModelContainer: \(error)")
        }

        // Configure RevenueCat - must be called early in app lifecycle
        PurchaseManager.shared.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.purchaseManager, PurchaseManager.shared)
        }
        .modelContainer(modelContainer)
    }
}
