#!/usr/bin/env bash
# Builds both submission PDFs: pass 1 finds chapter pages, pass 2 writes the final files, then checks them.
# Usage: docs/hackathon-submission/build.sh [outDir] [python-with-pymupdf]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$HOME/Documents}"
PY="${2:-python3}"
rm -f "$HERE/.build/toc-pages.json"
node "$HERE/build.mjs" "$HERE/.build/pass1" --markers
"$PY" "$HERE/verify_pdfs.py" toc "$HERE/.build/pass1/SwiftCare-GeoAgent-Technical-Report.pdf"
node "$HERE/build.mjs" "$OUT"
"$PY" "$HERE/verify_pdfs.py" check "$OUT/SwiftCare-GeoAgent-Hackathon-Pitch.pdf" "$OUT/SwiftCare-GeoAgent-Technical-Report.pdf" "$HERE/.build/png"
