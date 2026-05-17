import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { JWT_SECRET } from './config.js';

export interface AuthRequest extends Request {
  user?: any;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];
  
  const debugInfo: any = {
    path: req.path,
    hasCookies: !!req.cookies,
    hasToken: !!req.cookies?.token,
  };

  if (!token) {
    console.log("[AUTH DEBUG] 401 Missing Token", debugInfo);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    debugInfo.decodedUserId = req.user.id || req.user.userId;
    debugInfo.decodedRole = req.user.role;
    console.log("[AUTH DEBUG] Valid", debugInfo);
    next();
  } catch (err) {
    console.log("[AUTH DEBUG] 401 Invalid Token", debugInfo);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function roleMiddleware(roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
