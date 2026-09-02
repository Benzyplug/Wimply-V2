import test from 'node:test';
import assert from 'node:assert/strict';
import { minesCashoutRow, minesRows } from './mines.js';

test('Mines board stays within Discord component row limits', () => {
  const rows = minesRows('test-session', new Set<number>());
  assert.equal(rows.length, 5);
  assert.equal(rows.reduce((total, row) => total + row.components.length, 0), 25);
  assert.ok(rows.every(row => row.components.length <= 5));
});

test('Mines cash-out control is a separate single action row', () => {
  const rows = minesCashoutRow('test-session', false);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].components.length, 1);
});
