import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAuthRejection,
  needsRefresh,
  newerStoredSession,
  parseStoredSession,
  refreshDelay,
  REFRESH_MARGIN_MS,
} from './operatorSession.js';

const session = (overrides = {}) => ({
  accessToken: 'access',
  refreshToken: 'refresh-1',
  expiresAt: 10_000_000,
  user: { id: 'u', email: 'bhw@example.com' },
  ...overrides,
});

test('a stored session survives its access token expiring', () => {
  const expired = session({ expiresAt: 1 });
  assert.deepEqual(parseStoredSession(JSON.stringify(expired)), expired);
});

test('a stored session without a refresh token, or corrupt, is not restored', () => {
  assert.equal(parseStoredSession(JSON.stringify(session({ refreshToken: undefined }))), null);
  assert.equal(parseStoredSession('{not json'), null);
  assert.equal(parseStoredSession(null), null);
});

test('refresh is scheduled a margin before expiry, immediately once past it', () => {
  const current = session();
  assert.equal(refreshDelay(current, current.expiresAt - REFRESH_MARGIN_MS - 5_000), 5_000);
  assert.equal(needsRefresh(current, current.expiresAt - REFRESH_MARGIN_MS - 5_000), false);
  assert.equal(refreshDelay(current, current.expiresAt + 3_600_000), 0);
  assert.equal(needsRefresh(current, current.expiresAt + 3_600_000), true);
});

test('only an auth server rejection ends a session, not a network failure', () => {
  const withStatus = status => Object.assign(new Error('x'), { status });
  assert.equal(isAuthRejection(withStatus(400)), true);
  assert.equal(isAuthRejection(withStatus(401)), true);
  assert.equal(isAuthRejection(withStatus(500)), false);
  assert.equal(isAuthRejection(new TypeError('Failed to fetch')), false);
});

test('a session rotated by another tab is adopted, an older one is not', () => {
  const current = session();
  const rotated = session({ refreshToken: 'refresh-2', expiresAt: current.expiresAt + 3_600_000 });
  assert.equal(newerStoredSession(current, rotated), rotated);
  assert.equal(newerStoredSession(rotated, current), null);
  assert.equal(newerStoredSession(current, current), null);
  assert.equal(newerStoredSession(current, null), null);
});
