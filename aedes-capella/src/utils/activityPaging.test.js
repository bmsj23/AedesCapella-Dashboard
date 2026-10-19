import test from 'node:test';
import assert from 'node:assert/strict';
import { collectActivityPages, ACTIVITY_RANGE_LIMIT } from './activityPaging.js';

test('collects every page past 100 records and stops at the short page', async () => {
  const rows = Array.from({ length: 237 }, (_, id) => ({ id }));
  const calls = [];
  const result = await collectActivityPages(async (limit, offset) => {
    calls.push([limit, offset]);
    return rows.slice(offset, offset + limit);
  });
  assert.deepEqual(result, { rows, capped: false });
  assert.deepEqual(calls, [[100, 0], [100, 100], [100, 200]]);
});

test('an exact full page needs an empty next page to establish completeness', async () => {
  let calls = 0;
  const result = await collectActivityPages(async (limit, offset) => {
    calls++;
    return offset === 0 ? Array(limit).fill({}) : [];
  });
  assert.equal(calls, 2);
  assert.equal(result.rows.length, 100);
  assert.equal(result.capped, false);
});

test('empty range stops immediately and the hard cap never requests extra rows', async () => {
  assert.deepEqual(await collectActivityPages(async () => []), { rows: [], capped: false });
  let calls = 0;
  const result = await collectActivityPages(async limit => {
    calls++;
    return Array(limit).fill({});
  });
  assert.equal(calls, 50);
  assert.equal(result.rows.length, ACTIVITY_RANGE_LIMIT);
  assert.equal(result.capped, true);
});

test('failed pages reject instead of returning a misleading partial result', async () => {
  await assert.rejects(collectActivityPages(async (limit, offset) => {
    if (offset) throw new Error('connection lost');
    return Array(limit).fill({});
  }), /connection lost/);
  await assert.rejects(collectActivityPages(async () => null), /not a list/);
});

test('aborting a selection stops paging even if a page ignores the signal', async () => {
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(collectActivityPages(async limit => {
    calls++;
    controller.abort();
    return Array(limit).fill({});
  }, controller.signal), { name: 'AbortError' });
  assert.equal(calls, 1);
});
