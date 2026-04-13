# E2E Smoke (Playwright)

Esta carpeta contiene smoke tests mínimos para reducir dependencia de QA manual.

## Cobertura inicial

- Reachability básica de `/login` y `/register`
- Navegación por teclado en formularios auth (foco en email/password)
- Estados de verificación de guards en rutas protegidas (`/chat` y `/admin`)
- Presencia de landmark `main` en superficie auth

## Ejecución local

```bash
npm run test:e2e
```

## Ejecución en CI

- El workflow `ci` ahora incluye el job `frontend-e2e-smoke`.
- Instala Chromium con Playwright y ejecuta `npm run test:e2e`.
- Si falla, sube `frontend/playwright-report/` como artifact para debugging rápido.

Nota:

- En `NODE_ENV=test`, el frontend usa fallback deterministico para env pública de Supabase en smoke tests.

## Nota

Estos tests no reemplazan completamente QA visual/manual, pero cubren regresiones frecuentes de navegación y guards.
