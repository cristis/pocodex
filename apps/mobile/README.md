# Mobile App

This app is the Expo-based mobile wrapper for Pocodex. It stores a full Pocodex URL locally and opens that URL inside a native `WebView`.

On first launch, or after clearing the saved endpoint, the app starts on its setup screen so you can paste the full Pocodex URL before loading the web view.

## Prerequisites

- Node.js and `pnpm`
- Xcode and CocoaPods for iOS builds
- Android Studio plus an Android SDK/emulator for Android builds

Install workspace dependencies from the repository root:

```bash
cd ../..
pnpm install
```

## Start Metro

From the repository root:

```bash
pnpm run mobile:start
```

This starts the Expo dev server for the app in `apps/mobile`.

## Run on iOS

Build and launch the iOS app from the repository root:

```bash
pnpm run mobile:ios
```

Notes:

- This wraps `expo run:ios`.
- The native iOS project lives in `apps/mobile/ios`.
- If CocoaPods reports that the sandbox is out of sync, run:

```bash
cd ios
pod install
```

## Run on Android

Build and launch the Android app from the repository root:

```bash
pnpm run mobile:android
```

Notes:

- This wraps `expo run:android`.
- The native Android project lives in `apps/mobile/android`.

## Clean Builds

Android clean:

```bash
cd android
./gradlew clean
```

iOS build artifact clean:

```bash
rm -rf ios/build
```

Expo/Metro cache clean:

```bash
cd ../..
pnpm --filter pocodex-mobile start -- --clear
```

## Tests

Run the mobile test suite from the repository root:

```bash
pnpm run mobile:test
```

## First Run

1. Start or expose a Pocodex server on your machine or local network.
2. Launch the mobile app.
3. Paste the full Pocodex URL, including any token query parameter if present.
4. Save the URL to open the web view.

The mobile wrapper is intended for trusted-network use. The app allows plain `http://` endpoints so it can connect directly to locally hosted Pocodex instances.
