import { Request, Response, NextFunction } from 'express';
import { supabase } from '../services/vector-db';
import { getRequestId } from './requestId';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const requestId = getRequestId(res);
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token', requestId });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token', requestId });
    }

    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error during authentication', requestId });
  }
};
