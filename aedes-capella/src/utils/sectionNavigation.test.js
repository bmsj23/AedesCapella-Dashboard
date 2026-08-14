import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DASHBOARD_SECTIONS,
  SECTION_IDS,
  initialDashboardSection,
  persistDashboardSection,
  sectionFromKeyboardEvent,
  sectionLabel,
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

test('every sidebar section is named the same way the loading text names it', () => {
  assert.equal(sectionLabel('nodes'), 'Device Status');
  assert.equal(sectionLabel('feed'), 'Latest Activity');
  // The number shortcuts index into this list, so its order is what makes
  // pressing 4 open the fourth sidebar item.
  assert.deepEqual(
    DASHBOARD_SECTIONS.map(s => s.id),
    SECTION_IDS,
  );
  assert.equal(DASHBOARD_SECTIONS[3].id, 'nodes');
});

test('an unknown section never puts an internal id in front of a reader', () => {
  assert.equal(sectionLabel('not-a-section'), 'section');
  assert.equal(sectionLabel(undefined), 'section');
});
