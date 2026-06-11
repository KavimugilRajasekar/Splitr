# splitr_warpper — Flutter Android App

A Flutter WebView application that wraps the **Splitr** expense settlement web app in a native Android shell.

## Overview

This app loads [`https://splitr-umber.vercel.app`](https://splitr-umber.vercel.app) inside a full-screen WebView, providing a native Android experience for the Splitr expense splitting tool.

### Key Behaviors
- **Portrait-only** orientation lock
- **Edge-to-edge** display (system UI overlays hidden)
- **JavaScript unrestricted** — all web app features work fully
- **Zoom disabled** for a native-like feel
- **Back gesture blocked** to prevent accidental exits

---

## App Icon

<img src="assets/icons/splitr_no_bg.png" alt="Splitr App Icon" width="100" />

| Asset | Path |
|-------|------|
| Icon with background | `assets/icons/splitr.png` |
| Icon (transparent) | `assets/icons/splitr_no_bg.png` |

---

## Getting Started

### Prerequisites

- Flutter SDK `≥ 3.12` (Dart `^3.12.1`)
- Android Studio with Android SDK
- A connected Android device or emulator

### Setup

```bash
# Install dependencies
flutter pub get

# Run in debug mode
flutter run

# Build release APK
flutter build apk --release

# Build App Bundle (for Play Store)
flutter build appbundle --release
```

---

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `webview_flutter` | `^4.13.1` | Native Android WebView integration |
| `cupertino_icons` | `^1.0.8` | iOS-style icons |

---

## Project Structure

```
splitr_warpper/
├── lib/
│   └── main.dart          # App entry point — WebView setup & orientation lock
├── android/               # Android native project
│   └── app/src/main/res/  # Android launcher icons (mipmap-*)
├── assets/
│   └── icons/
│       ├── splitr.png          # App icon (with background)
│       └── splitr_no_bg.png    # App icon (transparent background)
├── pubspec.yaml           # Flutter project configuration
└── analysis_options.yaml  # Dart analyzer rules
```

---

## Related

- **Web App source:** [`../Splitr/`](../Splitr/)
- **Live deployment:** [https://splitr-umber.vercel.app](https://splitr-umber.vercel.app)
- **Algorithm case studies:** [`../CASE-STUDIES.md`](../CASE-STUDIES.md)
- **Monorepo README:** [`../README.md`](../README.md)

---

For Flutter documentation, see the [online documentation](https://docs.flutter.dev/).
