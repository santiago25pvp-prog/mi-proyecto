import assert from 'node:assert/strict';
import test from 'node:test';

import { textSplitter } from '../services/splitter';

test('textSplitter prefers whitespace and sentence boundaries', () => {
  const chunks = textSplitter('Hello world. This is a test sentence. Another line follows.', 20, 6);

  assert.equal(chunks.length >= 2, true);
  assert.equal(chunks[0].endsWith(' '), false);
  assert.match(chunks[0], /world\./);
  assert.match(chunks[1], /^This is/);
});

test('textSplitter preserves overlap without splitting words', () => {
  const text = 'alpha beta gamma delta epsilon zeta eta theta iota kappa';
  const chunks = textSplitter(text, 20, 5);

  assert.equal(chunks.length > 1, true);
  for (const chunk of chunks) {
    assert.equal(/\s{2,}/.test(chunk), false);
    assert.equal(chunk.startsWith(' '), false);
    assert.equal(chunk.endsWith(' '), false);
  }

  const overlapWord = chunks[0].split(' ').at(-1);
  assert.equal(chunks[1].includes(overlapWord ?? ''), true);
});
