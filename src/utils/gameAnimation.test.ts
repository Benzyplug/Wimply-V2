import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGameSlides } from './gameAnimation.js';

test('buildGameSlides creates a timed OWO-style slide sequence', () => {
  const slides = buildGameSlides([
    { content: '🎰 Spin', delay: 120 },
    { content: '🎰 Lock', delay: 180 },
    { content: '🎉 Result', delay: 0 }
  ]);

  assert.deepEqual(slides.map((slide) => slide.content), ['🎰 Spin', '🎰 Lock', '🎉 Result']);
  assert.deepEqual(slides.map((slide) => slide.delay), [120, 180, 0]);
  assert.equal(slides.length, 3);
});
