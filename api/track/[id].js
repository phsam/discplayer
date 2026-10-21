// GET /api/track/:id → { id, title, artist, album, preview, cover }
// api.deezer.com sends no Access-Control-Allow-Origin, so the page can't call it directly.
// Preview URLs are signed and expire ~15 min after Deezer issues them: cache briefly, never store them.

const json = (body, status, cache = 'no-store') =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': cache } });

// Deezer answers HTTP 200 with { error: { type, message, code } }; map the codes that mean something to us
const STATUS = { 800: 404, 600: 400, 4: 429, 700: 503 };

export async function GET(request) {
  const id = decodeURIComponent(new URL(request.url).pathname.split('/').pop() || '');
  if (!/^\d{1,15}$/.test(id)) return json({ error: 'id must be numeric' }, 400);

  let d;
  try {
    const r = await fetch(`https://api.deezer.com/track/${id}`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return json({ error: `deezer http ${r.status}` }, 502);
    d = await r.json();
  } catch {
    return json({ error: 'deezer unreachable' }, 502);
  }
  if (d.error) return json({ error: d.error.message || 'deezer error', code: d.error.code }, STATUS[d.error.code] || 502);
  if (!d.preview) return json({ error: 'no preview for this track' }, 404);

  return json(
    { id: d.id, title: d.title, artist: d.artist?.name, album: d.album?.title, preview: d.preview, cover: d.album?.cover_xl },
    200,
    's-maxage=300, stale-while-revalidate=60'
  );
}
