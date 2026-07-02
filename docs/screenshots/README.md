# Screenshot archive

One folder per release (`v<version>/`), capturing every screen of the game as it
looked in that build — a visual history of Kitchen Sync's progression alongside
[CHANGELOG.md](../../CHANGELOG.md).

Each folder contains (landscape phone, 844×390 @2x):

| file | screen |
| --- | --- |
| `home.png` | Home / main menu (landscape two-pane) |
| `home-portrait.png` | Home in portrait |
| `changelog.png` | 📋 What's new modal |
| `lobby-levels.png` | Lobby — Levels roadmap page |
| `lobby-shop.png` | Lobby — Kitchen Shop page |
| `milestones.png` | 🏅 Milestones panel |
| `characters.png` | 🎭 Character grid |
| `game.png` | In-round gameplay |
| `pause.png` | Pause menu |

## Capturing a new version

```
npm start                          # serve the build you want to archive
npm i puppeteer-core --no-save     # one-time; drives your installed Chrome
node scripts/capture-screenshots.mjs   # or: npm run screenshots
```

The script reads `/api/version` and writes to `docs/screenshots/v<version>/`.
Run it once per release after deploying.
