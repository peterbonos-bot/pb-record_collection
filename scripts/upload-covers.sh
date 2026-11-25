#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
origin="$(git remote get-url origin)"
case "$origin" in
  https://github.com/peterbonos-bot/pb-record_collection|https://github.com/peterbonos-bot/pb-record_collection.git|git@github.com:peterbonos-bot/pb-record_collection.git) ;;
  *) echo "Expected origin to point to peterbonos-bot/pb-record_collection." >&2; exit 1 ;;
esac

python3 - <<'PY'
import hashlib
import json
from pathlib import Path

records = json.loads(Path("covers.json").read_text(encoding="utf-8"))
for record in records:
    if "file" not in record:
        continue
    path = Path(record["file"])
    if path.parent != Path("covers") or path.suffix != ".webp":
        raise SystemExit(f"Invalid cover path: {path}")
    data = path.read_bytes()
    if len(data) > 60_000 or data[0:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise SystemExit(f"Invalid or oversized WebP: {path}")
    if hashlib.sha256(data).hexdigest() != record["sha256"]:
        raise SystemExit(f"Cover checksum differs from covers.json: {path}")
PY

if ! git diff --cached --quiet; then
  echo "Commit or unstage the currently staged changes first." >&2
  exit 1
fi

git add -- covers covers.json
if ! git diff --cached --quiet; then
  git commit -m "Update record cover artwork"
fi
git push origin HEAD:main
