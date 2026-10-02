# Share-sheet extension — TODO

The "Build manual import flow (client)" issue's acceptance criteria calls
for **either** a share-sheet extension **or** an in-app picker. The in-app
picker (`App.tsx` + `src/uploadQueue.ts` + `src/uploadService.ts`) is
fully built and tested. The OS-level "share to Loopnote" extension is not
— it needs a real Xcode project (iOS) and Android Studio / Gradle module
(Android), which can't be created or built in a sandbox with no native
toolchain. This is a stub for whoever picks that up next.

## What it needs to do

Same destination either way: get one or more image URIs into
`POST /imports` (see `server/src/routes/imports.ts`). The two pieces
built here — `uploadQueue.ts`'s reducer and `uploadService.ts`'s
`uploadImage()` — are plain TypeScript with no RN-only dependencies
beyond `XMLHttpRequest`/`FormData`, so a share-extension target that runs
its own JS context (see the React Native option below) can reuse them
directly instead of re-implementing upload logic.

## iOS

1. In Xcode: **File → New → Target → Share Extension**.
2. Set `NSExtensionActivationRule` in the extension's `Info.plist` to
   accept images (`NSExtensionActivationSupportsImageWithMaxCount`).
3. Two ways to wire it up, in increasing order of effort:
   - **Simplest**: the extension itself doesn't call the API. It writes
     the shared image(s) into an **App Group** container and opens the
     main app via a URL scheme; the main app picks them up on launch
     and feeds them straight into `uploadQueue.ts`'s `ADD` action, same
     as if the user had picked them in-app.
   - **More native**: the extension runs its own small React Native
     instance (or plain Swift) and calls `uploadImage()` /
     `POST /imports` directly, showing its own minimal progress UI
     without ever opening the main app.
4. This requires `expo prebuild` (or ejecting to the bare workflow) —
   Expo Go does not support custom native extension targets.

## Android

1. Add an `<activity>` (or reuse the main activity) with an
   `intent-filter` for `ACTION_SEND` / `ACTION_SEND_MULTIPLE` with
   `android:mimeType="image/*"` in `AndroidManifest.xml`.
2. Same two options as iOS: hand the received `content://` URIs to the
   main app's queue (simplest), or upload directly from the receiving
   activity.
3. Also requires `expo prebuild` for the same reason as iOS — a custom
   manifest entry isn't available through Expo Go.

## Suggested order of work

1. `expo prebuild` to generate the native `ios/` and `android/` projects.
2. Start with Android (`intent-filter` is a manifest-only change,
   quicker to get working) using the "simplest" hand-off-to-main-app
   approach.
3. Do iOS's Share Extension target the same way.
4. Only build the "more native, upload from the extension itself" version
   later if the hand-off approach proves too slow or jarring in practice.
