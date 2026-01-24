# Changelog

All notable changes to Recipe to Reality will be documented in this file.

## [2.0.0-beta.1] - 2026-01-24

### Added
- **Expo Migration**: Complete rewrite from SwiftUI to React Native with Expo SDK 54
- **Cross-Platform Support**: Now available for both iOS and Android
- **Recipe Extraction**: AI-powered recipe extraction from URLs and videos
  - Support for OpenAI, Anthropic (Claude), and Google Gemini AI providers
  - Configurable AI provider in Settings
  - Retry logic with exponential backoff for reliability
- **Video Transcript Support**: Extract recipes from cooking videos
  - YouTube transcripts (free, no API key required)
  - TikTok and Instagram via Supadata API (requires API key)
  - Configure Supadata API key in Settings > Video Platforms
- **Deep Linking**: Share URLs directly to the app using `recipetoreality://add-recipe?url=...`
  - iOS Shortcuts integration for quick recipe saving
- **Meal Plan Notifications**: Get reminded about planned meals
  - Toggle reminders per meal plan
  - Set custom reminder times
  - Local push notifications
- **Grocery List Generation**: Smart consolidation of ingredients
  - Combine quantities from multiple recipes
  - Organize by category
  - Track pantry items to exclude
- **Pantry Management**: Track what you have on hand
  - Quick add common items
  - Set expiration dates
  - Auto-exclude from grocery lists
- **Modern UI**: Glassmorphism design with iOS-inspired aesthetics
  - Light and dark mode support
  - Smooth animations with Reanimated
  - Haptic feedback throughout

### Technical
- Expo SDK 54 with Expo Router v6
- Drizzle ORM with Expo SQLite for local persistence
- Zustand for state management
- RevenueCat for subscription management
- Jest testing infrastructure

### Known Issues
- Video transcript extraction requires network connectivity
- Some recipe websites with aggressive anti-scraping may fail extraction

---

## Previous Releases

See the original iOS app releases in the App Store for version history prior to 2.0.
