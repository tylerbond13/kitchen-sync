#!/usr/bin/env bash
# Downscale HD renders to web size. The game draws sprites at <=150 device px,
# so shipping 1254-1408px studio renders only burns bandwidth and decode time.
#   - sprites:           max dimension 512
#   - walls (stretched): max dimension 1280
#   - ks-vibe-summary:   exactly 50% — assetManifest.js crop rects are halved
#                        to match, so re-running on new full-res art requires
#                        re-checking those crops.
# Safe to re-run: already-small files are skipped. Originals live in the
# Codex art folder + git history.
set -euo pipefail
cd "$(dirname "$0")/../public/assets/images/hd"
shopt -s nullglob

for f in ks-*.png; do
  case "$f" in
    ks-vibe-summary.png) continue ;;
    ks-char-sprite-*)    continue ;;   # pose sheets: exact 50% below
    ks-wall-*)           MAX=1280 ;;
    *)                   MAX=512 ;;
  esac
  w=$(sips -g pixelWidth  "$f" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  big=$(( w > h ? w : h ))
  if [ "$big" -gt "$MAX" ]; then
    sips -Z "$MAX" "$f" >/dev/null
  fi
done

# sheets (vibe-summary + character pose sheets): exact 50% so the manifest's
# crop rects stay a clean half of the source coordinates
for f in ks-vibe-summary.png ks-char-sprite-*.png; do
  [ -f "$f" ] || continue
  w=$(sips -g pixelWidth  "$f" | awk '/pixelWidth/{print $2}')
  h=$(sips -g pixelHeight "$f" | awk '/pixelHeight/{print $2}')
  if [ "$w" -gt 1408 ]; then
    sips -z $((h / 2)) $((w / 2)) "$f" >/dev/null
  fi
done

echo "hd/ now: $(du -sh . | cut -f1)"
