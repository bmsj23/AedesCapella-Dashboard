import test from 'node:test';
import assert from 'node:assert/strict';
import { installPreloadRecovery } from './preloadRecovery.js';

function fakeWindow() {
  const listeners = new Map();
  const storage = new Map();
  let reloads = 0;
  return {
    addEventListener: (name, listener) => listeners.set(name, listener),
    removeEventListener: name => listeners.delete(name),
    sessionStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    location: { reload: () => { reloads += 1; } },
    dispatch: (name, event) => listeners.get(name)?.(event),
    reloadCount: () => reloads,
  };
}

test('a stale Vite chunk triggers one guarded page reload', () => {
  const target = fakeWindow();
  let prevented = 0;
  const event = { preventDefault: () => { prevented += 1; } };
  const remove = installPreloadRecovery(target, () => 20_000);

  target.dispatch('vite:preloadError', event);
  target.dispatch('vite:preloadError', event);

  assert.equal(prevented, 2);
  assert.equal(target.reloadCount(), 1);

  remove();
  target.dispatch('vite:preloadError', event);
  assert.equal(target.reloadCount(), 1);
});
