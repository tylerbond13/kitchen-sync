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

w=$(sips -g pixelWidth ks-vibe-summary.png | awk '/pixelWidth/{print $2}')
if [ "$w" -gt 1408 ]; then
  sips -z 768 1408 ks-vibe-summary.png >/dev/null
fi

echo "hd/ now: $(du -sh . | cut -f1)"
