# Recipe to Reality - Development Guide

## Project Overview

Mobile app (iOS/Android) that extracts recipes from URLs and videos, organizing them into a cooking queue with smart grocery list generation.

## Tech Stack

- **Expo** (SDK 52) with Expo Router
- **React Native** with TypeScript
- **Zustand** for state management
- **RevenueCat** for subscriptions
- **OpenAI/Anthropic/Google AI** for recipe extraction

## Key Files

- `src/services/extraction/recipeExtraction.ts` - AI-powered recipe extraction
- `src/services/video/videoTranscript.ts` - Video transcript extraction (YouTube, TikTok, Instagram)
- `src/stores/` - Zustand stores for recipes, pantry, meal plans, purchases
- `src/utils/quantity.ts` - Quantity parsing and combination logic

## Commands

```bash
# Install dependencies
npm install

# Start development
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run tests
npm test

# Build for testing (EAS)
eas build --platform android --profile preview
eas build --platform ios --profile preview

# Build for production
eas build --platform all --profile production
```

## Architecture

- **app/** - Expo Router screens and layouts
- **components/** - Reusable UI components
- **src/stores/** - Zustand state management
- **src/services/** - API and business logic
- **src/utils/** - Helper functions
- **src/types/** - TypeScript interfaces

## Important Notes

- API keys stored in expo-secure-store (never commit keys)
- RevenueCat entitlement ID: `premium`
- Free tier limits tracked in settings store
- Deep linking: `recipetoreality://add-recipe?url=...`

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```
