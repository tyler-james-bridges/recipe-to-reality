import Foundation
import YoutubeTranscript

/// Service for extracting transcripts from video platforms
actor VideoTranscriptService {
    static let shared = VideoTranscriptService()

    private let keychainService = "com.recipeToReality.apiKeys"
    private let supadataKeyIdentifier = "supadata_api_key"

    private init() {}

    // MARK: - Main Entry Point

    /// Extract transcript from a video URL
    /// - Parameter url: YouTube, TikTok, or Instagram URL
    /// - Returns: VideoTranscript containing the extracted text
    func extractTranscript(from url: URL) async throws -> VideoTranscript {
        let platform = detectPlatform(from: url)

        switch platform {
        case .youtube:
            return try await extractYouTubeTranscript(from: url)
        case .tiktok:
            return try await extractTikTokTranscript(from: url)
        case .instagram:
            return try await extractInstagramTranscript(from: url)
        case .unknown:
            throw VideoTranscriptError.unsupportedPlatform
        }
    }

    // MARK: - Platform Detection

    enum VideoPlatform {
        case youtube
        case tiktok
        case instagram
        case unknown
    }

    func detectPlatform(from url: URL) -> VideoPlatform {
        let host = url.host?.lowercased() ?? ""

        if host.contains("youtube.com") || host.contains("youtu.be") {
            return .youtube
        } else if host.contains("tiktok.com") {
            return .tiktok
        } else if host.contains("instagram.com") {
            return .instagram
        }
        return .unknown
    }

    func isVideoURL(_ url: URL) -> Bool {
        detectPlatform(from: url) != .unknown
    }

    // MARK: - YouTube Extraction

    private func extractYouTubeTranscript(from url: URL) async throws -> VideoTranscript {
        // Extract video ID from URL
        guard let videoId = extractYouTubeVideoId(from: url) else {
            throw VideoTranscriptError.extractionFailed("Could not extract video ID from URL")
        }

        do {
            let transcriptEntries = try await YoutubeTranscript.fetchTranscript(for: videoId)

            let segments = transcriptEntries.map { entry in
                TranscriptSegment(
                    text: entry.text,
                    offset: entry.offset,
                    duration: 0 // Duration not provided by this library
                )
            }

            return VideoTranscript(segments: segments, platform: .youtube)
        } catch {
            // Map YoutubeTranscript errors to our error types
            let errorString = String(describing: error).lowercased()
            if errorString.contains("disabled") || errorString.contains("unavailable") {
                throw VideoTranscriptError.captionsDisabled
            } else if errorString.contains("not found") || errorString.contains("no transcript") {
                throw VideoTranscriptError.transcriptNotAvailable
            }
            throw VideoTranscriptError.extractionFailed(error.localizedDescription)
        }
    }

    /// Extract YouTube video ID from various URL formats
    private func extractYouTubeVideoId(from url: URL) -> String? {
        let urlString = url.absoluteString

        // Handle youtu.be/VIDEO_ID
        if url.host?.contains("youtu.be") == true {
            return url.lastPathComponent
        }

        // Handle youtube.com/watch?v=VIDEO_ID
        if let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
           let videoId = components.queryItems?.first(where: { $0.name == "v" })?.value {
            return videoId
        }

        // Handle youtube.com/shorts/VIDEO_ID
        if urlString.contains("/shorts/") {
            return url.lastPathComponent
        }

        // Handle youtube.com/embed/VIDEO_ID
        if urlString.contains("/embed/") {
            return url.lastPathComponent
        }

        return nil
    }

    // MARK: - TikTok Extraction (Supadata API)

    private func extractTikTokTranscript(from url: URL) async throws -> VideoTranscript {
        guard let apiKey = getSupadataAPIKey() else {
            throw VideoTranscriptError.apiKeyRequired(.tiktok)
        }

        return try await fetchSupadataTranscript(url: url, apiKey: apiKey, platform: .tiktok)
    }

    // MARK: - Instagram Extraction (Supadata API)

    private func extractInstagramTranscript(from url: URL) async throws -> VideoTranscript {
        guard let apiKey = getSupadataAPIKey() else {
            throw VideoTranscriptError.apiKeyRequired(.instagram)
        }

        return try await fetchSupadataTranscript(url: url, apiKey: apiKey, platform: .instagram)
    }

    // MARK: - Supadata API

    private func fetchSupadataTranscript(url: URL, apiKey: String, platform: VideoPlatform) async throws -> VideoTranscript {
        // Supadata API endpoint for transcript extraction
        let endpoint = URL(string: "https://api.supadata.ai/v1/transcript")!

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let requestBody: [String: Any] = [
            "url": url.absoluteString
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw VideoTranscriptError.networkError
        }

        switch httpResponse.statusCode {
        case 200...299:
            return try parseSupadataResponse(data, platform: platform)
        case 401:
            throw VideoTranscriptError.invalidAPIKey
        case 429:
            throw VideoTranscriptError.rateLimited
        case 404:
            throw VideoTranscriptError.transcriptNotAvailable
        default:
            if let errorJson = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let message = errorJson["error"] as? String ?? errorJson["message"] as? String {
                throw VideoTranscriptError.apiError(message)
            }
            throw VideoTranscriptError.apiError("HTTP \(httpResponse.statusCode)")
        }
    }

    private func parseSupadataResponse(_ data: Data, platform: VideoPlatform) throws -> VideoTranscript {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw VideoTranscriptError.parsingError
        }

        // Handle different response formats
        if let transcriptArray = json["transcript"] as? [[String: Any]] {
            let segments = transcriptArray.compactMap { item -> TranscriptSegment? in
                guard let text = item["text"] as? String else { return nil }
                return TranscriptSegment(
                    text: text,
                    offset: item["start"] as? Double ?? item["offset"] as? Double ?? 0,
                    duration: item["duration"] as? Double ?? 0
                )
            }
            return VideoTranscript(segments: segments, platform: platform)
        } else if let text = json["text"] as? String {
            // Plain text response
            return VideoTranscript(
                segments: [TranscriptSegment(text: text, offset: 0, duration: 0)],
                platform: platform
            )
        }

        throw VideoTranscriptError.parsingError
    }

    // MARK: - Supadata API Key Management

    func saveSupadataAPIKey(_ key: String) throws {
        let data = key.data(using: .utf8)!

        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: supadataKeyIdentifier
        ]
        SecItemDelete(deleteQuery as CFDictionary)

        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: supadataKeyIdentifier,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]

        let status = SecItemAdd(addQuery as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw VideoTranscriptError.keychainError
        }
    }

    func getSupadataAPIKey() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: supadataKeyIdentifier,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess,
              let data = result as? Data,
              let key = String(data: data, encoding: .utf8) else {
            return nil
        }
        return key
    }

    func hasSupadataAPIKey() -> Bool {
        getSupadataAPIKey() != nil
    }

    func deleteSupadataAPIKey() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: keychainService,
            kSecAttrAccount as String: supadataKeyIdentifier
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Supporting Types

struct TranscriptSegment {
    let text: String
    let offset: Double
    let duration: Double
}

struct VideoTranscript {
    let segments: [TranscriptSegment]
    let platform: VideoTranscriptService.VideoPlatform

    /// Full transcript text with segments joined
    var fullText: String {
        segments.map { $0.text }.joined(separator: " ")
    }

    /// Formatted text optimized for AI recipe extraction
    var formattedForAI: String {
        // Group segments into logical paragraphs based on timing gaps
        var result = ""
        var currentParagraph = ""
        var lastEndTime: Double = 0

        for segment in segments {
            let gap = segment.offset - lastEndTime

            // Start new paragraph if there's a significant gap (>2 seconds)
            if gap > 2 && !currentParagraph.isEmpty {
                result += currentParagraph.trimmingCharacters(in: .whitespaces) + "\n\n"
                currentParagraph = ""
            }

            currentParagraph += segment.text + " "
            lastEndTime = segment.offset + segment.duration
        }

        // Add final paragraph
        if !currentParagraph.isEmpty {
            result += currentParagraph.trimmingCharacters(in: .whitespaces)
        }

        return result.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

// MARK: - Errors

enum VideoTranscriptError: LocalizedError {
    case unsupportedPlatform
    case captionsDisabled
    case transcriptNotAvailable
    case apiKeyRequired(VideoTranscriptService.VideoPlatform)
    case invalidAPIKey
    case rateLimited
    case networkError
    case parsingError
    case apiError(String)
    case extractionFailed(String)
    case keychainError

    var errorDescription: String? {
        switch self {
        case .unsupportedPlatform:
            return "This video platform is not supported"
        case .captionsDisabled:
            return "This video has captions disabled by the creator"
        case .transcriptNotAvailable:
            return "No transcript or captions available for this video"
        case .apiKeyRequired(let platform):
            let name = platform == .tiktok ? "TikTok" : "Instagram"
            return "Supadata API key required for \(name) videos. Configure it in Settings."
        case .invalidAPIKey:
            return "Invalid Supadata API key"
        case .rateLimited:
            return "Rate limited. Please try again later."
        case .networkError:
            return "Network error. Check your connection."
        case .parsingError:
            return "Failed to parse transcript"
        case .apiError(let message):
            return message
        case .extractionFailed(let message):
            return "Failed to extract transcript: \(message)"
        case .keychainError:
            return "Failed to save API key"
        }
    }

    /// User-friendly recovery suggestion
    var recoverySuggestion: String? {
        switch self {
        case .captionsDisabled:
            return "Try a different video or enter the recipe manually"
        case .transcriptNotAvailable:
            return "Try a different video or enter the recipe manually"
        case .apiKeyRequired:
            return "Go to Settings > Video Platforms to add your Supadata API key"
        case .invalidAPIKey:
            return "Check your Supadata API key in Settings"
        case .rateLimited:
            return "Supadata offers 100 free requests per month"
        default:
            return nil
        }
    }
}
