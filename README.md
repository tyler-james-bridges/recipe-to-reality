# Recipe to Reality

Turn saved recipes and food videos into real meals by organizing ideas and generating smart grocery lists.

Built for the [RevenueCat Shipyard 2026 Hackathon](https://revenuecat-shipyard-2026.devpost.com/) - Eitan Bernath Brief.

## Features

- **Save recipes from anywhere** - Paste URLs from food blogs, YouTube, TikTok, Instagram
- **AI-powered extraction** - Automatically extracts ingredients and instructions using GPT-4
- **Smart grocery lists** - Generate consolidated shopping lists from multiple recipes
- **Cooking queue** - Mark recipes you want to make this week
- **Serving adjustments** - Scale ingredients up or down
- **Share Extension** - Save recipes directly from Safari or social apps

## Tech Stack

- **SwiftUI** - Modern declarative UI framework
- **SwiftData** - Apple's new persistence framework
- **RevenueCat** - Subscription management and in-app purchases
- **OpenAI API** - Recipe extraction from webpage content

## Requirements

- Xcode 15.0+
- iOS 17.0+
- Apple Developer Account (for TestFlight)
- OpenAI API Key
- RevenueCat Account

## Setup

### 1. Clone and Open Project

```bash
cd recipe-to-reality
open RecipeToReality.xcodeproj
```

### 2. Configure Signing

1. Open the project in Xcode
2. Select the `RecipeToReality` target
3. Go to "Signing & Capabilities"
4. Select your Development Team
5. Update the Bundle Identifier to something unique (e.g., `com.yourname.RecipeToReality`)

### 3. Set Up RevenueCat

The app uses RevenueCat SDK with **PaywallView** (pre-built paywall UI) and **CustomerCenter** (subscription management).

**SDK Installation:**
- SPM Package: `https://github.com/RevenueCat/purchases-ios-spm.git`
- Products: `RevenueCat` + `RevenueCatUI`

**Dashboard Setup:**

1. Create an account at [RevenueCat](https://www.revenuecat.com/)
2. Create a new project and iOS app
3. The API key is already configured in `PurchaseManager.swift`:
   ```swift
   static let revenueCatAPIKey = "test_LotNVyIpuyniwsEkDEsqOxwybyw"
   ```

4. In App Store Connect, create subscription products:
   - `recipe_to_reality_monthly` - Monthly subscription ($4.99)
   - `recipe_to_reality_yearly` - Annual subscription ($29.99)

5. In RevenueCat Dashboard:
   - Create `premium` entitlement
   - Link products to entitlement
   - Create `default` offering with packages
   - **Configure a Paywall** for the offering (the app uses `PaywallView`)
   - **Enable Customer Center** for subscription management

See `docs/REVENUECAT_SETUP.md` for detailed configuration instructions.

### 4. Set Up App Groups (for Share Extension)

1. In Xcode, select the main app target
2. Go to "Signing & Capabilities"
3. Add "App Groups" capability
4. Add group: `group.com.yourcompany.RecipeToReality`
5. Repeat for the Share Extension target
6. Update `SharedURLManager.swift` and `ShareViewController.swift` with your group ID

### 5. Build and Run

1. Select a simulator or connected device
2. Build and run (Cmd + R)

## OpenAI API Key Setup

The app requires an OpenAI API key for recipe extraction:

1. Get an API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. In the app, go to Settings → OpenAI API Key
3. Enter your API key (stored securely in iOS Keychain)

**Note:** For production, consider:
- Using a backend proxy to hide the API key
- Implementing rate limiting
- Using a cheaper model for initial parsing

## Project Structure

```
RecipeToReality/
├── RecipeToRealityApp.swift    # App entry point
├── ContentView.swift           # Main tab view
├── Models/
│   ├── Recipe.swift            # Recipe and Ingredient models
│   └── GroceryList.swift       # Grocery list models
├── Views/
│   ├── RecipeListView.swift    # Recipe list and search
│   ├── AddRecipeView.swift     # Add/extract recipe
│   ├── RecipeDetailView.swift  # Recipe detail with scaling
│   ├── GroceryListView.swift   # Shopping list view
│   └── SettingsView.swift      # Settings and paywall
├── Services/
│   ├── RecipeExtractionService.swift  # OpenAI integration
│   ├── APIKeyManager.swift            # Keychain storage
│   ├── PurchaseManager.swift          # RevenueCat integration
│   └── SharedURLManager.swift         # Share extension handler
└── Assets.xcassets/

ShareExtension/
├── ShareViewController.swift   # Share extension UI
└── Info.plist
```

## Monetization Strategy

**Free Tier:**
- 5 recipe extractions
- 10 saved recipes
- Basic grocery lists

**Premium ($4.99/month or $29.99/year):**
- Unlimited recipe extractions
- Unlimited saved recipes
- Smart list consolidation (combines duplicate ingredients)
- Serving adjustments
- Cloud sync (future)

## Roadmap

### MVP (Hackathon)
- [x] Recipe URL extraction
- [x] Ingredient parsing
- [x] Grocery list generation
- [x] RevenueCat integration
- [x] Share Extension

### Post-Hackathon
- [ ] Video transcript extraction (YouTube, TikTok)
- [ ] Cookbook OCR scanning
- [ ] Pantry tracking
- [ ] Meal planning calendar
- [ ] Recipe recommendations
- [ ] Social sharing
- [ ] Cloud sync

## Testing

### TestFlight Deployment

1. Archive the app (Product → Archive)
2. Upload to App Store Connect
3. Add external testers
4. Share TestFlight link

### RevenueCat Testing

1. Create a Sandbox tester in App Store Connect
2. Use sandbox tester account on device
3. Subscriptions renew quickly in sandbox (monthly = 5 min)

## License

MIT License - See LICENSE file

## Credits

Built for Eitan Bernath's brief in the RevenueCat Shipyard 2026 Hackathon.
