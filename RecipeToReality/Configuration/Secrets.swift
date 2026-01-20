import Foundation

/// Secure configuration loader for API keys and secrets
/// Keys can be loaded from environment variables or a local secrets file
enum Secrets {

    // MARK: - RevenueCat

    /// RevenueCat API Key - loaded from environment or Secrets.local.swift
    static var revenueCatAPIKey: String {
        // 1. Check environment variable first (for CI/CD and production builds)
        if let envKey = ProcessInfo.processInfo.environment["REVENUECAT_API_KEY"],
           !envKey.isEmpty {
            return envKey
        }

        // 2. Fall back to local secrets file (for local development)
        #if DEBUG
        if let localKey = LocalSecrets.revenueCatAPIKey, !localKey.isEmpty {
            return localKey
        }
        #endif

        // 3. Return placeholder - app will fail gracefully
        assertionFailure("RevenueCat API key not configured. Set REVENUECAT_API_KEY environment variable or create Secrets.local.swift")
        return ""
    }

    /// Validates that required secrets are configured
    static func validateConfiguration() -> Bool {
        let hasRevenueCat = !revenueCatAPIKey.isEmpty

        #if DEBUG
        if !hasRevenueCat {
            print("⚠️ Warning: RevenueCat API key not configured")
            print("  Set REVENUECAT_API_KEY environment variable")
            print("  Or create RecipeToReality/Configuration/Secrets.local.swift")
        }
        #endif

        return hasRevenueCat
    }
}

// MARK: - Local Secrets Protocol

/// Implement this protocol in Secrets.local.swift for local development
/// The local file should be gitignored
protocol LocalSecretsProvider {
    static var revenueCatAPIKey: String? { get }
}

/// Default implementation returns nil - override in Secrets.local.swift
enum LocalSecrets: LocalSecretsProvider {
    #if !DEBUG
    // In release builds, don't use local secrets
    static var revenueCatAPIKey: String? { nil }
    #endif
}
