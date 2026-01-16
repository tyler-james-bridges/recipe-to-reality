import SwiftUI
import RevenueCat
import RevenueCatUI

struct SettingsView: View {
    @State private var showingPaywall = false
    @State private var showingCustomerCenter = false
    @State private var showingAPIKeyEntry = false
    @State private var hasAPIKey = false
    @State private var isRestoring = false
    @State private var showingRestoreAlert = false
    @State private var restoreMessage = ""

    var purchaseManager = PurchaseManager.shared

    var body: some View {
        NavigationStack {
            List {
                // Subscription Section
                subscriptionSection

                // API Configuration Section
                apiConfigurationSection

                // About Section
                aboutSection

                // Support Section
                supportSection

                #if DEBUG
                // Debug Section (only in development)
                debugSection
                #endif
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showingPaywall) {
                // RevenueCat PaywallView - automatically handles UI based on your dashboard configuration
                PaywallView(displayCloseButton: true)
                    .onPurchaseCompleted { customerInfo in
                        print("Purchase completed!")
                        showingPaywall = false
                    }
                    .onRestoreCompleted { customerInfo in
                        print("Restore completed!")
                        showingPaywall = false
                    }
            }
            .presentCustomerCenter(isPresented: $showingCustomerCenter) {
                // Called when customer center is dismissed
                showingCustomerCenter = false
            }
            .sheet(isPresented: $showingAPIKeyEntry) {
                AIProviderSettingsView(hasAPIKey: $hasAPIKey)
            }
            .alert("Restore Purchases", isPresented: $showingRestoreAlert) {
                Button("OK") {}
            } message: {
                Text(restoreMessage)
            }
            .onAppear {
                checkAPIKey()
            }
        }
    }

    // MARK: - Subscription Section

    private var subscriptionSection: some View {
        Section {
            if purchaseManager.isPremium {
                // Premium user - show status and management options
                HStack {
                    Image(systemName: "crown.fill")
                        .foregroundStyle(.yellow)
                    Text("Premium Active")
                    Spacer()
                    Text("Unlimited")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                // Customer Center for managing subscription
                Button {
                    showingCustomerCenter = true
                } label: {
                    HStack {
                        Image(systemName: "person.crop.circle")
                        Text("Manage Subscription")
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)
            } else {
                // Free user - show upgrade option
                Button {
                    showingPaywall = true
                } label: {
                    HStack {
                        Image(systemName: "star.fill")
                            .foregroundStyle(.orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Upgrade to Premium")
                                .font(.headline)
                            Text("\(purchaseManager.remainingFreeExtractions) free extractions remaining")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)
            }
        } header: {
            Text("Subscription")
        } footer: {
            if !purchaseManager.isPremium {
                Text("Premium unlocks unlimited recipe extractions, smart grocery list consolidation, and serving adjustments.")
            }
        }
    }

    // MARK: - API Configuration Section

    @State private var selectedProviderName = "OpenAI"

    private var apiConfigurationSection: some View {
        Section {
            Button {
                showingAPIKeyEntry = true
            } label: {
                HStack {
                    Image(systemName: hasAPIKey ? "checkmark.circle.fill" : "key")
                        .foregroundStyle(hasAPIKey ? .green : .orange)
                    VStack(alignment: .leading) {
                        Text("AI Provider")
                        Text(selectedProviderName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(hasAPIKey ? "Configured" : "Required")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            .foregroundStyle(.primary)
        } header: {
            Text("Recipe Extraction")
        } footer: {
            Text("Choose OpenAI, Claude, or Gemini to power recipe extraction.")
        }
    }

    // MARK: - About Section

    private var aboutSection: some View {
        Section("About") {
            HStack {
                Text("Version")
                Spacer()
                Text("1.0.0")
                    .foregroundStyle(.secondary)
            }

            Link(destination: URL(string: "https://example.com/privacy")!) {
                HStack {
                    Text("Privacy Policy")
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                }
            }
            .foregroundStyle(.primary)

            Link(destination: URL(string: "https://example.com/terms")!) {
                HStack {
                    Text("Terms of Service")
                    Spacer()
                    Image(systemName: "arrow.up.right")
                        .font(.caption)
                }
            }
            .foregroundStyle(.primary)
        }
    }

    // MARK: - Support Section

    private var supportSection: some View {
        Section("Support") {
            Button {
                restorePurchases()
            } label: {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("Restore Purchases")
                    if isRestoring {
                        Spacer()
                        ProgressView()
                    }
                }
            }
            .disabled(isRestoring)

            Link(destination: URL(string: "mailto:support@example.com")!) {
                HStack {
                    Image(systemName: "envelope")
                    Text("Contact Support")
                }
            }
            .foregroundStyle(.primary)
        }
    }

    // MARK: - Debug Section

    #if DEBUG
    private var debugSection: some View {
        Section("Debug") {
            Button("Reset Extraction Count") {
                purchaseManager.resetExtractionCount()
            }

            Button("Show Paywall") {
                showingPaywall = true
            }

            Button("Show Customer Center") {
                showingCustomerCenter = true
            }

            HStack {
                Text("Extractions Used")
                Spacer()
                Text("\(purchaseManager.extractionsUsed)")
                    .foregroundStyle(.secondary)
            }

            HStack {
                Text("Is Premium")
                Spacer()
                Text(purchaseManager.isPremium ? "Yes" : "No")
                    .foregroundStyle(purchaseManager.isPremium ? .green : .secondary)
            }
        }
    }
    #endif

    // MARK: - Actions

    private func checkAPIKey() {
        Task {
            let provider = await AISettingsManager.shared.selectedProvider
            selectedProviderName = provider.displayName
            hasAPIKey = await AISettingsManager.shared.hasAPIKey(for: provider)
        }
    }

    private func restorePurchases() {
        isRestoring = true
        Task {
            do {
                let customerInfo = try await purchaseManager.restorePurchases()
                if customerInfo.entitlements[AppConfiguration.premiumEntitlement]?.isActive == true {
                    restoreMessage = "Your premium subscription has been restored!"
                } else {
                    restoreMessage = "No active subscriptions found to restore."
                }
            } catch {
                restoreMessage = "Failed to restore purchases: \(error.localizedDescription)"
            }
            isRestoring = false
            showingRestoreAlert = true
        }
    }
}

// MARK: - AI Provider Settings View

struct AIProviderSettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var hasAPIKey: Bool

    @State private var selectedProvider: AIProviderType = .openAI
    @State private var apiKey = ""
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var providerKeyStatus: [AIProviderType: Bool] = [:]

    var body: some View {
        NavigationStack {
            Form {
                // Provider Selection
                Section {
                    ForEach(AIProviderType.allCases, id: \.self) { provider in
                        Button {
                            selectedProvider = provider
                            apiKey = ""
                        } label: {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(provider.displayName)
                                        .foregroundStyle(.primary)
                                    if providerKeyStatus[provider] == true {
                                        Text("Configured")
                                            .font(.caption)
                                            .foregroundStyle(.green)
                                    }
                                }
                                Spacer()
                                if selectedProvider == provider {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(.orange)
                                }
                            }
                        }
                    }
                } header: {
                    Text("AI Provider")
                } footer: {
                    Text("Choose which AI service to use for recipe extraction.")
                }

                // API Key Entry
                Section {
                    SecureField("\(selectedProvider.keyPrefix)...", text: $apiKey)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                } header: {
                    Text("\(selectedProvider.displayName) API Key")
                } footer: {
                    Text("Your key is stored securely in the iOS Keychain.")
                }

                // Links
                Section {
                    Link("Get an API Key", destination: selectedProvider.apiKeyURL)
                    Link("View Pricing", destination: selectedProvider.pricingURL)
                }
            }
            .navigationTitle("AI Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") { saveSettings() }
                        .disabled(apiKey.isEmpty)
                        .fontWeight(.semibold)
                }
            }
            .alert("Error", isPresented: $showingError) {
                Button("OK") {}
            } message: {
                Text(errorMessage)
            }
            .task {
                await loadCurrentSettings()
            }
        }
    }

    private func loadCurrentSettings() async {
        selectedProvider = await AISettingsManager.shared.selectedProvider
        for provider in AIProviderType.allCases {
            providerKeyStatus[provider] = await AISettingsManager.shared.hasAPIKey(for: provider)
        }
    }

    private func saveSettings() {
        Task {
            do {
                try await AISettingsManager.shared.saveAPIKey(apiKey, for: selectedProvider)
                await AISettingsManager.shared.setSelectedProvider(selectedProvider)
                hasAPIKey = true
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
                showingError = true
            }
        }
    }
}

#Preview {
    SettingsView()
}
