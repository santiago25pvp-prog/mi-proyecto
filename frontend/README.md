# Frontend

Nuevo frontend en Next.js para el backend Express del proyecto.

## Scripts

```bash
npm install
npm run dev
npm test
```

## Estado funcional

- La sesion de Supabase se refresca cuando el token esta por expirar.
- El chat persiste transcript y seleccion activa por usuario en `localStorage`.
- Los helpers de frontend tienen tests con `node:test`.

## Variables de entorno

Usa `frontend/.env.local` con:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001
```
