# Pocket Disc Player

A 90s portable CD player on a desk. Each record plays its Deezer 30-second preview.

Everything is in `index.html` (vanilla JS, no build step). Audio comes from Deezer through a small serverless proxy, because `api.deezer.com` doesn't send `Access-Control-Allow-Origin` and the browser can't call it directly.

## Run locally

```sh
npm run dev          # http://localhost:3000 (PORT=… to change)
```

`scripts/dev.mjs` serves the static files and runs `api/track/[id].js` the same way Vercel does. It has no dependencies and needs Node 22+.

`vercel dev` also works if you have the Vercel CLI and the folder is linked to a project.

## Deploy (Vercel)

Deploy the folder as-is. Vercel serves `index.html` statically and turns `api/track/[id].js` into a function at `GET /api/track/:id`. There's no build command or env vars.

The page calls `/api/track/` from the site root (see `API` in `index.html`). If the player lives inside a bigger site (a portfolio, say), the function has to be reachable at that root path: copy `api/track/[id].js` into that project's `api/` folder. In Next.js, the same `GET` export works as `app/api/track/[id]/route.js`.

## Proxy: `GET /api/track/:id`

Returns `{ id, title, artist, album, preview, cover }`, where `cover` is the album's `cover_xl`.

- Non-numeric id → 400.
- Deezer reports errors as HTTP 200 with an `error` body, so the proxy checks the body. Code 800 (no data) → 404, 600 → 400, 4 (quota) → 429, anything else → 502. A track with no preview → 404.
- Successful responses: `Cache-Control: s-maxage=300, stale-while-revalidate=60`. Errors are `no-store`.

**Preview URLs are signed and expire 15 minutes after Deezer issues them** (`hdnea=exp=…`). They're never stored in the data. The page fetches them fresh, and if a preview fails to load it refetches once before showing `Err`.

## Records

Each entry in `RECORDS` (in `index.html`) has a `deezerTrackId`: the song that plays for that album.

To change songs, edit `scripts/my-records.txt` (`artist – album – track`, one per line), then run:

```sh
npm run resolve-ids
```

The script searches Deezer, writes the best match's id into `index.html`, and prints anything with no match or with several close matches. To pin an exact track, add its id as a 4th field: `artist – album – track – 123456`.

Covers are local files in `records/`, so they don't depend on Deezer.

### Image CMS

With `npm run dev` running, open `http://localhost:3000/admin` to upload each record's cover, disc, back and tray images (see `records/IMAGE-SPECS.md`). Drop a file on a slot or click it. The page crops the image to a square, resizes it to 800 × 800 and compresses it to a JPEG under 200 KB. It then saves it as `records/<slug>-<kind>.jpg` and updates the ✅ columns in `IMAGE-SPECS.md`. "Disc guide" overlays `disc-template.svg` on the disc previews.

The CMS is in `scripts/` (`admin.mjs` and `admin.html`), so it's never deployed. It only accepts requests from localhost. It writes files to your working folder, so redeploy to publish the new images.

## Playback behaviour

- `ON_PREVIEW_END` in `index.html`: `'stop'` (default) parks at 0:00 with the time blinking. `'next'` swaps to the next disc.
- The disc spins only while audio is actually playing. If buffering lasts more than about 400 ms, the LCD shows `READ`.
- Volume: the remote's slider sets the audio volume. iOS ignores page volume, so there it only changes the click sounds.

## Deezer terms

- The API is for **non-commercial use only** ([terms](https://developers.deezer.com/termsofuse)).
- Apps must show a **clearly visible Deezer logo** ([guidelines](https://developers.deezer.com/guidelines/logo)). The lid print "PREVIEWS FROM [Deezer logo]" links to deezer.com and uses the official SVG from deezer.com.
- Storing audio offline is forbidden. Nothing here caches the MP3s beyond the browser's normal media cache.
