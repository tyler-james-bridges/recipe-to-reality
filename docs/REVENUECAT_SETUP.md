# RevenueCat Integration Guide

This guide covers the complete RevenueCat setup for Recipe to Reality.

## Overview

The app uses RevenueCat for:
- **Subscription Management** - Monthly/yearly premium subscriptions
- **Paywalls** - Pre-built UI for displaying subscription options
- **Customer Center** - Self-service subscription management for users

## SDK Configuration

### Swift Package Manager

The project uses the RevenueCat SPM mirror for faster installation:

```
https://github.com/RevenueCat/purchases-ios-spm.git
```

Required products:
- `RevenueCat` - Core SDK for purchases
- `RevenueCatUI` - Paywalls and Customer Center UI

### API Key

Your API key is configured in `PurchaseManager.swift`:

```swift
enum AppConfiguration {
    static let revenueCatAPIKey = "test_LotNVyIpuyniwsEkDEsqOxwybyw"
    static let premiumEntitlement = "premium"
}
```

## RevenueCat Dashboard Setup

### 1. Create Products in App Store Connect

Before configuring RevenueCat, create your subscription products in App Store Connect:

1. Go to App Store Connect → Your App → Subscriptions
2. Create a Subscription Group (e.g., "Recipe to Reality Premium")
3. Add subscription products:

| Product ID | Duration | Suggested Price |
|------------|----------|-----------------|
| `recipe_to_reality_monthly` | 1 Month | $4.99 |
| `recipe_to_reality_yearly` | 1 Year | $29.99 |
| `recipe_to_reality_lifetime` | Lifetime | $49.99 (Non-consumable) |

### 2. Configure RevenueCat Dashboard

1. **Create Project**
   - Go to [app.revenuecat.com](https://app.revenuecat.com)
   - Create a new project for "Recipe to Reality"

2. **Add App**
   - Add iOS app
   - Enter your Bundle ID
   - Upload your App Store Connect Shared Secret

3. **Create Entitlements**
   - Go to Entitlements → New
   - Create entitlement: `premium`
   - This unlocks all premium features

4. **Create Products**
   - Go to Products → New
   - Add each subscription product with matching App Store Product IDs
   - Link products to the `premium` entitlement

5. **Create Offerings**
   - Go to Offerings → New
   - Create offering: `default`
   - Add packages:
     - `$rc_monthly` → Monthly subscription
     - `$rc_annual` → Yearly subscription
     - `$rc_lifetime` → Lifetime purchase (optional)

### 3. Configure Paywall

RevenueCat Paywalls are configured in the dashboard:

1. Go to Paywalls in RevenueCat dashboard
2. Create a new paywall for your `default` offering
3. Choose a template and customize:
   - Header image/icon
   - Title and subtitle
   - Feature list
   - Call-to-action text
   - Color scheme

The `PaywallView` in the app automatically loads this configuration.

### 4. Configure Customer Center

Customer Center is also configured in the dashboard:

1. Go to Customer Center settings
2. Customize:
   - Support email
   - FAQ items
   - Cancel flow options
   - Feedback collection

## Code Architecture

### PurchaseManager

The `PurchaseManager` class handles all RevenueCat operations:

```swift
@MainActor
@Observable
final class PurchaseManager {
    static let shared = PurchaseManager()

    // State
    private(set) var customerInfo: CustomerInfo?
    private(set) var offerings: Offerings?

    // Computed
    var isPremium: Bool { ... }
    var canExtractRecipe: Bool { ... }

    // Actions
    func configure() { ... }
    func fetchCustomerInfo() async { ... }
    func purchase(_ package: Package) async throws -> CustomerInfo
    func restorePurchases() async throws -> CustomerInfo
}
```

### Presenting Paywalls

**Option 1: Automatic presentation based on entitlement**

```swift
ContentView()
    .presentPaywallIfNeeded(
        requiredEntitlementIdentifier: "premium",
        purchaseCompleted: { customerInfo in },
        restoreCompleted: { customerInfo in }
    )
```

**Option 2: Manual presentation with sheet**

```swift
@State private var showingPaywall = false

Button("Upgrade") {
    showingPaywall = true
}
.sheet(isPresented: $showingPaywall) {
    PaywallView(displayCloseButton: true)
        .onPurchaseCompleted { _ in showingPaywall = false }
}
```

### Presenting Customer Center

```swift
@State private var showingCustomerCenter = false

Button("Manage Subscription") {
    showingCustomerCenter = true
}
.presentCustomerCenter(isPresented: $showingCustomerCenter) {
    showingCustomerCenter = false
}
```

## Testing

### Sandbox Testing

1. Create a Sandbox Tester in App Store Connect
2. Sign out of App Store on device
3. Sign in with sandbox account when prompted during purchase
4. Subscriptions renew quickly in sandbox:
   - Weekly → 3 minutes
   - Monthly → 5 minutes
   - Yearly → 1 hour

### Debug Mode

The app includes a Debug section in Settings (only in DEBUG builds):

- Reset Extraction Count
- Show Paywall (test without triggering limits)
- Show Customer Center
- View current state

### RevenueCat Debug Logs

Debug logging is enabled:

```swift
Purchases.logLevel = .debug
```

Watch Xcode console for RevenueCat logs during development.

## Troubleshooting

### Paywall Not Loading

1. Check that offerings are configured in RevenueCat dashboard
2. Ensure products exist in App Store Connect
3. Verify API key is correct
4. Check debug logs for errors

### Customer Center Not Showing

1. Requires RevenueCatUI 5.14.0+
2. Customer Center must be enabled in dashboard
3. User must have an active subscription to see management options

### Purchases Not Working

1. Ensure StoreKit Testing is disabled (or properly configured)
2. Check that sandbox tester account is set up
3. Verify App Store Connect shared secret in RevenueCat
4. Enable In-App Purchase capability in Xcode

## Best Practices

1. **Always use async/await** for purchase operations
2. **Cache customer info** - RevenueCat handles this automatically
3. **Handle errors gracefully** - Show user-friendly messages
4. **Test on real devices** - StoreKit behavior differs on simulator
5. **Use entitlements** - Don't check specific product IDs
