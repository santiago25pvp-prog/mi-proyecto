# T12 Sign-off Evidence: Rollout and Rollback Drill

## Change

- Change ID: `observability-slo-enforcement`
- Task: `T12`
- Status: `approved`
- Evidence Version: `v1`
- Drill Date: `2026-04-17`

## Drill Metadata

- Environment: `preprod-observability`
- Release Metadata Source: `APP_RELEASE` -> `RELEASE_SHA` -> `npm_package_version`
- Coordinator Owner ID: `owner-backend-oncall-001`
- Reviewer Owner ID: `owner-platform-oncall-001`
- Escalation Channel ID: `esc-backend-incident-001`

## Drill Steps and Evidence

1. Warning simulation executed with deterministic window fixture.
   - Evidence: `observability-operational-report.json` includes non-critical pass for policy severity.
2. Critical simulation executed with failing promotion candidate.
   - Evidence: `observability-promotion-report.json` contains `promotion_blocked:parity_outside_tolerance`.
3. Rollback guard drill executed with invalid rollback plan.
   - Evidence: `observability-rollback-report.json` invalid plan rejected with boundary errors.
4. Visibility invariants re-checked after rollback simulation.
   - Evidence: requestId correlation and degraded semantics validated in rollback report + structural report.

## Required Invariants Verified

- `degraded` semantics preserved across rollback path.
- `requestId` correlation preserved across backend and frontend telemetry.
- Structural event integrity remains valid (`schemaVersion=v1`, required event families present).
- Critical alert coverage remains enabled.

## Approval

- Approved by: `team-backend-oncall` (`owner-backend-oncall-001`)
- Approved by: `team-platform-oncall` (`owner-platform-oncall-001`)
- Approval Note: rollout/rollback boundaries verified; production enablement can proceed under existing CI governance.
