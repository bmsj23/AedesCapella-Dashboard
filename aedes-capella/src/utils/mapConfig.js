export function getMapTilerStyleUrl(env = {}) {
  const mapId = env.VITE_MAPTILER_MAP_ID?.trim();
  const apiKey = env.VITE_MAPTILER_KEY?.trim();

  if (!mapId || !apiKey) return null;

  return `https://api.maptiler.com/maps/${encodeURIComponent(mapId)}/style.json?key=${encodeURIComponent(apiKey)}`;
}
