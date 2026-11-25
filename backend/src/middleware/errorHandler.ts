import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
}
