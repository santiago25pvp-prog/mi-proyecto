import fs from 'node:fs';
import path from 'node:path';
import { createReliabilityEvent } from '../../services/observability/event-schema';
import { computeCanonicalSlis } from '../../services/observability/sli-computation';
import { evaluateSloPolicy } from '../../services/observability/slo-policy';

function main(): void {
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const sampleEvents = [
    createReliabilityEvent({
      eventName: 'query_request_started',
      requestId: 'local-1',
      route: '/query',
      reliability: { degraded: false },
    }),
    createReliabilityEvent({
      eventName: 'query_request_completed',
      requestId: 'local-1',
      route: '/query',
      reliability: { degraded: false, latencyMs: 240 },
    }),
  ];

  const sli = computeCanonicalSlis(sampleEvents, {
    startedAt: hourAgo.toISOString(),
    endedAt: now.toISOString(),
  });
  const evaluation = evaluateSloPolicy(sli);

  const outputPath = path.resolve(process.cwd(), 'observability-window-output.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: now.toISOString(),
        sli,
        evaluation,
      },
      null,
      2,
    ),
    'utf8',
  );

  process.stdout.write(`${outputPath}\n`);
}

main();
