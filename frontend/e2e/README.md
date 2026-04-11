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

## Nota

Estos tests no reemplazan completamente QA visual/manual, pero cubren regresiones frecuentes de navegación y guards.
