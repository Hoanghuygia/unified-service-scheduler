import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import type { Request } from 'express';
import { RequestContextService } from '../../request-context/request-context.service';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
    constructor(private readonly requestContext: RequestContextService) {}

    intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
        if (context.getType() !== 'http') {
            return next.handle() as Observable<ApiSuccessResponse<T>>;
        }

        const request = context.switchToHttp().getRequest<Request>();

        return next.handle().pipe(
            map((data) => {
                let message: string | null = null;
                let responseData = data;

                if (data && typeof data === 'object' && 'message' in data) {
                    const { message: msg, ...rest } = data as any;
                    message = msg;
                    responseData = rest;
                }

                return {
                    success: true,
                    data: responseData,
                    message,
                    meta: {
                        timestamp: new Date().toISOString(),
                        requestId:
                            request.requestId ??
                            this.requestContext.getContext().requestId ??
                            'unknown',
                    },
                };
            }),
        );
    }
}
