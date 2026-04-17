# Observability Ownership Matrix

## Alert Ownership

| Alert ID | Primary Owner | Secondary Owner | Escalation Path | Runbook |
|---|---|---|---|---|
| `availability-warning` | `team-backend-oncall` | `team-platform-oncall` | `#incident-backend` | `docs/runbooks/rag-reliability.md` |
| `availability-critical` | `team-backend-oncall` | `team-platform-oncall` | `#incident-backend` | `docs/runbooks/rag-reliability.md` |
| `degraded-rate-warning` | `team-backend-oncall` | `team-app-oncall` | `#incident-backend` | `docs/runbooks/rag-reliability.md` |
| `degraded-rate-critical` | `team-backend-oncall` | `team-app-oncall` | `#incident-backend` | `docs/runbooks/rag-reliability.md` |
| `retry-exhaustion-warning` | `team-backend-oncall` | `team-platform-oncall` | `#incident-backend` | `docs/runbooks/rag-reliability.md` |
| `retry-exhaustion-critical` | `team-backend-oncall` | `team-platform-oncall` | `#incident-backend` | `docs/runbooks/rag-reliability.md` |
| `latency-warning` | `team-backend-oncall` | `team-platform-oncall` | `#incident-backend` | `docs/runbooks/rag-reliability.md` |
| `latency-critical` | `team-backend-oncall` | `team-platform-oncall` | `#incident-backend` | `docs/runbooks/rag-reliability.md` |

## Governance Notes

- All active alert rules must include ownership metadata before promotion.
- Severity is restricted to `warning` and `critical` only.
- Correlation is request-centric and uses `requestId` in logs and frontend telemetry.
