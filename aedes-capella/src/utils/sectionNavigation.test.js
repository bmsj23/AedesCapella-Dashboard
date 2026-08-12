import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialDashboardSection,
  persistDashboardSection,
  sectionFromKeyboardEvent,
} from './sectionNavigation.js';

function fakeWindow({ hash = '', stored = null } = {}) {
  let currentHash = hash;
  let storedSection = stored;
  return {
    location: { get hash() { return currentHash; } },
    localStorage: {
      getItem: () => storedSection,
      setItem: (_key, value) => { storedSection = value; },
    },
    history: {
      replaceState: (_state, _title, nextHash) => { currentHash = nextHash; },
    },
    values: () => ({ hash: currentHash, stored: storedSection }),
  };
}

test('selected dashboard section survives refresh and a valid URL hash takes precedence', () => {
  const target = fakeWindow();
  persistDashboardSection('nodes', target);
  assert.deepEqual(target.values(), { hash: '#nodes', stored: 'nodes' });
  assert.equal(initialDashboardSection(target), 'nodes');

  const sharedLink = fakeWindow({ hash: '#map', stored: 'nodes' });
  assert.equal(initialDashboardSection(sharedLink), 'map');
});

test('number shortcuts map 1–5 to sidebar sections but never fire while typing', () => {
  assert.equal(sectionFromKeyboardEvent({ key: '1', target: { tagName: 'BODY' } }), 'feed');
  assert.equal(sectionFromKeyboardEvent({ key: '5', target: { tagName: 'BODY' } }), 'trends');
  assert.equal(sectionFromKeyboardEvent({ key: '6', target: { tagName: 'BODY' } }), null);
  assert.equal(sectionFromKeyboardEvent({ key: '2', target: { tagName: 'INPUT' } }), null);
  assert.equal(sectionFromKeyboardEvent({ key: '3', ctrlKey: true, target: { tagName: 'BODY' } }), null);
});
