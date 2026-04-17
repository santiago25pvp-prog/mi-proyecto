import { SliWindowResult } from './sli-computation';

export type PromotionMode = 'advisory' | 'enforced';

export interface ExplicitMetricsSnapshot {
  availability: number;
  degradedResponseRate: number;
  retryExhaustionRate: number;
  p95LatencyMs: number;
}

export interface PromotionCandidateWindow {
  id: string;
  logDerived: SliWindowResult;
  explicitMetrics: ExplicitMetricsSnapshot;
}

export interface PhaseBPromotionInput {
  mode: PromotionMode;
  releaseCyclesObserved: number;
  unresolvedTelemetryIntegrityDefects: number;
  alertNoiseReviewApproved: boolean;
  windows: PromotionCandidateWindow[];
}

export interface PhaseBPromotionPolicy {
  minReleaseCycles: number;
  ratioToleranceAbsDelta: number;
  latencyToleranceMsAbsDelta: number;
}

export interface PromotionWindowParity {
  windowId: string;
  checks: {
    availability: boolean;
    degradedResponseRate: boolean;
    retryExhaustionRate: boolean;
    p95LatencyMs: boolean;
  };
  deltas: {
    availability: number;
    degradedResponseRate: number;
    retryExhaustionRate: number;
    p95LatencyMs: number;
  };
  pass: boolean;
}

export interface PhaseBPromotionEvaluation {
  mode: PromotionMode;
  enforceable: boolean;
  promoted: boolean;
  blockingReasons: string[];
  parityByWindow: PromotionWindowParity[];
}

export const PHASE_B_PROMOTION_POLICY: PhaseBPromotionPolicy = {
  minReleaseCycles: 1,
  ratioToleranceAbsDelta: 0.002,
  latencyToleranceMsAbsDelta: 150,
};

function ratioDelta(logValue: number | null, metricValue: number): number {
  const baseline = logValue ?? 0;
  return Math.abs(metricValue - baseline);
}

function latencyDelta(logLatencyMs: number | null, metricLatencyMs: number): number {
  const baseline = logLatencyMs ?? Number.POSITIVE_INFINITY;
  return Math.abs(metricLatencyMs - baseline);
}

function evaluateWindowParity(
  candidate: PromotionCandidateWindow,
  policy: PhaseBPromotionPolicy,
): PromotionWindowParity {
  const availabilityDelta = ratioDelta(candidate.logDerived.successfulNonDegraded.value, candidate.explicitMetrics.availability);
  const degradedDelta = ratioDelta(candidate.logDerived.degradedResponses.value, candidate.explicitMetrics.degradedResponseRate);
  const retryDelta = ratioDelta(
    candidate.logDerived.retryExhaustedProviderCalls.value,
    candidate.explicitMetrics.retryExhaustionRate,
  );
  const latencyDiff = latencyDelta(candidate.logDerived.p95LatencyMs.value, candidate.explicitMetrics.p95LatencyMs);

  const checks = {
    availability: availabilityDelta <= policy.ratioToleranceAbsDelta,
    degradedResponseRate: degradedDelta <= policy.ratioToleranceAbsDelta,
    retryExhaustionRate: retryDelta <= policy.ratioToleranceAbsDelta,
    p95LatencyMs: latencyDiff <= policy.latencyToleranceMsAbsDelta,
  };

  return {
    windowId: candidate.id,
    checks,
    deltas: {
      availability: availabilityDelta,
      degradedResponseRate: degradedDelta,
      retryExhaustionRate: retryDelta,
      p95LatencyMs: latencyDiff,
    },
    pass: Object.values(checks).every(Boolean),
  };
}

export function evaluatePhaseBPromotion(
  input: PhaseBPromotionInput,
  policy: PhaseBPromotionPolicy = PHASE_B_PROMOTION_POLICY,
): PhaseBPromotionEvaluation {
  const blockingReasons: string[] = [];

  if (input.releaseCyclesObserved < policy.minReleaseCycles) {
    blockingReasons.push('promotion_blocked:insufficient_release_cycle_coverage');
  }

  if (input.unresolvedTelemetryIntegrityDefects > 0) {
    blockingReasons.push('promotion_blocked:unresolved_telemetry_integrity_defects');
  }

  if (!input.alertNoiseReviewApproved) {
    blockingReasons.push('promotion_blocked:alert_noise_review_not_approved');
  }

  const parityByWindow = input.windows.map((window) => evaluateWindowParity(window, policy));

  if (parityByWindow.length === 0) {
    blockingReasons.push('promotion_blocked:missing_calibration_windows');
  }

  if (parityByWindow.some((window) => !window.pass)) {
    blockingReasons.push('promotion_blocked:parity_outside_tolerance');
  }

  const enforceable = blockingReasons.length === 0;
  const promoted = enforceable;

  return {
    mode: input.mode,
    enforceable,
    promoted,
    blockingReasons,
    parityByWindow,
  };
}
