# Arena Champion Challenges Tracker

A desktop and mobile app for tracking League of Legends **Arena** champion progress: mark champions you've played and those you've won with, follow challenge ranks, and optionally import stats from the Riot Games API.

Built with Electron (Windows) and Capacitor (Android).

## Features

- Champion grid with images loaded from Riot Data Dragon
- Manual tracking: mark champions as **played** (✓) or **first place** (1)
- Click a champion portrait to cycle through states (not played → played → first place → not played)
- Filters: all, played, first place, not played
- Search champions by name
- Arena challenge ranks (Iron → Master) with progress bars for:
  - unique champions played
  - unique champions with a first-place finish
- Import match history from the Riot Games API (Arena matches since February 7, 2024)
- RU / EN interface
- Progress saved between sessions

## Requirements

- [Node.js](https://nodejs.org/) (LTS recommended)
- For the desktop app: Windows, macOS, or Linux
- For Android builds: [Android Studio](https://developer.android.com/studio) with SDK and JDK

## Getting Started (Desktop)

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start the app:

```bash
npm start
```

## Build Desktop Installer

Create a Windows installer (NSIS):

```bash
npm run build
```

Output is written to the `dist/` folder.

## Android

First-time setup (initializes Capacitor, adds the Android platform, and applies project settings):

```bash
npm run android:prepare
```

Day-to-day development (copy web assets and open Android Studio):

```bash
npm run android:dev
```

Full build pipeline (web assets, copy, setup, icons, open Android Studio):

```bash
npm run cap:build
```

Other useful scripts:

| Script | Description |
|--------|-------------|
| `npm run build:web` | Build web assets into `www/` |
| `npm run cap:copy` | Copy web assets to the Android project |
| `npm run cap:icons` | Generate Android launcher icons |
| `npm run cap:open` | Open the project in Android Studio |

## Usage

### Manual tracking

- Click **✓** to toggle whether you have played a champion
- Click **1** to toggle a first-place finish (also marks the champion as played)
- Click the champion portrait to cycle: not played → played → first place → not played
- Click stat counters in the header to filter the grid
- Use the search box to find champions quickly

### Import from Riot API

1. Get a personal API key from [developer.riotgames.com](https://developer.riotgames.com/)
2. Click the **🔑** button and save your key
3. Click the **📊** button, enter summoner name, tag, and region, then fetch data

The app loads Arena matches starting from the mode launch date (February 7, 2024) and updates your champion progress automatically.

Supported regions: EUW, EUNE, NA, KR, BR, JP, RU, TR, LAN, LAS, OCE.

### Challenge ranks

Progress is tracked separately for champions played and first-place finishes:

| Rank | Champions played | First place |
|------|------------------:|------------:|
| Iron | 8 | 3 |
| Bronze | 15 | 6 |
| Silver | 30 | 12 |
| Gold | 55 | 20 |
| Platinum | 90 | 32 |
| Diamond | 135 | 45 |
| Master | 168 | 60 |

## Data Storage

- **Desktop (Electron):** `%APPDATA%\League Champion Tracker\championData.json` on Windows (similar paths on macOS/Linux)
- **Android:** browser `localStorage` inside the app

The file also stores UI language and your Riot API key.

## Tech Stack

- Electron + electron-builder
- Capacitor (Android)
- Riot Data Dragon (champion data and images)
- Riot Games API (match history)

## Disclaimer

This project is not endorsed by Riot Games. League of Legends and all related properties are trademarks of Riot Games, Inc.
