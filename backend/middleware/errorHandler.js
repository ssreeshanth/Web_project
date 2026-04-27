import { AppError } from '../utils/errors.js';

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || 500;
  const message =
    err instanceof SyntaxError && err.status === 400
      ? 'Invalid JSON payload'
      : (err.message || 'Internal server error');

  res.status(statusCode).json({
    success: false,
    message,
  });
};
