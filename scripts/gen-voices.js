#!/usr/bin/env node
// Index the soundboard clips so the client knows what to play (browsers can't
// list a directory). Scans public/assets/audio/soundboard-clips/ and writes a
// flat manifest.json (array of filenames). A random clip from this pool plays
// on character select and on every meal delivery. Re-run after adding clips:
//   node scripts/gen-voices.js     (or: npm run voices)
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'assets', 'audio', 'soundboard-clips');
const AUDIO = /\.(mp3|m4a|ogg|wav)$/i;

fs.mkdirSync(DIR, { recursive: true });
const files = fs.readdirSync(DIR)
  .filter((f) => AUDIO.test(f))
  .sort();

const dest = path.join(DIR, 'manifest.json');
fs.writeFileSync(dest, JSON.stringify(files, null, 0) + '\n');
console.log(`soundboard manifest: ${files.length} clips -> ${path.relative(process.cwd(), dest)}`);
