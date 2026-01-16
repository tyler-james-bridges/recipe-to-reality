import SwiftUI
import SwiftData

struct RecipeListView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Recipe.dateAdded, order: .reverse) private var recipes: [Recipe]

    @State private var showingAddRecipe = false
    @State private var searchText = ""
    @State private var selectedFilter: RecipeFilter = .all

    enum RecipeFilter: String, CaseIterable {
        case all = "All"
        case queue = "To Cook"
        case cooked = "Cooked"
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
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
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

            List {
                ForEach(filteredRecipes) { recipe in
                    NavigationLink(destination: RecipeDetailView(recipe: recipe)) {
                        RecipeRowView(recipe: recipe)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            deleteRecipe(recipe)
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .swipeActions(edge: .leading) {
                        Button {
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
        }
    }

    private func deleteRecipe(_ recipe: Recipe) {
        modelContext.delete(recipe)
    }

    private func toggleQueue(_ recipe: Recipe) {
        recipe.isInQueue.toggle()
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

    var body: some View {
        HStack(spacing: 12) {
            // Thumbnail
            AsyncImage(url: URL(string: recipe.imageURL ?? "")) { phase in
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

#Preview {
    RecipeListView()
        .modelContainer(for: Recipe.self, inMemory: true)
}
