import XCTest
@testable import RecipeToReality

final class RecipeExtractionTests: XCTestCase {

    // MARK: - URL Platform Detection Tests

    func testDetectYouTubeStandardURL() async {
        let url = URL(string: "https://www.youtube.com/watch?v=dQw4w9WgXcQ")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .youtube)
    }

    func testDetectYouTubeShortURL() async {
        let url = URL(string: "https://youtu.be/dQw4w9WgXcQ")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .youtube)
    }

    func testDetectYouTubeShortsURL() async {
        let url = URL(string: "https://www.youtube.com/shorts/abc123")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .youtube)
    }

    func testDetectYouTubeEmbedURL() async {
        let url = URL(string: "https://www.youtube.com/embed/dQw4w9WgXcQ")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .youtube)
    }

    func testDetectYouTubeMobileURL() async {
        let url = URL(string: "https://m.youtube.com/watch?v=dQw4w9WgXcQ")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .youtube)
    }

    func testDetectTikTokURL() async {
        let url = URL(string: "https://www.tiktok.com/@user/video/123456789")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .tiktok)
    }

    func testDetectTikTokShortURL() async {
        let url = URL(string: "https://vm.tiktok.com/abc123")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .tiktok)
    }

    func testDetectInstagramReelURL() async {
        let url = URL(string: "https://www.instagram.com/reel/abc123")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .instagram)
    }

    func testDetectInstagramPostURL() async {
        let url = URL(string: "https://www.instagram.com/p/abc123")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .instagram)
    }

    func testDetectUnknownPlatform() async {
        let url = URL(string: "https://www.example.com/recipe")!
        let service = VideoTranscriptService.shared
        let platform = await service.detectPlatform(from: url)
        XCTAssertEqual(platform, .unknown)
    }

    // MARK: - isVideoURL Tests

    func testIsVideoURLYouTube() async {
        let url = URL(string: "https://www.youtube.com/watch?v=test")!
        let service = VideoTranscriptService.shared
        let isVideo = await service.isVideoURL(url)
        XCTAssertTrue(isVideo)
    }

    func testIsVideoURLTikTok() async {
        let url = URL(string: "https://www.tiktok.com/@user/video/123")!
        let service = VideoTranscriptService.shared
        let isVideo = await service.isVideoURL(url)
        XCTAssertTrue(isVideo)
    }

    func testIsVideoURLInstagram() async {
        let url = URL(string: "https://www.instagram.com/reel/abc")!
        let service = VideoTranscriptService.shared
        let isVideo = await service.isVideoURL(url)
        XCTAssertTrue(isVideo)
    }

    func testIsVideoURLRegularWebpage() async {
        let url = URL(string: "https://www.allrecipes.com/recipe/123")!
        let service = VideoTranscriptService.shared
        let isVideo = await service.isVideoURL(url)
        XCTAssertFalse(isVideo)
    }

    // MARK: - YouTube Video ID Extraction Tests

    func testExtractYouTubeVideoIdStandard() {
        let url = URL(string: "https://www.youtube.com/watch?v=dQw4w9WgXcQ")!
        let videoId = extractYouTubeVideoIdHelper(from: url)
        XCTAssertEqual(videoId, "dQw4w9WgXcQ")
    }

    func testExtractYouTubeVideoIdShort() {
        let url = URL(string: "https://youtu.be/dQw4w9WgXcQ")!
        let videoId = extractYouTubeVideoIdHelper(from: url)
        XCTAssertEqual(videoId, "dQw4w9WgXcQ")
    }

    func testExtractYouTubeVideoIdWithTimestamp() {
        let url = URL(string: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=120")!
        let videoId = extractYouTubeVideoIdHelper(from: url)
        XCTAssertEqual(videoId, "dQw4w9WgXcQ")
    }

    func testExtractYouTubeVideoIdShorts() {
        let url = URL(string: "https://www.youtube.com/shorts/abc123def")!
        let videoId = extractYouTubeVideoIdHelper(from: url)
        XCTAssertEqual(videoId, "abc123def")
    }

    func testExtractYouTubeVideoIdEmbed() {
        let url = URL(string: "https://www.youtube.com/embed/test123")!
        let videoId = extractYouTubeVideoIdHelper(from: url)
        XCTAssertEqual(videoId, "test123")
    }

    // MARK: - Recipe Source Type Tests

    func testSourceTypeURL() {
        let recipe = Recipe(
            title: "Test Recipe",
            sourceURL: "https://example.com/recipe",
            sourceType: .url
        )
        XCTAssertEqual(recipe.sourceType, .url)
    }

    func testSourceTypeYouTube() {
        let recipe = Recipe(
            title: "Test Recipe",
            sourceURL: "https://youtube.com/watch?v=test",
            sourceType: .youtube
        )
        XCTAssertEqual(recipe.sourceType, .youtube)
    }

    func testSourceTypeTikTok() {
        let recipe = Recipe(
            title: "Test Recipe",
            sourceURL: "https://tiktok.com/@user/video/123",
            sourceType: .tiktok
        )
        XCTAssertEqual(recipe.sourceType, .tiktok)
    }

    func testSourceTypeInstagram() {
        let recipe = Recipe(
            title: "Test Recipe",
            sourceURL: "https://instagram.com/reel/abc",
            sourceType: .instagram
        )
        XCTAssertEqual(recipe.sourceType, .instagram)
    }

    func testSourceTypeManual() {
        let recipe = Recipe(
            title: "Manual Recipe",
            sourceType: .manual
        )
        XCTAssertEqual(recipe.sourceType, .manual)
    }

    // MARK: - ExtractedRecipe to Recipe Conversion

    func testExtractedRecipeConversion() {
        let extracted = ExtractedRecipe(
            title: "Test Recipe",
            servings: 4,
            prepTime: "15 min",
            cookTime: "30 min",
            ingredients: [
                ExtractedIngredient(name: "flour", quantity: "2", unit: "cups", category: .pantry),
                ExtractedIngredient(name: "sugar", quantity: "1", unit: "cup", category: .pantry)
            ],
            instructions: ["Step 1", "Step 2"],
            imageURL: "https://example.com/image.jpg",
            sourceURL: "https://example.com/recipe",
            sourceType: .url
        )

        let recipe = extracted.toRecipe()

        XCTAssertEqual(recipe.title, "Test Recipe")
        XCTAssertEqual(recipe.servings, 4)
        XCTAssertEqual(recipe.prepTime, "15 min")
        XCTAssertEqual(recipe.cookTime, "30 min")
        XCTAssertEqual(recipe.ingredients.count, 2)
        XCTAssertEqual(recipe.instructions.count, 2)
        XCTAssertEqual(recipe.sourceType, .url)
    }
}

// MARK: - Helper Functions

/// Helper to extract YouTube video ID for testing
private func extractYouTubeVideoIdHelper(from url: URL) -> String? {
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
