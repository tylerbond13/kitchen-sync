const SEARCH_LIMIT = 8;
const VIDEO_ID_RE = /^[\w-]{11}$/;

function textFrom(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node.simpleText === 'string') return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((r) => r.text || '').join('');
  if (node.accessibilityData && typeof node.accessibilityData.label === 'string') {
    return node.accessibilityData.label;
  }
  return '';
}

function bestThumbnail(renderer) {
  const thumbs = renderer && renderer.thumbnail && renderer.thumbnail.thumbnails;
  if (!Array.isArray(thumbs) || !thumbs.length) return '';
  const best = thumbs[thumbs.length - 1];
  return typeof best.url === 'string' ? best.url.replace(/\\u0026/g, '&') : '';
}

function normalizeVideo(renderer) {
  if (!renderer || !VIDEO_ID_RE.test(renderer.videoId || '')) return null;
  const title = textFrom(renderer.title).trim();
  if (!title) return null;
  return {
    videoId: renderer.videoId,
    title: title.slice(0, 120),
    channel: textFrom(renderer.ownerText || renderer.shortBylineText).trim().slice(0, 80),
    duration: textFrom(renderer.lengthText).trim().slice(0, 16),
    thumbnail: bestThumbnail(renderer),
  };
}

function collectVideos(node, out, seen, limit) {
  if (!node || out.length >= limit) return;
  if (Array.isArray(node)) {
    for (const child of node) collectVideos(child, out, seen, limit);
    return;
  }
  if (typeof node !== 'object') return;

  const renderer = node.videoRenderer || node.compactVideoRenderer || node.gridVideoRenderer;
  const video = normalizeVideo(renderer);
  if (video && !seen.has(video.videoId)) {
    seen.add(video.videoId);
    out.push(video);
    if (out.length >= limit) return;
  }

  for (const value of Object.values(node)) collectVideos(value, out, seen, limit);
}

function extractInitialData(html) {
  const marker = 'ytInitialData';
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) throw new Error('YouTube page did not include initial data');

  const start = html.indexOf('{', markerIndex);
  if (start === -1) throw new Error('YouTube initial data was malformed');

  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === '\\') escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
  }
  throw new Error('YouTube initial data was incomplete');
}

function extractVideoResults(html, limit = SEARCH_LIMIT) {
  const data = extractInitialData(html);
  const results = [];
  collectVideos(data, results, new Set(), limit);
  return results;
}

async function search(query, opts = {}) {
  const q = String(query || '').trim().slice(0, 120);
  if (q.length < 2) return [];

  const fetchImpl = opts.fetch || fetch;
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`;
  const res = await fetchImpl(url, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'Mozilla/5.0 KitchenSync/1.0',
    },
  });
  if (!res.ok) throw new Error(`YouTube search failed with ${res.status}`);
  return extractVideoResults(await res.text(), opts.limit || SEARCH_LIMIT);
}

module.exports = {
  search,
  extractVideoResults,
  extractInitialData,
};
