# Ad Insertion Points — ShinraPocket

This document defines where ads should be displayed in the app.

## Interstitial Ads

| Location | Frequency | Trigger |
|----------|-----------|---------|
| Between games (game end -> lobby) | Every 3rd game | After result screen dismissed |
| After online battle result | Every 2nd battle | After result animation completes |
| On app resume (background -> foreground) | Max 1 per 5 minutes | App state change |

### Rules
- Never show during active gameplay
- Never show during matchmaking / loading
- Minimum 60 seconds between interstitials
- Do not show on first app launch or first game
- Skip if user just made a purchase

## Rewarded Ads

| Location | Reward | Trigger |
|----------|--------|---------|
| Shop screen "Watch Ad" button | 50 coins | User taps button |
| Continue after defeat | Extra turn / retry | User taps "Watch Ad to Continue" |
| Double victory reward | 2x coins earned | User taps "Double Reward" after win |
| Daily bonus multiplier | 2x daily login bonus | User taps on daily bonus screen |

### Rules
- Always user-initiated (never forced)
- Clearly communicate the reward before showing
- If ad fails to load, give a smaller reward or retry option

## Banner Ads

| Location | Size | Position |
|----------|------|----------|
| Home / Lobby screen | Smart Banner | Bottom of screen |
| Game selection screen | Smart Banner | Bottom of screen |
| Leaderboard screen | Smart Banner | Bottom of screen |
| Profile screen | Smart Banner | Bottom of screen |

### Rules
- Never show during active gameplay
- Never overlap game UI elements
- Remove immediately when user navigates to a game
- Hidden if user has purchased "Remove Ads"

## Ad-Free Zones (Never Show Ads)

- Active gameplay (all 6 mini-games)
- Online battle gameplay
- Settings screen
- Tutorial / onboarding
- Purchase flow / Shop checkout
- Loading screens

## Frequency Caps

| Ad Type | Cap |
|---------|-----|
| Interstitial | Max 6 per hour, max 1 per 60 seconds |
| Rewarded | No cap (user-initiated) |
| Banner | Always visible in allowed screens |

## Implementation Notes

- Use `adService.showInterstitial(everyNthTime)` to control frequency
- Check `areAdsRemoved()` before any ad display
- Log ad impressions for analytics
- Test with Google AdMob test ad IDs during development
