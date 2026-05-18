import { Request, Response, NextFunction } from 'express';
import { getRequestId } from './requestId';
import { translate } from '../services/i18n';

export const adminMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const requestId = getRequestId(res);
  const user = (req as any).user;

  if (!user || user.app_metadata?.role !== 'admin') {
    return res.status(403).json({
      error: translate(req, 'admin.forbidden', 'Forbidden: Admins only'),
      requestId,
    });
  }

  next();
};
