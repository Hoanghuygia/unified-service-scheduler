import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool, type PoolConfig } from 'pg';
import { AppLoggerService } from '../logger/logger.service';

function createPoolConfigFromUrl(rawUrl: string): PoolConfig {
    if (!rawUrl || rawUrl.trim().length === 0) {
        throw new Error('DATABASE_URL is required and must be a non-empty string');
    }

    let parsed: URL;
    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error('DATABASE_URL is not a valid URL');
    }

    const username = decodeURIComponent(parsed.username ?? '');
    const password = decodeURIComponent(parsed.password ?? '');
    const database = parsed.pathname.replace(/^\//, '');

    if (!username) {
        throw new Error('DATABASE_URL must include a database username');
    }

    if (!password) {
        throw new Error(
            'DATABASE_URL must include a non-empty password (SCRAM authentication requires a string password)',
        );
    }

    if (!database) {
        throw new Error('DATABASE_URL must include a database name');
    }

    const config: PoolConfig = {
        host: parsed.hostname,
        port: parsed.port ? Number(parsed.port) : 5432,
        user: username,
        password,
        database,
    };

    const sslMode = parsed.searchParams.get('sslmode');
    if (sslMode === 'require' || sslMode === 'no-verify') {
        config.ssl = { rejectUnauthorized: false };
    }

    return config;
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private connected = false;
    private readonly pool: Pool;

    constructor(
        private readonly logger: AppLoggerService,
        private readonly configService: ConfigService,
    ) {
        const databaseUrl =
            configService.get<string>('database.url') ?? process.env['DATABASE_URL'] ?? '';
        const pool = new Pool(createPoolConfigFromUrl(databaseUrl));
        super({ adapter: new PrismaPg(pool) });
        this.pool = pool;
    }

    async onModuleInit(): Promise<void> {
        const nodeEnv = this.configService.getOrThrow<string>('app.nodeEnv');

        if (nodeEnv === 'test') {
            this.logger.debug('Skipping Prisma connection in test environment');
            return;
        }

        try {
            await this.$connect();
            this.connected = true;
            this.logger.log('Prisma client connected to database');
        } catch (error) {
            if (nodeEnv === 'production') {
                this.logger.error('Prisma client failed to connect in production', error as Error);
                throw error;
            }

            this.logger.warn(
                'Prisma client connection failed, continuing without database in non-production',
                {
                    error: error instanceof Error ? error.message : String(error),
                },
            );
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.connected) {
            await this.$disconnect();
            this.logger.log('Prisma client disconnected from database');
        }
        await this.pool.end();
    }
}
