import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMapTilerKey,
  getMapTilerStyleUrl,
  isTerminalMapLoadFailure,
  mapTilerKey,
} from './mapConfig.js';

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

test('the MapTiler key is propagated to dependent style resources without replacing existing keys', () => {
  assert.equal(
    addMapTilerKey('https://api.maptiler.com/fonts/Roboto/0-255.pbf', 'public-key'),
    'https://api.maptiler.com/fonts/Roboto/0-255.pbf?key=public-key',
  );
  assert.equal(
    addMapTilerKey('https://api.maptiler.com/tiles/v3/0/0/0.pbf?key=style-key', 'public-key'),
    'https://api.maptiler.com/tiles/v3/0/0/0.pbf?key=style-key',
  );
  assert.equal(
    addMapTilerKey('https://example.com/tile.pbf', 'public-key'),
    'https://example.com/tile.pbf',
  );
  assert.equal(mapTilerKey({ VITE_MAPTILER_KEY: ' public-key ' }), 'public-key');
});

test('recoverable MapLibre resource errors do not force the OpenStreetMap fallback', () => {
  assert.equal(isTerminalMapLoadFailure('resource-error'), false);
  assert.equal(isTerminalMapLoadFailure('timeout'), true);
  assert.equal(isTerminalMapLoadFailure('initialization'), true);
});
