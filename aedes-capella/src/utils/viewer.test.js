import test from 'node:test';
import assert from 'node:assert/strict';
import { sectionsForRole, canViewSection, roleDisplayName, isTechnicalRole, resolveRoleSection } from './viewer.js';

test('administrators and technical personnel retain every existing section', () => {
  for (const role of ['admin', 'technical_personnel']) {
    assert.deepEqual(sectionsForRole(role), ['feed', 'map', 'fog', 'nodes', 'trends']);
    assert.equal(isTechnicalRole(role), true);
  }
});
test('midwives get the overview without technical detail', () => {
  assert.deepEqual(sectionsForRole('health_officer'), ['feed', 'map', 'fog', 'nodes', 'trends']);
  assert.equal(isTechnicalRole('health_officer'), false);
  assert.equal(roleDisplayName('health_officer'), 'Barangay Midwife');
});
test('BHW and unknown roles get the field view, including direct navigation checks', () => {
  for (const role of ['sanitary_inspector', null, undefined, '', 'unknown']) {
    assert.deepEqual(sectionsForRole(role), ['feed', 'map', 'nodes']);
    assert.equal(canViewSection(role, 'trends'), false);
    assert.equal(canViewSection(role, 'fog'), false);
    assert.equal(canViewSection(role, 'missing'), false);
    assert.equal(isTechnicalRole(role), false);
    assert.equal(roleDisplayName(role), 'Barangay Health Worker');
  }
  assert.equal(roleDisplayName('admin'), 'Administrator');
});

test('forbidden saved sections and direct hashes fall back to Latest Activity', () => {
  assert.equal(resolveRoleSection('sanitary_inspector', 'trends'), 'feed');
  assert.equal(resolveRoleSection(null, 'fog'), 'feed');
  assert.equal(resolveRoleSection('health_officer', 'trends'), 'trends');
});

test('saved and hash sections fall back safely after a role change', () => {
  assert.equal(resolveRoleSection('admin', 'trends'), 'trends');
  for (const role of ['sanitary_inspector', null, 'unknown']) {
    assert.equal(resolveRoleSection(role, 'trends'), 'feed');
    assert.equal(resolveRoleSection(role, 'fog'), 'feed');
    assert.equal(resolveRoleSection(role, 'nodes'), 'nodes');
  }
});
