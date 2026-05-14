# CI Governance Runbook

## Purpose

Keep `main` merge protection aligned with real CI check names so required checks enforce the intended quality gates.

## Current Required Checks on `main`

- `Backend Typecheck, Tests & Build`
- `Frontend Build`
- `Frontend E2E Smoke`

### RAG Reliability Lane Governance

- Deterministic reliability lane: `npm run rag:eval:deterministic`.
- This lane is intended as blocking/reproducible evidence for reliability contract behavior.
- Live external lane: `npm run rag:eval`.
- Live lane remains operational signal (`live-non-blocking`) because provider availability can be non-deterministic.
- Keep existing required CI check names unchanged; reliability lanes are governed as script-level policy and PR evidence.

### Observability SLO Enforcement Lanes

- Blocking structural lane: `npm run observability:check:structural`.
- Structural lane must fail CI when schema/formula/ownership/runbook reference integrity checks fail.
- Structural lane also enforces Phase B promotion readiness and rollback boundary requirements via deterministic fixtures.
- Required operational lane (in `Backend Typecheck, Tests & Build`): `npm run observability:check:operational` with `OBSERVABILITY_OPERATIONAL_MODE=soft-block`.
- Advisory operational lane (`Backend Observability Operational (Advisory)`): same script with `OBSERVABILITY_OPERATIONAL_MODE=advisory`, still non-blocking.
- Mode behavior:
  - `advisory`: never blocks.
  - `soft-block`: blocks only `critical` findings.
  - `hard-block`: blocks `warning` and `critical` findings.
- Mode parsing is fail-closed for invalid non-empty values: if `OBSERVABILITY_OPERATIONAL_MODE` is provided but not one of `advisory|soft-block|hard-block`, the operational check exits with error.
- Override policy (critical bypass only in `soft-block`/`hard-block`):
  - PR must include label `ops-override-observability`.
  - PR body must include `## Observability Override` section with fields: `Reason`, `Risk`, `Owner`, `ExpiresAt`, `RollbackPlan`.
  - `ExpiresAt` must be ISO8601, not expired, and within max TTL of 72h from evaluation time.
  - If label is present but section is missing/invalid/incomplete, override is invalid and no bypass is granted.
- Operational report `observability-operational-report.json` includes gate decision, override metadata, and a `summary` split into `risk` and `guard` findings to reduce interpretation noise.
- Required GitHub check names remain unchanged (`Backend Typecheck, Tests & Build`, `Frontend Build`, `Frontend E2E Smoke`).

### Manual Sign-off Evidence Policy (T11/T12)

- Required evidence artifacts must be versioned in repo:
  - `docs/observability/signoff-t11-policy-decisions.md`
  - `docs/observability/signoff-t12-drill-evidence.md`
- Structural check `manual_signoff_evidence_artifacts` fails if those artifacts are missing.

## Check-Name Drift: What it is

Check-name drift happens when a GitHub Actions job `name` changes in workflow YAML, but branch protection still requires the old name. This can block merges (required check never appears) or leave a gap (wrong check required).

## Update Procedure

1. Confirm workflow job names in `.github/workflows/ci.yml` match the intended required checks.
2. Read current branch protection settings for `main`:

```bash
gh api repos/<owner>/<repo>/branches/main/protection
```

3. Update only required status checks, preserving strict mode unless there is an explicit policy decision to change it:

```bash
gh api -X PATCH repos/<owner>/<repo>/branches/main/protection/required_status_checks \
  -F strict=<current_strict_value> \
  -F contexts[]='Backend Typecheck, Tests & Build' \
  -F contexts[]='Frontend Build' \
  -F contexts[]='Frontend E2E Smoke'
```

4. Re-read branch protection and verify `strict` is unchanged and all required contexts are present.
5. Update `README.md` if required checks or governance policy changed.

## Notes

- Required status checks use check run names (job names), not workflow file names.
- If merge queue is enabled in the future, ensure workflows include `merge_group` trigger so required checks run for queued merges.
