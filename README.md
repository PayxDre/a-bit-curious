# A Bit Curious

A free, interactive course on money and Bitcoin: https://www.a-bit-curious.com

No build step, no framework, no tracking. The site is static files served by
Cloudflare Workers (`wrangler.jsonc`).

## Layout

| Path | What it is |
|---|---|
| `index.html` | All lesson markup and styles |
| `app.js` | Core app: navigation, live data, the original demos, exam, Signet lab |
| `js/engage.js` | Inline guided demos, predictions, journey, progress, lesson goals |
| `js/demos.js` | Newer interactives (Lightning, 51% attack, multisig, and others) |
| `sw.js` | Offline support |
| `lessons/` | Generated full-text page per lesson, for search engines |
| `for-bots/`, `llms.txt` | Machine-readable course data |
| `scripts/` | Checks and generators |

## Working on it

```
python3 -m http.server 8899        # then open http://localhost:8899
python3 scripts/check-js.py        # syntax-check every script
python3 scripts/gen-seo-pages.py   # regenerate lessons/, sitemap.xml, bot metadata
```

CI runs both scripts and fails if the generated files are out of date, so run
the generator after changing lesson text and commit the result.

When you re-verify the hand-maintained figures, bump `DATA_VERIFIED` at the top
of `app.js`. It feeds the sitemap, the lesson pages and `knowledge.json`.

## License

CC BY-SA 4.0. See `LICENSE`.
