# T11 Sign-off Evidence: Policy Decisions Closure

## Change

- Change ID: `observability-slo-enforcement`
- Task: `T11`
- Status: `approved`
- Evidence Version: `v1`
- Approved At: `2026-04-17T20:30:00.000Z`

## Decision Log

### 1) Telemetry endpoint auth posture

- Decision: `/telemetry/reliability` remains unauthenticated in Phase A with strict `publicLimiter` controls and schema validation.
- Why: browser `sendBeacon` degraded telemetry cannot reliably attach auth headers in all clients; preserving degraded + `requestId` correlation is mandatory.
- Owner: `team-backend-oncall`
- Owner ID: `owner-backend-oncall-001`
- Reference: `server.ts`, `services/observability/telemetry-endpoint.ts`

### 2) Release metadata source

- Decision: canonical release metadata source is `APP_RELEASE`, with fallback to `RELEASE_SHA`, then `npm_package_version`.
- Why: guarantees stable release lineage in runtime and CI while preserving local determinism.
- Owner: `team-platform-oncall`
- Owner ID: `owner-platform-oncall-001`
- Reference: `services/observability/event-schema.ts`

### 3) Ownership identifiers finalized

- Decision: use fixed owner IDs from ownership matrix records for primary and secondary alert ownership.
- Why: closes unresolved verify gap on accountable operator mapping.
- Primary Owner ID: `owner-backend-oncall-001`
- Secondary Owner ID: `owner-platform-oncall-001`
- Escalation ID: `esc-backend-incident-001`
- Reference: `docs/observability/ownership-matrix.md`

## Audit References

- Structural gate check: `manual_signoff_evidence_artifacts`
- Promotion gate check linkage: `phase_b_promotion_enforceability`
- Rollback boundary linkage: `rollback_boundary_enforcement`
