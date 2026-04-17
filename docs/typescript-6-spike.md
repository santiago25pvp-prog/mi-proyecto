# TypeScript 6 Migration Spike and Apply Notes

## Scope

- Track migration status for TS6 compatibility in backend (repo root) and frontend (`frontend/`).
- Keep runtime behavior stable while enforcing TS7-readiness guardrails.

## Baseline Invariants (Active)

- Backend `tsconfig.json` must keep `"module": "node16"` and `"moduleResolution": "node16"`.
- Frontend `tsconfig.json` must keep `"moduleResolution": "bundler"` and path aliases via `paths` only.
- `baseUrl` is disallowed in root and frontend tsconfig.
- `ignoreDeprecations` is disallowed in root and frontend tsconfig.
- Deprecated resolver modes `moduleResolution: "node"` and `"node10"` are disallowed.
- Required CI check names remain unchanged:
  - `Backend Typecheck, Tests & Build`
  - `Frontend Build`
  - `Frontend E2E Smoke`

## Historical Blockers (Resolved)

These findings were valid in an earlier branch state and are now resolved in current migration baseline:

- Backend previously failed TS6 with `TS5107` because `moduleResolution: "node"` mapped to deprecated `node10` behavior.
- Frontend previously failed TS6 with `TS5101` due to `baseUrl` usage.

Current repository state no longer uses those deprecated settings in active tsconfig files.

## Manual Decisions Approved

- Decision 1A: Keep explicit frontend test runtime override in `frontend/tests/register.cjs` with:
  - `module: "commonjs"`
  - `moduleResolution: "node16"`
- Decision 2A: Implement static automated guard now to fail if deprecated TypeScript keys reappear.

## Guardrail Implementation

- Added guard script: `scripts/check-tsconfig-guard.cjs`.
- Guard checks root and frontend tsconfig for forbidden options:
  - `compilerOptions.moduleResolution` set to `node` or `node10`
  - `compilerOptions.baseUrl`
  - `compilerOptions.ignoreDeprecations`
- Exposed command: `npm run check:tsconfig`.
- Enforced in CI inside existing backend required job without renaming any required checks.

## Validation Gate Sequence (A-E)

```bash
# Gate A: config integrity
npm run check:tsconfig

# Gate B/C: compiler + runtime/tooling compatibility
npx tsc --noEmit
npm test
npm run build
npm audit

# frontend gates
cd frontend
npx tsc --noEmit
npm test
npm run build
npm audit
npm run test:e2e
```

## Rollback Guidance

- If frontend test runtime regresses: revert `frontend/tests/register.cjs` and rerun frontend validations.
- If static guard causes false positives: revert `scripts/check-tsconfig-guard.cjs` and the related `package.json`/CI step, then rerun gates.
- If docs drift from actual config/tooling behavior: revert only docs and re-align with current files.
