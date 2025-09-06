#!/usr/bin/env bash
# Helper: download a small guitar sample into public/samples/guitar/A4.mp3
# Replace SAMPLE_URL with a URL you own or a royalty-free sample URL.
set -euo pipefail
DIR="$(cd "$(dirname "$0")/.." && pwd)/public/samples/guitar"
mkdir -p "$DIR"
SAMPLE_URL="https://example.com/path/to/guitar-A4.mp3"
if [ "$SAMPLE_URL" = "https://example.com/path/to/guitar-A4.mp3" ]; then
  echo "Please edit this script and set SAMPLE_URL to a real sample URL you are allowed to use."
  exit 1
fi
curl -L "$SAMPLE_URL" -o "$DIR/A4.mp3"
echo "Downloaded sample to $DIR/A4.mp3"
