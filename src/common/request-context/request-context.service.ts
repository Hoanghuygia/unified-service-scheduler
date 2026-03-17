import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContextData {
    requestId?: string;
    traceId?: string;
}

@Injectable()
export class RequestContextService {
    private readonly storage = new AsyncLocalStorage<RequestContextData>();

    run(context: RequestContextData, callback: () => void): void {
        this.storage.run(context, callback);
    }

    getContext(): RequestContextData {
        return this.storage.getStore() ?? {};
    }
}
