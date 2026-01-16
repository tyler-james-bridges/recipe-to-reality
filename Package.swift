// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RecipeToReality",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "RecipeToReality",
            targets: ["RecipeToReality"]
        )
    ],
    dependencies: [
        // RevenueCat SPM mirror (faster installation)
        .package(url: "https://github.com/RevenueCat/purchases-ios-spm.git", from: "5.0.0"),
        // YouTube transcript extraction (no API key required)
        .package(url: "https://github.com/spaceman1412/swift-youtube-transcript.git", from: "1.0.0")
    ],
    targets: [
        .target(
            name: "RecipeToReality",
            dependencies: [
                .product(name: "RevenueCat", package: "purchases-ios-spm"),
                .product(name: "RevenueCatUI", package: "purchases-ios-spm"),
                .product(name: "YoutubeTranscript", package: "swift-youtube-transcript")
            ],
            path: "RecipeToReality"
        )
    ]
)
