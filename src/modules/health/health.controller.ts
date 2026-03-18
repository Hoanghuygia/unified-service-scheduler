import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AppLoggerService } from '../../common/logger/logger.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
    constructor(private readonly logger: AppLoggerService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({
        description: 'Health check endpoint',
        schema: {
            example: {
                success: true,
                data: {
                    status: 'ok',
                    timestamp: '2026-03-17T10:00:00.000Z',
                },
                message: null,
                meta: {
                    timestamp: '2026-03-17T10:00:00.000Z',
                    requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                },
            },
        },
    })
    getHealth() {
        this.logger.debug('Health check requested');

        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }
}
