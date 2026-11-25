# Peter Bonos’s record collection

[Browse the gallery](https://peterbonos-bot.github.io/pb-record_collection/).

The gallery draws from the active `moments_last` Discogs inventory. Listings matched to Keith Terry’s catalog are excluded. The gallery uses local WebP files in `covers/`. Each image fits within 450 × 450 pixels and 60 KB. The `covers.json` manifest stores titles, formats, catalog numbers, listing URLs, and artwork source links. These images represent the album artwork. The source link identifies the release pictured.

## Preview locally

Run `python3 -m http.server 8000` from the repository root, then open http://localhost:8000.

## Upload cover updates

From a clone with authenticated Git access, update the image files and the corresponding manifest entries, including their dimensions, byte size, and SHA-256 checksum. Run `bash scripts/upload-covers.sh` to validate the referenced WebP files, commit the cover and manifest changes, and push to `main`. GitHub Pages publishes from that branch.
