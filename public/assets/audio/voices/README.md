# Character voice clips

Drop a character's sound clips here and the game will play one when that chef is
**selected** and a random one each time they **deliver a meal**.

## Layout

```
voices/
  betty_white/                 ← folder name = the chef's key (see assetManifest.js)
    laugh-01.mp3               ← loose files = the "general" pool
    laugh-02.mp3
    greeting/                  ← optional sub-folders = named categories
      hello-there.mp3
    catchphrase/
      oh-betty.mp3
  judge_judy/
    ...
```

Supported formats: `.mp3`, `.m4a`, `.ogg`, `.wav`.

## Categories

Sub-folders become categories. The game uses them as hints:

- **on select** it prefers `greeting` / `hello` / `select` / `intro`, else any clip.
- **on delivery** it prefers `delivery` / `serve` / `happy` / `catchphrase`, else any clip.

Anything else (e.g. `sassy`, `angry`) is fine — it just joins the general pool
for random playback. Loose files (not in a sub-folder) land in `general`.

## After adding files

Run the indexer so the client knows what exists (browsers can't list folders):

```
node scripts/gen-voices.js      # or: npm run voices
```

This (re)writes `manifest.json` here. Commit that file along with the audio.

## ⚠️ Licensing

These play in a **publicly deployed** game. Celebrity/soundboard clips are
copyrighted recordings — shipping them publicly is redistribution. Use audio you
have the right to use (your own recordings, royalty-free/CC0 clips, or
licensed/cleared sound) for anything you deploy. The system itself is
content-agnostic: it plays whatever you legitimately put here.
