# Record image specs

Each record has up to four images, all saved in this `records/` folder. Only the cover is required; the page checks for the others and falls back when one is missing.

| File | Who makes it | What it is |
|---|---|---|
| `<slug>-cover.jpg` | Claude collects | Front of the CD booklet |
| `<slug>-disc.jpg` | You | The printed face of the disc |
| `<slug>-back.jpg` | You | Back of the booklet, seen on the inside of the lid when the case is open |
| `<slug>-tray.jpg` | You | Art behind the clear CD tray. Leave it out and the tray stays black plastic |

**Slug:** the album title in lowercase, with no accents, and with hyphens instead of spaces and punctuation. For example, *Tropical Static* becomes `tropical-static`. If two albums have the same title, add the artist to the start: `banda-ceu-tropical-static`.

## All images

- Square, **800 × 800 px**. The page shows them at up to about 435 px wide, so 800 px stays sharp on retina screens.
- JPEG, sRGB, quality around 80, **under 200 KB** each.
- No transparency. Fill the whole square with artwork.

## Cover (`-cover.jpg`)

- Full bleed. The whole square is visible on the front of the jewel case.
- A light glare from the plastic shell is drawn over the top-left corner, so very light detail there will look washed out.
- Source: the Cover Art Archive (MusicBrainz) when it has the exact edition. Otherwise a clean scan. Crop off any scanner border or case edge so only the artwork remains.

## Disc (`-disc.jpg`)

Use `disc-template.svg` as a guide layer. The disc fills the whole 800 px square; its center is at (400, 400).

| Zone (radius from center) | What the page does there |
|---|---|
| over 390 px | Trimmed off. The square's corners never show. |
| 385 – 397 px | A thin silver rim highlight is drawn on top. |
| **150 – 375 px** | **Safe area. Keep all text and logos here.** |
| under 146 px | Covered by the clear plastic hub ring. |
| under 111 px | The spindle hole, cut out. |

- Extend the background color all the way to the center and to the square's edges. Don't leave white or transparent gaps; the page cuts the shape out.
- The disc spins while playing, so the artwork can point in any direction.
- When a record has a disc image, the page stops drawing its own title text around the rim. Put any text you want on the disc into the print itself.

## Back (`-back.jpg`)

- Same format as the cover. This is the left page of the booklet: the tracklist, credits or a photo.
- ⚠️ **It's barely visible right now.** The case lid only opens to about 92°, so you only see its inside edge-on. Before you design these, decide whether the lid should open all the way flat, which would make the back image fully visible.

## Tray (`-tray.jpg`)

Some CDs use a clear tray with art behind it instead of black plastic. When this file exists, the page draws the tray as clear plastic over the image. Without it, the tray stays black.

- Same format as the cover: square, 800 × 800 px, full bleed. It fills the area right of the hinge.
- The clear molding is drawn on top. At 800 px:
  - a faint ring at radius ~389 px around the center (400, 400), where the disc sits;
  - the hub at the center: clear teeth out to radius ~68 px and a raised clear ring out to ~145 px. The art shows through both, slightly ghosted.
- A glossy sheen runs across the top-left, so very light detail there will look a little washed out (same as the cover).
- The disc normally lives in the player, so the tray is usually seen empty. During a disc swap the disc covers everything inside radius ~373 px for a moment.

## Record list

The disc number is the order you listed them in. The page shuffles them anyway.

| # | Artist | Title | Year | Slug | Cover | Disc | Back | Tray |
|---|---|---|---|---|---|---|---|---|
| 01 | Helmet | Meantime | 1992 | `meantime` | ✅ | ✅ | ✅ | ✅ |
| 02 | Static-X | Start a War | 2005 | `start-a-war` | ✅ | ✅ | ✅ | ✅ |
| 03 | Stone Temple Pilots | Purple | 1994 | `purple` | ✅ | ✅ | ✅ | |
| 04 | Faith No More | King for a Day… Fool for a Lifetime | 1995 | `king-for-a-day-fool-for-a-lifetime` | ✅ | | | |
| 05 | Smashing Pumpkins | Siamese Dream | 1993 | `siamese-dream` | ✅ | | | |
| 06 | Korn | Follow the Leader | 1998 | `follow-the-leader` | ✅ | ✅ | ✅ | ✅ |
| 07 | Johnny Cash | American IV: The Man Comes Around | 2002 | `american-iv-the-man-comes-around` | ✅ | | | |
| 08 | Alice in Chains | Jar of Flies | 1994 | `jar-of-flies` | ✅ | | | |
| 09 | Temple of the Dog | Temple of the Dog | 1991 | `temple-of-the-dog` | ✅ | | | |
| 10 | Bush | Razorblade Suitcase | 1996 | `razorblade-suitcase` | ✅ | | | |
| 11 | Seether | Disclaimer II | 2004 | `disclaimer-ii` | ✅ | | | |
| 12 | Audioslave | Audioslave | 2002 | `audioslave` | ✅ | ✅ | ✅ | ✅ |
| 13 | Soundgarden | Badmotorfinger | 1991 | `badmotorfinger` | ✅ | ✅ | ✅ | |
| 14 | System of a Down | System of a Down | 1998 | `system-of-a-down` | ✅ | | | |
| 15 | Thrice | Vheissu | 2005 | `vheissu` | ✅ | ✅ | ✅ | ✅ |
| 16 | Third Eye Blind | Third Eye Blind | 1997 | `third-eye-blind` | ✅ | ✅ | ✅ | |
| 17 | Silverchair | Freak Show | 1996 | `freak-show` | ✅ | ✅ | ✅ | ✅ |
| 18 | Screaming Trees | Sweet Oblivion | 1992 | `sweet-oblivion` | ✅ | | | |
| 19 | Primus | Tales from the Punchbowl | 1995 | `tales-from-the-punchbowl` | ✅ | | | |
| 20 | Nirvana | In Utero | 1993 | `in-utero` | ✅ | | | |
| 21 | Local H | As Good as Dead | 1996 | `as-good-as-dead` | ✅ | | | |
| 22 | Mudvayne | Lost and Found | 2005 | `lost-and-found` | ✅ | | | |
| 23 | Limp Bizkit | Chocolate Starfish and the Hot Dog Flavored Water | 2000 | `chocolate-starfish-and-the-hot-dog-flavored-water` | ✅ | | | |
| 24 | Cold | 13 Ways to Bleed on Stage | 2000 | `13-ways-to-bleed-on-stage` | ✅ | ✅ | ✅ | ✅ |
| 25 | Creed | Weathered | 2001 | `weathered` | ✅ | ✅ | ✅ | ✅ |

Covers come from the Cover Art Archive (MusicBrainz). Vheissu uses the US CD edition (green). Ask if you'd rather have the Japanese edition (brown).
