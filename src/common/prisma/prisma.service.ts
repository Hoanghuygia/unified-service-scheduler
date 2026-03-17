import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
	private connected = false;

	constructor(
		private readonly logger: AppLoggerService,
		private readonly configService: ConfigService,
	) {
		super();
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
			this.logger.log('Prisma client connected');
		} catch (error) {
			if (nodeEnv === 'production') {
				this.logger.error('Prisma client failed to connect in production', error as Error);
				throw error;
			}

			this.logger.warn('Prisma client connection failed, continuing without database in non-production', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	async onModuleDestroy(): Promise<void> {
		if (!this.connected) {
			return;
		}

		await this.$disconnect();
		this.logger.log('Prisma client disconnected');
	}
}
