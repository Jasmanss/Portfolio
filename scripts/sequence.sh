#!/usr/bin/env bash
# Turns a video into the hero's scroll sequence: public/sequence/hero/0001.webp … plus manifest.json.
# Usage: scripts/sequence.sh path/to/video.mp4 [fps=30] [width=1920]
# Needs ffmpeg and Python with Pillow. Aim for a 4–6 s, 16:9 clip; on phones the middle of the frame is shown.
set -euo pipefail
in="$1"
fps="${2:-30}"
width="${3:-1920}"
out="public/sequence/hero"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

ffmpeg -loglevel error -i "$in" -vf "fps=$fps,scale=$width:-2" "$tmp/%04d.png"
rm -rf "$out"
mkdir -p "$out"
python3 - "$tmp" "$out" <<'PY'
import glob, json, sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(f'{src}/*.png'))
for i, f in enumerate(files, 1):
    Image.open(f).convert('RGB').save(f'{out}/{i:04d}.webp', quality=72, method=4)
w, h = Image.open(files[0]).size
json.dump({'count': len(files), 'pad': 4, 'ext': 'webp', 'width': w, 'height': h}, open(f'{out}/manifest.json', 'w'))
print(f'Wrote {len(files)} frames ({w}x{h}) to {out}')
PY
