import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import type { Request, Response } from 'express';
import { AppLoggerService } from './logger.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
    constructor(private readonly logger: AppLoggerService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const httpContext = context.switchToHttp();
        const request = httpContext.getRequest<Request>();
        const response = httpContext.getResponse<Response>();
        const startedAt = Date.now();

        this.logger.log('Incoming request', {
            method: request.method,
            path: request.originalUrl,
        });

        return next.handle().pipe(
            tap(() => {
                this.logger.log('Request completed', {
                    method: request.method,
                    path: request.originalUrl,
                    statusCode: response.statusCode,
                    durationMs: Date.now() - startedAt,
                });
            }),
            catchError((error: Error) => {
                this.logger.error('Request failed', error, {
                    method: request.method,
                    path: request.originalUrl,
                    statusCode: response.statusCode,
                    durationMs: Date.now() - startedAt,
                });

                return throwError(() => error);
            }),
        );
    }
}
