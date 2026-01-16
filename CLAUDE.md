# Recipe to Reality - Development Guide

## Project Overview

iOS app that extracts recipes from URLs and videos, organizing them into a cooking queue with smart grocery list generation.

## Tech Stack

- **SwiftUI** (iOS 17+)
- **SwiftData** for persistence
- **RevenueCat** for subscriptions
- **OpenAI API** for recipe extraction

## Key Files

- `RecipeExtractionService.swift` - AI-powered recipe extraction
- `PurchaseManager.swift` - RevenueCat integration
- `GroceryList.swift` - Smart list consolidation logic

## Build Commands

```bash
# Open in Xcode
open RecipeToReality.xcodeproj

# Build from command line
xcodebuild -project RecipeToReality.xcodeproj -scheme RecipeToReality -destination 'platform=iOS Simulator,name=iPhone 15' build
```

## Architecture

- **Models**: SwiftData @Model classes for Recipe, Ingredient, GroceryList
- **Views**: SwiftUI views following MVVM-lite pattern
- **Services**: Actor-based services for thread-safe API calls

## Important Notes

- API key stored in iOS Keychain (never commit keys)
- Share Extension requires App Group for data sharing
- Free tier limits tracked in UserDefaults
- RevenueCat entitlement ID: `premium`

## Testing

- Use Xcode Previews for UI iteration
- Sandbox tester for IAP testing
- Recipe extraction requires valid OpenAI key
