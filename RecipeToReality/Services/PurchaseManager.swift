import Foundation
import RevenueCat
import RevenueCatUI
import SwiftUI

// MARK: - App Configuration

enum AppConfiguration {
    /// RevenueCat API Key
    static let revenueCatAPIKey = "appl_BWFgrqnagLyQGJXyCpIhIUZKJKR"

    /// Entitlement identifier for premium access
    static let premiumEntitlement = "premium"

    /// Free tier limits
    static let freeRecipeExtractionLimit = 5
    static let freeRecipeSaveLimit = 10
}

// MARK: - Purchase Manager

/// Manages in-app purchases and subscriptions via RevenueCat
@MainActor
final class PurchaseManager: NSObject, ObservableObject {
    static let shared = PurchaseManager()

    // MARK: - Published State

    @Published private(set) var customerInfo: CustomerInfo?
    @Published private(set) var offerings: Offerings?
    @Published private(set) var isLoading = false
    @Published var error: Error?

    // Extraction tracking
    var extractionsUsed: Int {
        get { UserDefaults.standard.integer(forKey: extractionsKey) }
        set { UserDefaults.standard.set(newValue, forKey: extractionsKey) }
    }

    private let extractionsKey = "recipe_extractions_count"

    // MARK: - Computed Properties

    /// Check if user has active premium entitlement
    var isPremium: Bool {
        customerInfo?.entitlements[AppConfiguration.premiumEntitlement]?.isActive == true
    }

    /// Check if user can extract more recipes (free limit or premium)
    var canExtractRecipe: Bool {
        isPremium || extractionsUsed < AppConfiguration.freeRecipeExtractionLimit
    }

    /// Remaining free extractions
    var remainingFreeExtractions: Int {
        max(0, AppConfiguration.freeRecipeExtractionLimit - extractionsUsed)
    }

    /// Current offering for paywall display
    var currentOffering: Offering? {
        offerings?.current
    }

    // MARK: - Initialization

    private override init() {
        super.init()
    }

    // MARK: - Configuration

    /// Configure RevenueCat SDK - call in App init
    func configure() {
        // Enable debug logs during development
        Purchases.logLevel = .debug

        // Configure with API key
        Purchases.configure(withAPIKey: AppConfiguration.revenueCatAPIKey)

        // Set delegate for real-time updates
        Purchases.shared.delegate = self

        // Fetch initial data
        Task {
            await fetchCustomerInfo()
            await fetchOfferings()
        }
    }

    // MARK: - Data Fetching

    /// Fetch current customer info
    func fetchCustomerInfo() async {
        do {
            customerInfo = try await Purchases.shared.customerInfo()
            error = nil
        } catch {
            self.error = error
            print("Error fetching customer info: \(error.localizedDescription)")
        }
    }

    /// Fetch available offerings
    func fetchOfferings() async {
        isLoading = true
        defer { isLoading = false }

        do {
            offerings = try await Purchases.shared.offerings()
            error = nil
        } catch {
            self.error = error
            print("Error fetching offerings: \(error.localizedDescription)")
        }
    }

    // MARK: - Purchase Operations

    /// Purchase a package
    func purchase(_ package: Package) async throws -> CustomerInfo {
        isLoading = true
        defer { isLoading = false }

        let result = try await Purchases.shared.purchase(package: package)
        customerInfo = result.customerInfo
        return result.customerInfo
    }

    /// Restore previous purchases
    func restorePurchases() async throws -> CustomerInfo {
        isLoading = true
        defer { isLoading = false }

        let customerInfo = try await Purchases.shared.restorePurchases()
        self.customerInfo = customerInfo
        return customerInfo
    }

    // MARK: - Extraction Tracking

    /// Record a recipe extraction
    func recordExtraction() {
        extractionsUsed += 1
    }

    /// Reset extraction count (for testing)
    func resetExtractionCount() {
        extractionsUsed = 0
    }
}

// MARK: - RevenueCat Delegate

extension PurchaseManager: PurchasesDelegate {
    nonisolated func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
        Task { @MainActor in
            self.customerInfo = customerInfo
        }
    }
}

// MARK: - SwiftUI Environment

private struct PurchaseManagerKey: EnvironmentKey {
    static let defaultValue = PurchaseManager.shared
}

extension EnvironmentValues {
    var purchaseManager: PurchaseManager {
        get { self[PurchaseManagerKey.self] }
        set { self[PurchaseManagerKey.self] = newValue }
    }
}

// MARK: - Paywall Presentation Modifier

/// Modifier to present paywall when user doesn't have premium access
struct PremiumPaywallModifier: ViewModifier {
    let requiredEntitlement: String

    func body(content: Content) -> some View {
        content
            .presentPaywallIfNeeded(
                requiredEntitlementIdentifier: requiredEntitlement,
                purchaseCompleted: { customerInfo in
                    print("Purchase completed: \(customerInfo.entitlements)")
                },
                restoreCompleted: { customerInfo in
                    print("Purchases restored: \(customerInfo.entitlements)")
                }
            )
    }
}

extension View {
    /// Present paywall if user doesn't have the specified entitlement
    func requiresPremium() -> some View {
        modifier(PremiumPaywallModifier(requiredEntitlement: AppConfiguration.premiumEntitlement))
    }
}

// MARK: - Extraction Limit Banner

struct ExtractionLimitBanner: View {
    @State private var showingPaywall = false
    var purchaseManager = PurchaseManager.shared

    var body: some View {
        Group {
            if !purchaseManager.isPremium {
                HStack {
                    Image(systemName: "wand.and.stars")
                        .foregroundStyle(.orange)

                    VStack(alignment: .leading, spacing: 2) {
                        Text("\(purchaseManager.remainingFreeExtractions) free extractions left")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Text("Upgrade for unlimited")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Button("Upgrade") {
                        showingPaywall = true
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(.orange)
                    .controlSize(.small)
                }
                .padding()
                .background(Color.orange.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .sheet(isPresented: $showingPaywall) {
                    PaywallView(displayCloseButton: true)
                        .onPurchaseCompleted { _ in
                            showingPaywall = false
                        }
                        .onRestoreCompleted { _ in
                            showingPaywall = false
                        }
                }
            }
        }
    }
}

// MARK: - Premium Gate View Modifier

struct PremiumGateModifier: ViewModifier {
    @State private var showingPaywall = false
    var purchaseManager = PurchaseManager.shared

    let action: () -> Void

    func body(content: Content) -> some View {
        content
            .onTapGesture {
                if purchaseManager.canExtractRecipe {
                    action()
                } else {
                    showingPaywall = true
                }
            }
            .sheet(isPresented: $showingPaywall) {
                PaywallView(displayCloseButton: true)
                    .onPurchaseCompleted { _ in
                        showingPaywall = false
                    }
            }
    }
}

extension View {
    func premiumGated(action: @escaping () -> Void) -> some View {
        modifier(PremiumGateModifier(action: action))
    }
}
