import test from 'node:test';
import assert from 'node:assert/strict';
import { getMapTilerStyleUrl } from './mapConfig.js';

test('MapTiler configuration builds a vector style endpoint instead of a viewer or raster URL', () => {
  assert.equal(
    getMapTilerStyleUrl({
      VITE_MAPTILER_MAP_ID: 'barangay-map',
      VITE_MAPTILER_KEY: 'public key',
    }),
    'https://api.maptiler.com/maps/barangay-map/style.json?key=public%20key',
  );
});

test('missing MapTiler configuration keeps the OpenStreetMap fallback active', () => {
  assert.equal(getMapTilerStyleUrl({ VITE_MAPTILER_MAP_ID: 'barangay-map' }), null);
  assert.equal(getMapTilerStyleUrl({ VITE_MAPTILER_KEY: 'public-key' }), null);
});
