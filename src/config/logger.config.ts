export const LOGGER_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
} as const;

export const LOGGER_COLORS: Record<keyof typeof LOGGER_LEVELS, string> = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
};

export type LoggerLevel = keyof typeof LOGGER_LEVELS;

export interface LoggerMetadata {
    requestId?: string;
    traceId?: string;
    jobId?: string;
    stack?: string;
    [key: string]: unknown;
}
