import { Request } from 'express';

export type TranslationKey =
  | 'admin.forbidden'
  | 'auth.internal'
  | 'auth.invalid'
  | 'auth.missing'
  | 'chat.session_not_found'
  | 'internal'
  | 'not_found'
  | 'provider.temporary'
  | 'rate.authenticated'
  | 'rate.public'
  | 'validation.invalid';

type SupportedLocale = 'en' | 'es';

const catalog: Record<SupportedLocale, Record<TranslationKey, string>> = {
  en: {
    'admin.forbidden': 'Forbidden: Admins only',
    'auth.internal': 'Internal Server Error during authentication',
    'auth.invalid': 'Unauthorized: Invalid token',
    'auth.missing': 'Unauthorized: Missing or invalid token',
    'chat.session_not_found': 'Chat session not found',
    internal: 'Internal Server Error',
    not_found: 'Not Found',
    'provider.temporary': 'Provider temporarily unavailable',
    'rate.authenticated': 'Too many authenticated requests, try again later.',
    'rate.public': 'Too many requests, try again later.',
    'validation.invalid': 'Invalid request',
  },
  es: {
    'admin.forbidden': 'Prohibido: solo administradores',
    'auth.internal': 'Error interno durante autenticación',
    'auth.invalid': 'No autorizado: token inválido',
    'auth.missing': 'No autorizado: token faltante o inválido',
    'chat.session_not_found': 'Sesión de chat no encontrada',
    internal: 'Error interno del servidor',
    not_found: 'No encontrado',
    'provider.temporary': 'Proveedor temporalmente no disponible',
    'rate.authenticated': 'Demasiadas solicitudes autenticadas, intenta de nuevo mas tarde.',
    'rate.public': 'Demasiadas solicitudes, intenta de nuevo mas tarde.',
    'validation.invalid': 'Solicitud invalida',
  },
};

export function resolveLocale(req: Request): SupportedLocale | null {
  const header = req.get('Accept-Language');

  if (!header) {
    return null;
  }

  for (const entry of header.split(',')) {
    const locale = entry.trim().split(';')[0]?.toLowerCase();

    if (!locale) {
      continue;
    }

    if (locale === 'es' || locale.startsWith('es-')) {
      return 'es';
    }

    if (locale === 'en' || locale.startsWith('en-')) {
      return 'en';
    }
  }

  return null;
}

export function translate(req: Request, key: TranslationKey | undefined, fallback: string): string {
  const locale = resolveLocale(req);

  if (!locale || !key) {
    return fallback;
  }

  return catalog[locale][key] ?? fallback;
}
