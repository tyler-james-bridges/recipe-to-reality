import Foundation
import Security

/// Secure storage for API keys using Keychain
actor APIKeyManager {
    static let shared = APIKeyManager()

    private let service = "com.recipeToReality.apiKeys"

    enum KeyType: String {
        case openAI = "openai_api_key"
        case revenueCat = "revenuecat_api_key"
    }

    private init() {}

    func save(key: String, for type: KeyType) throws {
        let data = key.data(using: .utf8)!

        // Delete existing key if present
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: type.rawValue
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        // Add new key
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: type.rawValue,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw KeychainError.saveFailed(status)
        }
    }

    func retrieve(for type: KeyType) throws -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: type.rawValue,
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

    func delete(for type: KeyType) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: type.rawValue
        ]

        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.deleteFailed(status)
        }
    }

    func hasKey(for type: KeyType) -> Bool {
        do {
            _ = try retrieve(for: type)
            return true
        } catch {
            return false
        }
    }

    enum KeychainError: LocalizedError {
        case saveFailed(OSStatus)
        case notFound
        case deleteFailed(OSStatus)

        var errorDescription: String? {
            switch self {
            case .saveFailed(let status):
                return "Failed to save key: \(status)"
            case .notFound:
                return "Key not found"
            case .deleteFailed(let status):
                return "Failed to delete key: \(status)"
            }
        }
    }
}
