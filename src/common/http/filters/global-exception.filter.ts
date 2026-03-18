import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppLoggerService } from '../../logger/logger.service';
import { RequestContextService } from '../../request-context/request-context.service';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
    constructor(
        private readonly logger: AppLoggerService,
        private readonly requestContext: RequestContextService,
    ) {}

    catch(exception: unknown, host: ArgumentsHost): void {
        const context = host.switchToHttp();
        const response = context.getResponse<Response>();
        const request = context.getRequest<Request>();

        const statusCode = this.resolveStatusCode(exception);
        const errorBody = this.resolveErrorBody(exception, statusCode);
        const requestId =
            request.requestId ?? this.requestContext.getContext().requestId ?? 'unknown';

        this.logger.error('Request failed', exception instanceof Error ? exception : undefined, {
            method: request.method,
            path: request.originalUrl,
            statusCode,
            requestId,
            errorCode: errorBody.code,
        });

        const payload: ApiErrorResponse = {
            success: false,
            error: errorBody,
            meta: {
                timestamp: new Date().toISOString(),
                requestId,
            },
        };

        response.status(statusCode).json(payload);
    }

    private resolveStatusCode(exception: unknown): number {
        if (exception instanceof HttpException) {
            return exception.getStatus();
        }

        return HttpStatus.INTERNAL_SERVER_ERROR;
    }

    private resolveErrorBody(exception: unknown, statusCode: number) {
        if (exception instanceof HttpException) {
            const response = exception.getResponse();
            const baseMessage = exception.message || 'Request failed';

            if (typeof response === 'string') {
                return {
                    code: this.mapStatusToCode(statusCode),
                    message: response,
                    details: {},
                };
            }

            if (typeof response === 'object' && response !== null) {
                const responseObject = response as Record<string, unknown>;
                const message = this.extractMessage(responseObject, baseMessage);

                const details = this.extractDetails(responseObject);
                return {
                    code: this.extractErrorCode(responseObject, statusCode),
                    message,
                    details,
                };
            }

            return {
                code: this.mapStatusToCode(statusCode),
                message: baseMessage,
                details: {},
            };
        }

        if (exception instanceof Error) {
            return {
                code: 'INTERNAL_ERROR',
                message: exception.message || 'Internal server error',
                details: {},
            };
        }

        return {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            details: {},
        };
    }

    private extractMessage(responseObject: Record<string, unknown>, fallback: string): string {
        const value = responseObject.message;

        if (typeof value === 'string') {
            return value;
        }

        if (Array.isArray(value) && value.length > 0) {
            const first = value[0];
            return typeof first === 'string' ? first : fallback;
        }

        return fallback;
    }

    private extractDetails(responseObject: Record<string, unknown>): Record<string, unknown> {
        const details = { ...responseObject };
        delete details.message;
        delete details.statusCode;
        delete details.error;
        delete details.code;

        if (Array.isArray(responseObject.message)) {
            details.validationErrors = responseObject.message;
        }

        return details;
    }

    private extractErrorCode(responseObject: Record<string, unknown>, statusCode: number): string {
        if (typeof responseObject.code === 'string' && responseObject.code.length > 0) {
            return responseObject.code;
        }

        if (typeof responseObject.error === 'string' && responseObject.error.length > 0) {
            return responseObject.error
                .trim()
                .toUpperCase()
                .replace(/[^A-Z0-9]+/g, '_');
        }

        return this.mapStatusToCode(statusCode);
    }

    private mapStatusToCode(statusCode: number): string {
        return HttpStatus[statusCode] ?? 'HTTP_ERROR';
    }
}
