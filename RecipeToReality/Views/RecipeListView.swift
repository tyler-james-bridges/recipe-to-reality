import SwiftUI
import SwiftData

struct RecipeListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Recipe.dateAdded, order: .reverse) private var recipes: [Recipe]
    @Query private var pantryItems: [PantryItem]

    @State private var showingAddRecipe = false
    @State private var searchText = ""
    @State private var selectedFilter: RecipeFilter = .all
    @State private var sortOption: SortOption = .dateAdded
    @State private var isRefreshing = false

    enum RecipeFilter: String, CaseIterable {
        case all = "All"
        case queue = "To Cook"
        case cooked = "Cooked"
    }

    enum SortOption: String, CaseIterable {
        case dateAdded = "Recently Added"
        case name = "Name"
        case cookTime = "Cook Time"

        var icon: String {
            switch self {
            case .dateAdded: return "calendar"
            case .name: return "textformat"
            case .cookTime: return "clock"
            }
        }
    }

    var filteredRecipes: [Recipe] {
        var result = recipes

        // Apply search filter
        if !searchText.isEmpty {
            result = result.filter { recipe in
                recipe.title.localizedCaseInsensitiveContains(searchText) ||
                recipe.ingredients.contains { $0.name.localizedCaseInsensitiveContains(searchText) }
            }
        }

        // Apply category filter
        switch selectedFilter {
        case .all:
            break
        case .queue:
            result = result.filter { $0.isInQueue }
        case .cooked:
            result = result.filter { $0.dateCooked != nil }
        }

        // Apply sorting
        switch sortOption {
        case .dateAdded:
            result.sort { ($0.dateAdded ?? Date.distantPast) > ($1.dateAdded ?? Date.distantPast) }
        case .name:
            result.sort { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .cookTime:
            result.sort { extractMinutes($0.cookTime) < extractMinutes($1.cookTime) }
        }

        return result
    }

    var body: some View {
        NavigationStack {
            Group {
                if recipes.isEmpty {
                    EmptyRecipeView(showingAddRecipe: $showingAddRecipe)
                } else {
                    recipeList
                }
            }
            .navigationTitle("Recipes")
            .searchable(text: $searchText, prompt: "Search recipes or ingredients")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !recipes.isEmpty {
                        sortMenu
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        HapticManager.lightImpact()
                        showingAddRecipe = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingAddRecipe) {
                AddRecipeView()
            }
        }
    }

    private var sortMenu: some View {
        Menu {
            ForEach(SortOption.allCases, id: \.self) { option in
                Button {
                    HapticManager.selection()
                    sortOption = option
                } label: {
                    Label(option.rawValue, systemImage: option.icon)
                    if sortOption == option {
                        Image(systemName: "checkmark")
                    }
                }
            }
        } label: {
            Image(systemName: "arrow.up.arrow.down.circle")
        }
    }

    private var recipeList: some View {
        VStack(spacing: 0) {
            // Filter picker
            Picker("Filter", selection: $selectedFilter) {
                ForEach(RecipeFilter.allCases, id: \.self) { filter in
                    Text(filter.rawValue).tag(filter)
                }
            }
            .pickerStyle(.segmented)
            .padding()
            .onChange(of: selectedFilter) { _, _ in
                HapticManager.selection()
            }

            List {
                ForEach(filteredRecipes) { recipe in
                    NavigationLink(destination: RecipeDetailView(recipe: recipe)) {
                        RecipeRowView(recipe: recipe, pantryItems: pantryItems)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            HapticManager.warning()
                            deleteRecipe(recipe)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading) {
                        Button {
                            HapticManager.mediumImpact()
                            toggleQueue(recipe)
                        } label: {
                            Label(
                                recipe.isInQueue ? "Remove from Queue" : "Add to Queue",
                                systemImage: recipe.isInQueue ? "minus.circle" : "plus.circle"
                            )
                        }
                        .tint(recipe.isInQueue ? .gray : .orange)
                    }
                }
            }
            .listStyle(.plain)
            .refreshable {
                await refreshRecipes()
            }
        }
    }

    private func deleteRecipe(_ recipe: Recipe) {
        modelContext.delete(recipe)
    }

    private func toggleQueue(_ recipe: Recipe) {
        recipe.isInQueue.toggle()
        if recipe.isInQueue {
            HapticManager.success()
        }
    }

    private func refreshRecipes() async {
        HapticManager.lightImpact()
        // Simulate refresh delay
        try? await Task.sleep(nanoseconds: 500_000_000)
        HapticManager.success()
    }

    /// Extract minutes from a cook time string like "30 min" or "1 hour"
    private func extractMinutes(_ cookTime: String?) -> Int {
        guard let time = cookTime?.lowercased() else { return Int.max }

        var totalMinutes = 0

        // Handle hours
        if let hourRange = time.range(of: #"(\d+)\s*(?:hour|hr|h)"#, options: .regularExpression) {
            let hourString = time[hourRange]
            if let hours = Int(hourString.filter { $0.isNumber }) {
                totalMinutes += hours * 60
            }
        }

        // Handle minutes
        if let minRange = time.range(of: #"(\d+)\s*(?:min|m)"#, options: .regularExpression) {
            let minString = time[minRange]
            if let mins = Int(minString.filter { $0.isNumber }) {
                totalMinutes += mins
            }
        }

        return totalMinutes == 0 ? Int.max : totalMinutes
    }
}

// MARK: - Empty State

struct EmptyRecipeView: View {
    @Binding var showingAddRecipe: Bool

    var body: some View {
        ContentUnavailableView {
            Label("No Recipes Yet", systemImage: "book.closed")
        } description: {
            Text("Save recipes from your favorite websites and videos to get started.")
        } actions: {
            Button {
                HapticManager.mediumImpact()
                showingAddRecipe = true
            } label: {
                Text("Add Your First Recipe")
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
    }
}

// MARK: - Recipe Row

struct RecipeRowView: View {
    let recipe: Recipe
    var pantryItems: [PantryItem] = []

    var pantryMatchPercentage: Double? {
        guard !pantryItems.isEmpty, !recipe.ingredients.isEmpty else { return nil }

        let matchedCount = recipe.ingredients.filter { ingredient in
            pantryItems.contains { $0.matches(ingredient: ingredient) }
        }.count

        return Double(matchedCount) / Double(recipe.ingredients.count) * 100
    }

    var body: some View {
        HStack(spacing: 12) {
            // Thumbnail with caching
            CachedAsyncImage(url: URL(string: recipe.imageURL ?? "")) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    placeholderImage
                case .empty:
                    placeholderImage
                @unknown default:
                    placeholderImage
                }
            }
            .frame(width: 60, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(recipe.title)
                    .font(.headline)
                    .lineLimit(2)

                HStack(spacing: 8) {
                    if let servings = recipe.servings {
                        Label("\(servings)", systemImage: "person.2")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    if let cookTime = recipe.cookTime {
                        Label(cookTime, systemImage: "clock")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    sourceIcon
                }
            }

            Spacer()

            // Pantry match indicator
            if let percentage = pantryMatchPercentage {
                PantryMatchBadge(percentage: percentage)
            }

            if recipe.isInQueue {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.orange)
            }
        }
        .padding(.vertical, 4)
    }

    private var placeholderImage: some View {
        RoundedRectangle(cornerRadius: 8)
            .fill(Color.gray.opacity(0.2))
            .overlay {
                Image(systemName: "fork.knife")
                    .foregroundStyle(.gray)
            }
    }

    private var sourceIcon: some View {
        Group {
            switch recipe.sourceType {
            case .youtube:
                Image(systemName: "play.rectangle.fill")
                    .foregroundStyle(.red)
            case .tiktok:
                Image(systemName: "music.note")
                    .foregroundStyle(.primary)
            case .instagram:
                Image(systemName: "camera.fill")
                    .foregroundStyle(.purple)
            case .url:
                Image(systemName: "link")
                    .foregroundStyle(.blue)
            case .video:
                Image(systemName: "video.fill")
                    .foregroundStyle(.blue)
            case .manual:
                Image(systemName: "pencil")
                    .foregroundStyle(.gray)
            }
        }
        .font(.caption)
    }
}

// MARK: - Pantry Match Badge

struct PantryMatchBadge: View {
    let percentage: Double

    var color: Color {
        if percentage >= 70 {
            return .green
        } else if percentage >= 40 {
            return .orange
        } else {
            return .gray
        }
    }

    var body: some View {
        HStack(spacing: 2) {
            Image(systemName: "refrigerator")
                .font(.caption2)
            Text("\(Int(percentage))%")
                .font(.caption2)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(color.opacity(0.15))
        .foregroundStyle(color)
        .clipShape(Capsule())
    }
}

// MARK: - Cached Async Image

/// A wrapper around AsyncImage that caches loaded images in memory
struct CachedAsyncImage<Content: View>: View {
    let url: URL?
    @ViewBuilder let content: (AsyncImagePhase) -> Content

    var body: some View {
        if let url = url, let cachedImage = ImageCache.shared.get(forKey: url.absoluteString) {
            content(.success(Image(uiImage: cachedImage)))
        } else {
            AsyncImage(url: url) { phase in
                if case .success(let image) = phase, let url = url {
                    content(phase)
                        .onAppear {
                            cacheImage(image, for: url)
                        }
                } else {
                    content(phase)
                }
            }
        }
    }

    private func cacheImage(_ image: Image, for url: URL) {
        // Convert SwiftUI Image to UIImage for caching
        let renderer = ImageRenderer(content: image.resizable().frame(width: 120, height: 120))
        if let uiImage = renderer.uiImage {
            ImageCache.shared.set(uiImage, forKey: url.absoluteString)
        }
    }
}

/// Simple in-memory image cache
final class ImageCache {
    static let shared = ImageCache()

    private var cache = NSCache<NSString, UIImage>()

    private init() {
        cache.countLimit = 100
        cache.totalCostLimit = 50 * 1024 * 1024 // 50MB
    }

    func get(forKey key: String) -> UIImage? {
        cache.object(forKey: key as NSString)
    }

    func set(_ image: UIImage, forKey key: String) {
        cache.setObject(image, forKey: key as NSString)
    }
}

#Preview {
    RecipeListView()
        .modelContainer(for: [Recipe.self, PantryItem.self], inMemory: true)
}
