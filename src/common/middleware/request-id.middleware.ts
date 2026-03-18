import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Generate unique request ID
    const requestId = randomUUID();
    
    // Attach request ID to request object
    (req as any).id = requestId;
    
    // Optionally add to response headers for client visibility
    res.setHeader('X-Request-Id', requestId);
    
    next();
  }
}
