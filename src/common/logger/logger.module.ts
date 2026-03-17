import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import { addColors, format, transports } from 'winston';
import {
    LOGGER_COLORS,
    LOGGER_LEVELS,
    type LoggerLevel,
} from '../../config/logger.config';
import { RequestContextService } from '../request-context/request-context.service';
import { AppLoggerService } from './logger.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

const { combine, timestamp, errors, colorize, printf, json } = format;

addColors(LOGGER_COLORS);

@Global()
@Module({
    imports: [
        WinstonModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const nodeEnv = configService.getOrThrow<string>('app.nodeEnv');
                const isProduction = nodeEnv === 'production';
                const level = configService.getOrThrow<LoggerLevel>('logger.level');

                const developmentFormat = combine(
                    colorize({ all: true }),
                    timestamp(),
                    errors({ stack: true }),
                    printf(({ level: logLevel, message, timestamp: logTimestamp, context, ...meta }) => {
                        const metadata = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
                        return `[${logTimestamp}] [${logLevel}] [${context ?? 'Application'}] ${message}${metadata}`;
                    }),
                );

                return {
                    levels: LOGGER_LEVELS,
                    level,
                    transports: [
                        new transports.Console({
                            format: isProduction
                                ? combine(timestamp(), errors({ stack: true }), json())
                                : developmentFormat,
                        }),
                    ],
                };
            },
        }),
    ],
    providers: [RequestContextService, AppLoggerService, RequestLoggingInterceptor],
    exports: [WinstonModule, RequestContextService, AppLoggerService, RequestLoggingInterceptor],
})
export class LoggerModule {}
