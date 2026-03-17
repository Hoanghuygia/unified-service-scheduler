import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
    constructor(private readonly requestContext: RequestContextService) {}

    use(req: Request, res: Response, next: NextFunction): void {
        const headerRequestId = req.headers['x-request-id'];
        const requestId = typeof headerRequestId === 'string' ? headerRequestId : randomUUID();

        res.setHeader('x-request-id', requestId);

        this.requestContext.run({ requestId, traceId: requestId }, () => {
            next();
        });
    }
}
