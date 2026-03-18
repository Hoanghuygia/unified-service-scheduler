import { INQUIRER } from '@nestjs/core';
import { Inject, Injectable, Scope } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import type { LoggerMetadata } from '../../config/logger.config';
import { RequestContextService } from '../request-context/request-context.service';

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService {
    private readonly contextName: string;

    constructor(
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
        private readonly requestContext: RequestContextService,
        @Inject(INQUIRER) private readonly parentClass?: object,
    ) {
        this.contextName = this.parentClass?.constructor?.name ?? 'Application';
    }

    log(message: string, metadata: LoggerMetadata = {}): void {
        this.write('info', message, metadata);
    }

    debug(message: string, metadata: LoggerMetadata = {}): void {
        this.write('debug', message, metadata);
    }

    warn(message: string, metadata: LoggerMetadata = {}): void {
        this.write('warn', message, metadata);
    }

    error(
        message: string,
        errorOrMetadata?: Error | LoggerMetadata,
        metadata: LoggerMetadata = {},
    ): void {
        if (errorOrMetadata instanceof Error) {
            this.write('error', message, {
                ...metadata,
                errorName: errorOrMetadata.name,
                stack: errorOrMetadata.stack,
            });
            return;
        }

        this.write('error', message, errorOrMetadata ?? {});
    }

    private write(
        level: 'info' | 'warn' | 'error' | 'debug',
        message: string,
        metadata: LoggerMetadata,
    ): void {
        const context = this.requestContext.getContext();

        this.logger.log(level, message, {
            context: this.contextName,
            ...context,
            ...metadata,
        });
    }
}
