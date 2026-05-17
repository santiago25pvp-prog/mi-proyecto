# Phase 0 Baseline (Hardening + Baseline)

Date: 2026-05-14 18:43:26 -05:00

## Scope

Initial baseline for hardening and RAG/operational quality without build steps.

## Branch Protection Evidence (`main`)

- Repo: `santiago25pvp-prog/mi-proyecto`
- Source: `origin = https://github.com/santiago25pvp-prog/mi-proyecto.git`
- Required checks: `Frontend Build`, `Backend Typecheck, Tests & Build`, `Frontend E2E Smoke`

Before:

- `required_status_checks.strict = false`

After:

- `required_status_checks.strict = true`
- Required checks remained unchanged.

## Commands Executed (No Build)

1. `npm run rag:eval:deterministic`
2. `npm run observability:check:structural`
3. `npm run test:backend`

## Key Results

- `rag:eval:deterministic`: success, 10 assertions, deterministic lane, no network calls.
- `observability:check:structural`: completed without reported failures.
- `test:backend`: passing run (TAP output, no failing subtests).

## Limitations

- This baseline does not include build steps by design.
- Baseline reflects command outcomes in this local execution window only.
- External live-lane checks (`rag:eval` with network) were intentionally not used as baseline blockers here.
