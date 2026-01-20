import Foundation

/// Shared app constants used across main app and extensions
enum AppConstants {
    /// App Group ID for sharing data between main app and extensions
    /// This must match the App Group configured in both targets' capabilities
    static let appGroupID = "group.com.tylerjb.recipetoreality"

    /// Key for storing shared URLs in App Group UserDefaults
    static let sharedURLKey = "SharedRecipeURL"
}
