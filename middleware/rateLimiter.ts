import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { getRequestId } from './requestId';
import { translate, TranslationKey } from '../services/i18n';

function buildLimitHandler(message: string, translationKey: TranslationKey) {
	return (req: Request, res: Response) => {
		res.status(429).json({
			error: translate(req, translationKey, message),
			requestId: getRequestId(res),
		});
	};
}

// Limitador público por IP: 100 req/hora
export const publicLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hora
	max: 100,
	message: 'Demasiadas solicitudes, intentá de nuevo más tarde.',
	handler: buildLimitHandler('Demasiadas solicitudes, intentá de nuevo más tarde.', 'rate.public'),
	standardHeaders: true,
	legacyHeaders: false,
});

// Limitador autenticado por ID de usuario: 50 req/hora
export const authLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hora
	max: 50,
	keyGenerator: (req: any, res: any) => req.user?.id || ipKeyGenerator(req, res),
	message: 'Demasiadas solicitudes autenticadas, intentá de nuevo más tarde.',
	handler: buildLimitHandler('Demasiadas solicitudes autenticadas, intentá de nuevo más tarde.', 'rate.authenticated'),
	standardHeaders: true,
	legacyHeaders: false,
});
