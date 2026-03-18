import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate a unique request ID
    const requestId = randomUUID();

    // Attach request ID to the request object
    (req as any).requestId = requestId;

    // Optionally add request ID to response headers for client tracking
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
