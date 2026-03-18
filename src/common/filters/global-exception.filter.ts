import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  errorCode: string;
  requestId: string;
  timestamp: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = response<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = (request as any).requestId || 'unknown';
    const timestamp = new Date().toISOString();

    let statusCode: number;
    let message: string;
    let error: string;
    let errorCode: string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      }

      errorCode = this.mapHttpStatusToErrorCode(statusCode);
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'InternalServerError';
      errorCode = 'INTERNAL_ERROR';

      // Log the full error details for debugging
      this.logger.error(
        `Internal server error: ${exception.message}`,
        exception.stack,
        `RequestID: ${requestId}`,
      );
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'UnknownError';
      errorCode = 'UNKNOWN_ERROR';

      this.logger.error(
        `Unknown error: ${JSON.stringify(exception)}`,
        `RequestID: ${requestId}`,
      );
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      message,
      error,
      errorCode,
      requestId,
      timestamp,
    };

    // Log error with severity based on status code
    const severity = statusCode >= 500 ? 'error' : 'warn';
    this.logger[severity](
      `[${severity.toUpperCase()}] ${error}: ${message}`,
      `Status: ${statusCode}, RequestID: ${requestId}, Timestamp: ${timestamp}`,
    );

    response.status(statusCode).json(errorResponse);
  }

  private mapHttpStatusToErrorCode(statusCode: number): string {
    const errorCodeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };

    return errorCodeMap[statusCode] || `HTTP_${statusCode}`;
  }
}
