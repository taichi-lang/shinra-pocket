# App Icon Requirements

## Required Sizes
- **1024x1024** for App Store (iOS)
- **512x512** for Google Play (Android)
- Adaptive icon foreground: 1024x1024 (Android)

## Design Requirements
- No transparency (iOS requirement)
- No rounded corners in source file (iOS applies mask automatically)
- PNG format

## Design Direction
- Coin-themed design
- Dark background (#0d0820) with gold accent
- "SP" or coin motif as central element
- Clean, recognizable at small sizes

## Files to Create
- `assets/icon.png` (1024x1024) - Main app icon
- `assets/adaptive-icon.png` (1024x1024) - Android adaptive icon foreground
- `assets/splash-icon.png` (optional) - Splash screen logo

## Notes
- app.json already references `./assets/icon.png`
- Android adaptive icon background color is set to #0d0820 in app.json
