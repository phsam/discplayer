// Reads scripts/my-records.txt ("artist – album – track" per line), finds each track on Deezer,
// and writes its id into the matching RECORDS entry in index.html as deezerTrackId.
// npm run resolve-ids   (Node 22.18+ runs .ts directly)
import { readFile, writeFile } from 'node:fs/promises';

const LIST = new URL('./my-records.txt', import.meta.url);
const PAGE = new URL('../index.html', import.meta.url);

type Hit = { id: number; title: string; rank: number; preview: string; artist: { name: string }; album: { title: string } };
type Scored = Hit & { score: number };

// lowercase, no accents, no punctuation, "&" → "and", "KoЯn" → "korn"
const norm = (s: string) =>
  s.replace(/Я/g, 'R').replace(/я/g, 'r').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
// drop "(Remastered)", "- 2011 Remaster" and the like before comparing titles
const bare = (s: string) => norm(s.replace(/\s*[([].*?[)\]]\s*/g, ' ').replace(/\s+-\s+.*$/, ''));
// tags that mean a different recording than the album cut
const ALT = /\b(live|acoustic|demo|remix|mix|version|rehearsal|instrumental|unplugged|edit|session|karaoke|cover)\b/i;
const alt = (s: string, wanted: string) => ALT.test(s.replace(/album version/i, '')) && !ALT.test(wanted);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function search(q: string): Promise<Hit[]> {
  const r = await fetch(`https://api.deezer.com/search?limit=50&q=${encodeURIComponent(q)}`);
  const d = await r.json();
  if (d.error) throw new Error(`${d.error.type}: ${d.error.message}`);
  await sleep(150); // Deezer allows 50 requests per 5 s
  return d.data || [];
}

function score(h: Hit, artist: string, album: string, track: string): number {
  if (norm(h.artist.name) !== norm(artist) || !h.preview) return 0;
  const t = norm(h.title) === norm(track) ? 4 : bare(h.title) !== bare(track) ? 0 : alt(h.title, track) ? 1 : 3;
  if (!t) return 0;
  const a = norm(h.album.title) === norm(album) ? 3 : bare(h.album.title) === bare(album) ? 2 : norm(h.album.title).includes(norm(album)) ? 1 : 0;
  return t + a;
}

async function resolve(artist: string, album: string, track: string) {
  const q = (s: string) => s.replace(/"/g, '');
  let hits = await search(`artist:"${q(artist)}" album:"${q(album)}" track:"${q(track)}"`);
  if (!hits.length) hits = await search(`artist:"${q(artist)}" track:"${q(track)}"`);
  if (!hits.length) hits = await search(`${artist} ${track}`);
  const scored: Scored[] = hits.map(h => ({ ...h, score: score(h, artist, album, track) })).filter(h => h.score);
  scored.sort((x, y) => y.score - x.score || y.rank - x.rank);
  const top = scored.filter(h => h.score === scored[0]?.score);
  return { best: scored[0], ties: new Set(top.map(h => h.id)).size > 1 ? top : [], others: scored };
}

const fmt = (h: Hit) => `${h.id}  "${h.title}" on "${h.album.title}" (rank ${h.rank})`;

let page = await readFile(PAGE, 'utf8');
const lines = (await readFile(LIST, 'utf8')).split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const missing: string[] = [], unsure: string[] = [];

for (const line of lines) {
  const [artist, album, track, pinned] = line.split(/\s+[–—-]\s+/);
  if (!track) { missing.push(`${line}\n    → can't parse; expected "artist – album – track"`); continue; }

  // the RECORDS entry for this album: {t:"…",a:"…",…}
  const row = page.split('\n').find(l => {
    const m = l.match(/^\s*\{t:"(.*?)",a:"(.*?)"/);
    return m && norm(m[1]) === norm(album) && norm(m[2]) === norm(artist);
  });
  if (!row) { missing.push(`${line}\n    → no record in index.html with that artist and album`); continue; }

  let id: number;
  if (pinned) id = +pinned;
  else {
    const { best, ties, others } = await resolve(artist, album, track);
    if (!best) { missing.push(`${line}\n    → no match on Deezer`); continue; }
    id = best.id;
    if (ties.length) unsure.push(`${line}\n    → picked ${fmt(best)}\n${ties.slice(1).map(h => `      also ${fmt(h)}`).join('\n')}`);
    else if (best.score < 7) unsure.push(`${line}\n    → picked ${fmt(best)} (album name differs)${others.length > 1 ? `\n${others.slice(1, 4).map(h => `      also ${fmt(h)}`).join('\n')}` : ''}`);
  }

  const next = /deezerTrackId:\d+/.test(row) ? row.replace(/deezerTrackId:\d+/, `deezerTrackId:${id}`) : row.replace(/\}(,?)\s*$/, `,deezerTrackId:${id}}$1`);
  page = page.replace(row, next);
  console.log(`✓ ${artist} – ${track}: ${id}`);
}

await writeFile(PAGE, page);
if (unsure.length) console.log(`\nCheck these (several close matches, or album differs):\n${unsure.join('\n')}`);
if (missing.length) console.log(`\nNot resolved — fix by hand:\n${missing.join('\n')}`);
