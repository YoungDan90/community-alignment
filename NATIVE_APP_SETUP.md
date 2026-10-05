# Native app setup (iOS + Android)

The repo is wired for a Capacitor-wrapped native app pointing at the
live site (`https://www.alignmentchurch.uk`) plus native push via
Firebase Cloud Messaging. These steps can't be done from the code —
they need your accounts.

## 1. Firebase project (free, ~10 min)

1. [console.firebase.google.com](https://console.firebase.google.com) → **Add project** → name it (e.g. "Alignment Church Community") → disable Analytics (not needed) → Create.
2. **Add an iOS app**: bundle ID `uk.alignmentchurch.community`. Download `GoogleService-Info.plist` → drop it into `ios/App/App/` (same folder as `Info.plist`). In Xcode, drag it into the `App` target if it doesn't appear automatically.
3. **Add an Android app**: package name `uk.alignmentchurch.community`. Download `google-services.json` → drop it into `android/app/` (the build already checks for this file and wires it up automatically — see `android/app/build.gradle`).
4. **Project Settings → Cloud Messaging**: note the **Server key** isn't what we need — scroll to **Project Settings → Service Accounts → Generate new private key**. This downloads a JSON file with three fields you'll put in Vercel's environment variables:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the `\n` sequences exactly as they appear in the JSON — paste the whole quoted string)

## 2. Apple Developer — APNs key (you already have the account)

1. [developer.apple.com/account/resources/authkeys/list](https://developer.apple.com/account/resources/authkeys/list) → **+** → name it, check **Apple Push Notifications service (APNs)** → Continue → Register → Download (`.p8` file — Apple only lets you download this once, keep it safe).
2. Note the **Key ID** (shown on the key's page) and your **Team ID** (top-right of the Apple Developer account page).
3. Back in Firebase Console → **Project Settings → Cloud Messaging → Apple app configuration** → upload the `.p8` file along with the Key ID and Team ID. This is what lets Firebase relay messages to APNs on iOS.
4. Register the app identifier itself at [developer.apple.com/account/resources/identifiers](https://developer.apple.com/account/resources/identifiers) if `uk.alignmentchurch.community` isn't already there, with the **Push Notifications** capability checked.

## 3. Wire the entitlement in Xcode (one-time, ~2 min)

`ios/App/App/App.entitlements` already exists in the repo with
`aps-environment` set, but Xcode's project file needs to know about it
— this is a project-settings edit I can't safely make by hand-patching
`project.pbxproj`.

1. Open `ios/App/App.xcworkspace` in Xcode (not `.xcodeproj` — Capacitor uses CocoaPods/SPM, the workspace is the one that resolves correctly).
2. Select the **App** target → **Signing & Capabilities** tab.
3. Set your **Team** (your Apple Developer account).
4. Click **+ Capability** → add **Push Notifications**. Xcode will link `App.entitlements` automatically once this is added (it may create a second entitlements file — if so, delete the extra one and make sure only `App.entitlements` with `aps-environment` is referenced in Build Settings → `CODE_SIGN_ENTITLEMENTS`).
5. Also add **Background Modes** capability → check **Remote notifications** (this mirrors the `UIBackgroundModes` key already added to `Info.plist` — Xcode may add a duplicate entry, that's harmless).

## 4. Environment variables (Vercel)

Add to the project's environment variables (Production):

```
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

(values from step 1.4). Redeploy after adding — env var changes need a fresh deployment, same as `CRON_SECRET` needed last time.

## 5. Install native tooling locally

Not yet installed on this machine:

- **Xcode** (full app, not just Command Line Tools) — from the Mac App Store. Needed to build/archive/sign the iOS app and submit to App Store Connect.
- **Android Studio** — [developer.android.com/studio](https://developer.android.com/studio). Installs the Android SDK and a JDK, both needed to build the `.aab` for Play Store.

## 6. Build and open each project

```bash
npm run build          # not strictly needed for the wrapper (it loads the live site),
                        # but keeps the local web assets in public-shell in sync
npx cap sync

npx cap open ios        # opens ios/App/App.xcworkspace in Xcode
npx cap open android    # opens the android/ project in Android Studio
```

From there:

- **iOS**: Product → Archive → Distribute App → App Store Connect. Needs an App Store Connect listing created first (app name, screenshots, privacy policy URL, description).
- **Android**: Build → Generate Signed Bundle / APK → Android App Bundle. Needs a Play Console listing + a one-time $25 registration fee if you haven't published there before.

## ⚠️ If you ever re-run `npx capacitor-assets generate`

It auto-detects `public/manifest.json` as a PWA target and will
overwrite it with broken relative icon paths (`../icons/...`, which
don't resolve from `public/`) and delete icon sizes the new manifest
doesn't reference — breaking "Add to Home Screen" on the live website.
This happened once during setup and was reverted. If you add a new app
icon later, regenerate into a scratch folder and manually copy only the
`ios/` and `android/` output back in — don't let it touch
`public/manifest.json` or `public/icons/`.

## What's already done (code side)

- `capacitor.config.ts` — points the native shell at the live production URL, no local static bundle.
- iOS and Android native projects generated (`ios/`, `android/`), with app icons and splash screens generated from the existing brand icon.
- `uk.alignmentchurch.community` set as the bundle ID / package name on both platforms.
- `@capacitor/push-notifications` installed and wired into `lib/notifications/push.ts` — the same `requestPermission()` / `subscribeUser()` functions the web onboarding flow already calls now branch to native FCM registration automatically when running inside the wrapped app (`Capacitor.isNativePlatform()`).
- `push_subscriptions` table extended (new migration) to store either a web subscription or an FCM token per row, without touching existing web push data.
- `lib/notifications/send.ts` — new shared sender used by both `/api/notifications/send` and `/api/notifications/schedule`, routing web rows through `web-push` and FCM rows through Firebase Admin. FCM sends are skipped gracefully (logged, not erroring) until the Firebase env vars above are set.
- `AndroidManifest.xml` — added `POST_NOTIFICATIONS` permission (required Android 13+).
- `Info.plist` — added `UIBackgroundModes: remote-notification`.
- `App.entitlements` — created with `aps-environment` (needs linking in Xcode per step 3).
