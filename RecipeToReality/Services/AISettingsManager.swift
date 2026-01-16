import Foundation
import SwiftUI

/// Manages AI provider settings and API keys
actor AISettingsManager {
    static let shared = AISettingsManager()

    private let providerKey = "selected_ai_provider"
    private let keychainService = "com.recipeToReality.apiKeys"

    private init() {}

    // MARK: - Provider Selection

    var selectedProvider: AIProviderType {
        get {
            if let raw = UserDefaults.standard.string(forKey: providerKey),
               let provider = AIProviderType(rawValue: raw) {
                return provider
            }
            return .openAI
        }
    }

    func setSelectedProvider(_ provider: AIProviderType) {
        UserDefaults.standard.set(provider.rawValue, forKey: providerKey)
    }

    // MARK: - API Key Management

    func saveAPIKey(_ key: String, for provider: AIProviderType) throws {
        let data = key.data(using: .utf8)!

        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: provider.rawValue
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: provider.rawValue,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed
        }
    }

    func getAPIKey(for provider: AIProviderType) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: provider.rawValue,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let key = String(data: data, encoding: .utf8) else {
            throw KeychainError.notFound
        }
        return key
    }

    func hasAPIKey(for provider: AIProviderType) -> Bool {
        (try? getAPIKey(for: provider)) != nil
    }

    func deleteAPIKey(for provider: AIProviderType) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: provider.rawValue
        ]
        SecItemDelete(query as CFDictionary)
    }

    // MARK: - Create Provider Instance

    func createProvider() throws -> AIProvider {
        let providerType = selectedProvider
        let apiKey = try getAPIKey(for: providerType)
        return providerType.createProvider(apiKey: apiKey)
    }

    enum KeychainError: LocalizedError {
        case saveFailed
        case notFound

        var errorDescription: String? {
            switch self {
            case .saveFailed: return "Failed to save API key"
            case .notFound: return "API key not configured"
            }
        }
    }
}
