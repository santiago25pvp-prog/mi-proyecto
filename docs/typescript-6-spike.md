# TypeScript 6.0.3 Compatibility Spike (Item 5)

## Scope

- Evaluate TypeScript 6.0.3 compatibility in backend (repo root) and frontend (`frontend/`).
- Keep this as a spike only (no permanent migration to TS6 in `package.json` or lockfiles).

## Commands Executed

### Spike checks with TS 6.0.3 (no permanent install)

```bash
# backend/root
npx -p typescript@6.0.3 tsc --noEmit -p tsconfig.json

# frontend
npx -p typescript@6.0.3 tsc --noEmit -p tsconfig.json
```

### Required validations for this item

```bash
# backend/root
npx tsc --noEmit
npm test
npm audit

# frontend
npx tsc --noEmit
npm test
npm run build
npm audit
npm run test:e2e

# root
npm run rag:eval
```

## Results

### Backend (root)

- `npx -p typescript@6.0.3 tsc --noEmit -p tsconfig.json` failed with `TS5107`.
- Error:

```text
Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0.
Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
```

- Current config uses `"moduleResolution": "node"` in `tsconfig.json`, interpreted as deprecated `node10` by TS6.

### Frontend

- `npx -p typescript@6.0.3 tsc --noEmit -p tsconfig.json` failed with `TS5101`.
- Error:

```text
Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.
Specify compilerOption '"ignoreDeprecations": "6.0"' to silence this error.
```

- Frontend config relies on `"baseUrl": "."` for path alias setup.

### Validation status (current TS5 baseline)

- Backend `npx tsc --noEmit`: PASS
- Backend `npm test`: PASS
- Backend `npm audit`: PASS (0 vulnerabilities)
- Frontend `npx tsc --noEmit`: PASS
- Frontend `npm test`: PASS
- Frontend `npm run build`: PASS
- Frontend `npm audit`: PASS (0 vulnerabilities)
- Frontend E2E smoke (`npm run test:e2e`): PASS (3/3)
- `npm run rag:eval`: FAIL due to external Gemini API quota (`429 Too Many Requests`, free-tier request limit exceeded)

## Risks

- TS6 introduces hard deprecation errors for options still used by both apps.
- A direct migration without staged config updates may break CI typechecks.
- If we suppress with `"ignoreDeprecations": "6.0"`, we can defer breakage but still need TS7-safe config changes.

## Decision

- **NO-GO** for immediate TS6 rollout in this item.
- Rationale: both backend and frontend fail TS6 checks due to compiler option deprecations, so migration is not yet clean.

## Recommended next steps

1. Backend: replace deprecated `moduleResolution: "node"` with a TS6/TS7-compatible resolution mode after validating runtime/build behavior.
2. Frontend: remove dependency on deprecated `baseUrl` by switching to explicit path mapping strategy compatible with TS6+.
3. Run a follow-up migration branch that updates configs and re-runs full validation gates before changing pinned TypeScript versions.
