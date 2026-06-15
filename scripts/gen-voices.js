#!/usr/bin/env node
// Scan public/assets/audio/voices/<charKey>/[<category>/]*.{mp3,m4a,ogg,wav}
// and write voices/manifest.json so the client knows which clips exist per
// character (browsers can't list a directory). Re-run whenever you add sounds:
//   node scripts/gen-voices.js
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public', 'assets', 'audio', 'voices');
const AUDIO = /\.(mp3|m4a|ogg|wav)$/i;

function listAudio(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && AUDIO.test(d.name))
    .map((d) => d.name)
    .sort();
}

function build() {
  if (!fs.existsSync(ROOT)) {
    console.error('No voices folder at', ROOT);
    return {};
  }
  const out = {};
  for (const charDir of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!charDir.isDirectory()) continue;
    const key = charDir.name;
    const base = path.join(ROOT, key);
    const all = [];
    const categories = {};

    // files directly in the character folder → category "general"
    const loose = listAudio(base);
    if (loose.length) {
      categories.general = loose.map((f) => `${key}/${f}`);
      all.push(...categories.general);
    }
    // subfolders → named categories (greeting, catchphrase, sassy, ...)
    for (const sub of fs.readdirSync(base, { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const files = listAudio(path.join(base, sub.name));
      if (!files.length) continue;
      categories[sub.name] = files.map((f) => `${key}/${sub.name}/${f}`);
      all.push(...categories[sub.name]);
    }
    if (all.length) out[key] = { all, categories };
  }
  return out;
}

const manifest = build();
const dest = path.join(ROOT, 'manifest.json');
fs.mkdirSync(ROOT, { recursive: true });
fs.writeFileSync(dest, JSON.stringify(manifest, null, 2) + '\n');
const chars = Object.keys(manifest);
const clips = chars.reduce((n, k) => n + manifest[k].all.length, 0);
console.log(`voices manifest: ${chars.length} characters, ${clips} clips -> ${path.relative(process.cwd(), dest)}`);
