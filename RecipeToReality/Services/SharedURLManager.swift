import Foundation
import SwiftUI

/// Manages URLs shared from the Share Extension
class SharedURLManager: ObservableObject {
    static let shared = SharedURLManager()

    private let appGroupID = AppConstants.appGroupID
    private let sharedURLKey = AppConstants.sharedURLKey

    @Published var pendingURLs: [URL] = []

    private init() {
        loadPendingURLs()
    }

    /// Load any pending URLs from the Share Extension
    func loadPendingURLs() {
        guard let userDefaults = UserDefaults(suiteName: appGroupID) else { return }

        if let urlStrings = userDefaults.stringArray(forKey: sharedURLKey) {
            pendingURLs = urlStrings.compactMap { URL(string: $0) }
        }
    }

    /// Get and clear the next pending URL
    func popNextURL() -> URL? {
        guard !pendingURLs.isEmpty else { return nil }

        let url = pendingURLs.removeFirst()
        savePendingURLs()
        return url
    }

    /// Check if there are pending URLs
    var hasPendingURLs: Bool {
        !pendingURLs.isEmpty
    }

    /// Clear all pending URLs
    func clearAllPendingURLs() {
        pendingURLs.removeAll()
        savePendingURLs()
    }

    private func savePendingURLs() {
        guard let userDefaults = UserDefaults(suiteName: appGroupID) else { return }
        userDefaults.set(pendingURLs.map { $0.absoluteString }, forKey: sharedURLKey)
    }
}

// MARK: - View Modifier to Handle Shared URLs

struct SharedURLHandlerModifier: ViewModifier {
    @ObservedObject var sharedURLManager = SharedURLManager.shared
    @State private var showingSharedRecipe = false
    @State private var sharedURL: URL?

    func body(content: Content) -> some View {
        content
            .onAppear {
                checkForSharedURLs()
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)) { _ in
                checkForSharedURLs()
            }
            .sheet(isPresented: $showingSharedRecipe) {
                if let url = sharedURL {
                    SharedRecipeImportView(url: url)
                }
            }
    }

    private func checkForSharedURLs() {
        sharedURLManager.loadPendingURLs()
        if let url = sharedURLManager.popNextURL() {
            sharedURL = url
            showingSharedRecipe = true
        }
    }
}

extension View {
    func handleSharedURLs() -> some View {
        modifier(SharedURLHandlerModifier())
    }
}

// MARK: - Shared Recipe Import View

struct SharedRecipeImportView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.modelContext) private var modelContext

    let url: URL

    @State private var isExtracting = true
    @State private var extractedRecipe: ExtractedRecipe?
    @State private var error: Error?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                if isExtracting {
                    loadingView
                } else if let recipe = extractedRecipe {
                    successView(recipe)
                } else if let error = error {
                    errorView(error)
                }
            }
            .padding()
            .navigationTitle("Import Recipe")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                if extractedRecipe != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Save") {
                            saveRecipe()
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
            .task {
                await extractRecipe()
            }
        }
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.5)

            Text("Extracting recipe...")
                .font(.headline)

            Text(url.host ?? url.absoluteString)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func successView(_ recipe: ExtractedRecipe) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title)
                    .foregroundStyle(.green)
                Text("Recipe Found!")
                    .font(.title2)
                    .fontWeight(.bold)
            }

            VStack(alignment: .leading, spacing: 8) {
                Text(recipe.title)
                    .font(.headline)

                HStack(spacing: 16) {
                    if let servings = recipe.servings {
                        Label("\(servings) servings", systemImage: "person.2")
                    }
                    if let cookTime = recipe.cookTime {
                        Label(cookTime, systemImage: "clock")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)

                Text("\(recipe.ingredients.count) ingredients")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.gray.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            Spacer()
        }
    }

    private func errorView(_ error: Error) -> some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 50))
                .foregroundStyle(.orange)

            Text("Couldn't Extract Recipe")
                .font(.headline)

            Text(error.localizedDescription)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Try Again") {
                Task {
                    await extractRecipe()
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(.orange)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func extractRecipe() async {
        isExtracting = true
        error = nil

        do {
            extractedRecipe = try await RecipeExtractionService.shared.extractRecipe(from: url)
        } catch {
            self.error = error
        }

        isExtracting = false
    }

    private func saveRecipe() {
        guard let extracted = extractedRecipe else { return }

        let recipe = extracted.toRecipe()
        modelContext.insert(recipe)

        // Track extraction for free tier
        PurchaseManager.shared.recordExtraction()

        dismiss()
    }
}
