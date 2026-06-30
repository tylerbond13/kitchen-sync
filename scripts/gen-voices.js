#!/usr/bin/env node
// Index the soundboard clips so the client knows what to play (browsers can't
// list a directory). Scans public/assets/audio/soundboard-clips/ and writes a
// recursive manifest.json (array of relative paths). A random clip from this pool plays
// on character select and on every meal delivery. Re-run after adding clips:
//   node scripts/gen-voices.js     (or: npm run voices)
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'public', 'assets', 'audio', 'soundboard-clips');
const AUDIO = /\.(mp3|m4a|ogg|wav)$/i;

fs.mkdirSync(DIR, { recursive: true });
function audioFiles(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const full = path.join(dir, entry.name);
      const rel = prefix ? path.posix.join(prefix, entry.name) : entry.name;
      if (entry.isDirectory()) return audioFiles(full, rel);
      return AUDIO.test(entry.name) ? [rel] : [];
    });
}

const files = audioFiles(DIR)
  .sort();

const dest = path.join(DIR, 'manifest.json');
fs.writeFileSync(dest, JSON.stringify(files, null, 0) + '\n');
console.log(`soundboard manifest: ${files.length} clips -> ${path.relative(process.cwd(), dest)}`);
