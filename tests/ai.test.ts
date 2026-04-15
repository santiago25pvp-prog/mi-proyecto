import assert from 'node:assert/strict';
import test from 'node:test';

import { GoogleGenerativeAI } from '@google/generative-ai';

process.env.GEMINI_API_KEY ??= 'test-gemini-key';

const aiService = require('../services/ai') as typeof import('../services/ai');

test('composes prompt with context and question intent', async (t) => {
  let capturedPrompt = '';

  const model = {
    async generateContent(prompt: string) {
      capturedPrompt = prompt;
      return {
        response: {
          text() {
            return 'respuesta';
          },
        },
      };
    },
  };

  const modelFactoryMock = t.mock.method(
    GoogleGenerativeAI.prototype,
    'getGenerativeModel',
    () => model as unknown as ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  );

  const answer = await aiService.generateAnswer('Contexto importante', 'Cual es la idea principal?');

  assert.equal(answer, 'respuesta');
  assert.equal(modelFactoryMock.mock.callCount(), 1);
  assert.match(capturedPrompt, /Contexto:\s*\nContexto importante/);
  assert.match(capturedPrompt, /Pregunta:\s*\nCual es la idea principal\?/);
  assert.match(capturedPrompt, /basándote únicamente en el contexto proporcionado/);
});

test('uses Gemini model and generateContent call path without network', async (t) => {
  const calls: Array<{ stage: string; payload: unknown }> = [];

  const model = {
    async generateContent(prompt: string) {
      calls.push({ stage: 'generateContent', payload: prompt });
      return {
        response: {
          text() {
            return 'respuesta mockeada';
          },
        },
      };
    },
  };

  const modelFactoryMock = t.mock.method(
    GoogleGenerativeAI.prototype,
    'getGenerativeModel',
    (modelConfig: { model: string }) => {
      calls.push({ stage: 'getGenerativeModel', payload: modelConfig });
      return model as unknown as ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
    },
  );

  const result = await aiService.generateAnswer('Bloque de contexto', 'Pregunta puntual');

  assert.equal(result, 'respuesta mockeada');
  assert.equal(modelFactoryMock.mock.callCount(), 1);
  assert.deepEqual(calls[0], {
    stage: 'getGenerativeModel',
    payload: { model: 'gemini-2.5-flash' },
  });
  assert.equal(calls[1]?.stage, 'generateContent');
  assert.equal(typeof calls[1]?.payload, 'string');
});
