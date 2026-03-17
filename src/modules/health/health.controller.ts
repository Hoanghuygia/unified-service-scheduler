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
                status: 'ok',
                timestamp: '2026-03-17T10:00:00.000Z',
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
