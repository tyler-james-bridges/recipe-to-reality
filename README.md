# Recipe to Reality

Turn saved recipes and food videos into real meals by organizing ideas and generating smart grocery lists.

Built for the [RevenueCat Shipyard 2026 Hackathon](https://revenuecat-shipyard-2026.devpost.com/) - Eitan Bernath Brief.

## Features

- **Save recipes from anywhere** - Paste URLs from food blogs, YouTube, TikTok, Instagram
- **AI-powered extraction** - Automatically extracts ingredients and instructions using OpenAI, Claude, or Gemini
- **Video transcript support** - Extract recipes from YouTube (free) or TikTok/Instagram (via Supadata API)
- **Smart grocery lists** - Generate consolidated shopping lists from multiple recipes
- **Meal planning** - Schedule recipes with push notification reminders
- **Pantry tracking** - Track what you have on hand to auto-exclude from grocery lists
- **Serving adjustments** - Scale ingredients up or down
- **Deep linking** - Share URLs directly to the app via `recipetoreality://add-recipe?url=...`
- **Cross-platform** - Available for iOS and Android

## Tech Stack

- **Expo SDK 54** - React Native framework with Expo Router
- **TypeScript** - Type-safe development
- **Zustand** - State management
- **Expo SQLite + Drizzle ORM** - Local persistence
- **RevenueCat** - Subscription management
- **OpenAI / Anthropic / Google AI** - Recipe extraction

## Requirements

- Node.js 18+
- Expo CLI
- iOS Simulator or Android Emulator (or physical device)
- EAS CLI (for builds)

## Setup

### 1. Clone and Install

```bash
git clone https://github.com/tyler-james-bridges/recipe-to-reality.git
cd recipe-to-reality
npm install
```

### 2. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Configure the required API keys in `.env`:

- `CLAUDE_API_KEY` - For AI recipe extraction (server-side)

### 3. Start Development

```bash
npx expo start
```

Press `i` for iOS simulator, `a` for Android emulator, or scan the QR code with Expo Go.

### 4. Build for Testing

```bash
# Install EAS CLI
npm install -g eas-cli

# Build for internal testing
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

## Project Structure

```
recipe-to-reality/
├── app/                    # Expo Router screens and layouts
│   ├── (tabs)/            # Tab-based navigation screens
│   ├── recipe/            # Recipe detail screens
│   └── _layout.tsx        # Root layout
├── components/            # Reusable UI components
├── src/
│   ├── services/          # API and business logic
│   │   ├── extraction/    # AI recipe extraction
│   │   └── video/         # Video transcript extraction
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript interfaces
│   └── utils/             # Helper functions
├── assets/                # Images and fonts
├── app.json              # Expo configuration
└── eas.json              # EAS Build configuration
```

## API Key Setup

The app supports multiple AI providers for recipe extraction. Configure your preferred provider in the app's Settings screen:

- **OpenAI** - Get key from [platform.openai.com](https://platform.openai.com/api-keys)
- **Anthropic (Claude)** - Get key from [console.anthropic.com](https://console.anthropic.com/)
- **Google (Gemini)** - Get key from [aistudio.google.com](https://aistudio.google.com/)

For video transcripts from TikTok/Instagram, configure a Supadata API key in Settings > Video Platforms.

## Monetization

**Free Tier:**

- 5 recipe extractions
- 10 saved recipes
- Basic grocery lists

**Premium ($4.99/month or $29.99/year):**

- Unlimited recipe extractions
- Unlimited saved recipes
- Smart list consolidation
- Serving adjustments
- Meal plan notifications

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Commands

| Command                                          | Description               |
| ------------------------------------------------ | ------------------------- |
| `npx expo start`                                 | Start development server  |
| `npx expo run:ios`                               | Run on iOS simulator      |
| `npx expo run:android`                           | Run on Android emulator   |
| `npm test`                                       | Run tests                 |
| `eas build --platform ios --profile preview`     | Build iOS for testing     |
| `eas build --platform android --profile preview` | Build Android for testing |
| `eas build --platform all --profile production`  | Production build          |

## License

MIT License - See LICENSE file

## Credits

Built for Eitan Bernath's brief in the RevenueCat Shipyard 2026 Hackathon.
