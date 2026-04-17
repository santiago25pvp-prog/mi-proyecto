import fs from 'node:fs';
import path from 'node:path';
import { evaluatePhaseBPromotion, PhaseBPromotionInput, PHASE_B_PROMOTION_POLICY } from '../../services/observability/promotion-gate';

interface PromotionFixture {
  policy: {
    minReleaseCycles: number;
    ratioToleranceAbsDelta: number;
    latencyToleranceMsAbsDelta: number;
  };
  advisoryCandidate: PhaseBPromotionInput;
  failingCandidate: PhaseBPromotionInput;
}

interface PromotionCheckResult {
  check: string;
  pass: boolean;
  details: string;
}

function loadFixture(): PromotionFixture {
  const fixturePath = path.resolve(process.cwd(), 'scripts/observability/fixtures/phase-b-promotion-fixture.json');
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw) as PromotionFixture;
}

function main(): void {
  const fixture = loadFixture();
  const results: PromotionCheckResult[] = [];

  const advisoryEval = evaluatePhaseBPromotion(fixture.advisoryCandidate, {
    minReleaseCycles: fixture.policy.minReleaseCycles,
    ratioToleranceAbsDelta: fixture.policy.ratioToleranceAbsDelta,
    latencyToleranceMsAbsDelta: fixture.policy.latencyToleranceMsAbsDelta,
  });
  const failingEval = evaluatePhaseBPromotion(fixture.failingCandidate, PHASE_B_PROMOTION_POLICY);

  results.push({
    check: 'phase_b_advisory_candidate_enforceable',
    pass: advisoryEval.enforceable,
    details: `enforceable=${advisoryEval.enforceable} reasons=${advisoryEval.blockingReasons.join('|') || 'none'}`,
  });

  results.push({
    check: 'phase_b_failing_candidate_blocked',
    pass: !failingEval.enforceable && failingEval.blockingReasons.length > 0,
    details: `enforceable=${failingEval.enforceable} reasons=${failingEval.blockingReasons.join('|') || 'none'}`,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    policy: fixture.policy,
    status: results.every((item) => item.pass) ? 'pass' : 'fail',
    advisoryEvaluation: advisoryEval,
    failingEvaluation: failingEval,
    results,
    fixturePath: 'scripts/observability/fixtures/phase-b-promotion-fixture.json',
  };

  const reportPath = path.resolve(process.cwd(), 'observability-promotion-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  if (!results.every((item) => item.pass)) {
    process.exitCode = 1;
  }
}

main();
