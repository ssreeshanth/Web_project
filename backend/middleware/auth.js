import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export const authMiddleware = (req, _res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return next(new AppError('Unauthorized', 401));
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    req.user.role = req.user?.role === 'admin' || req.user?.isAdmin ? 'admin' : 'user';
    return next();
  } catch {
    return next(new AppError('Invalid token', 401));
  }
};

export const requireRole = (...allowedRoles) => (req, res, next) => {
  const role = req.user?.role === 'admin' || req.user?.isAdmin ? 'admin' : 'user';
  if (!allowedRoles.includes(role)) {
    return next(new AppError('Access denied', 403));
  }
  return next();
};

export const adminMiddleware = (req, _res, next) => {
  const role = req.user?.role === 'admin' || req.user?.isAdmin ? 'admin' : 'user';
  if (role !== 'admin') {
    return next(new AppError('Access denied', 403));
  }
  return next();
};
