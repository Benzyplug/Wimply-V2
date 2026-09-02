import test from 'node:test';
import assert from 'node:assert/strict';
import { minesRows } from '../../utils/minesComponents.js';

test('Mines board stays within Discord component row limits',()=>{const rows=minesRows('test-session',new Set<number>());assert.equal(rows.length,5);assert.equal(rows.reduce((total,row)=>total+row.components.length,0),25);assert.ok(rows.every(row=>row.components.length<=5));});
test('Mines cashout occupies the fifth tile slot in the same board message',()=>{const rows=minesRows('test-session',new Set<number>(),undefined,true);assert.equal(rows.length,5);assert.equal(rows[4].components.length,5);assert.equal(rows[4].components[4].data.custom_id,'mines:cashout:test-session');assert.equal(rows[4].components[4].data.disabled,false);});
test('Mines revealed cells remain visible while cashout is enabled',()=>{const rows=minesRows('test-session',new Set([0]),new Set([4]),true);assert.equal(rows[0].components[0].data.label,'💎');assert.equal(rows[4].components[4].data.label,'💰');});
