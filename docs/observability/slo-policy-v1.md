# Observability SLO Policy v1

## Scope

Phase A uses log-derived SLIs as the enforcement source of truth. Explicit metrics remain advisory until promotion criteria are met.

## Canonical SLI Formulas (v1)

- `availability_sli = successful_non_degraded / eligible_query_requests`
- `degraded_response_rate_sli = degraded_responses / eligible_query_requests`
- `retry_exhaustion_rate_sli = retry_exhausted_provider_calls / total_provider_calls`
- `p95_e2e_query_latency_sli = p95(latency_ms over eligible_query_requests)`

## SLO Objectives (rolling 30d)

- Availability: `>= 99.5%`
- Degraded response rate: `<= 2.0%`
- Retry exhaustion rate: `<= 0.5%`
- p95 end-to-end latency: `<= 3000ms`

## Severity Envelopes

Only these severities are valid:

- `warning`
- `critical`

Availability/degraded/retry envelopes follow warning + critical thresholds; warning does not escalate to critical unless critical conditions are met.

## Source of Truth and Promotion

- Current primary source: `logs`
- Promotion to explicit metrics requires parity evidence for one release cycle and no unresolved telemetry integrity defects.

## Correlation Contract

- Every enforcement signal must be traceable through `requestId`.
- Frontend telemetry scope remains minimal: degraded render events with `requestId` only.
