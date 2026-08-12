export function getMapTilerStyleUrl(env = {}) {
  const mapId = env.VITE_MAPTILER_MAP_ID?.trim();
  const apiKey = env.VITE_MAPTILER_KEY?.trim();

  if (!mapId || !apiKey) return null;

  return `https://api.maptiler.com/maps/${encodeURIComponent(mapId)}/style.json?key=${encodeURIComponent(apiKey)}`;
}

export function addMapTilerKey(url, apiKey) {
  if (!apiKey) return url;

  try {
    const requestUrl = new URL(url);
    if (requestUrl.protocol !== 'https:' || requestUrl.hostname !== 'api.maptiler.com') return url;
    if (!requestUrl.searchParams.has('key')) requestUrl.searchParams.set('key', apiKey);
    return requestUrl.toString();
  } catch {
    return url;
  }
}

export function mapTilerKey(env = {}) {
  return env.VITE_MAPTILER_KEY?.trim() || null;
}

export function isTerminalMapLoadFailure(kind) {
  return kind === 'timeout' || kind === 'initialization';
}
