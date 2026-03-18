import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AppLoggerService } from '../../common/logger/logger.service';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';
import { SlotsService } from './slots.service';

@ApiTags('slots')
@Controller('slots')
export class SlotsController {
    constructor(
        private readonly slotsService: SlotsService,
        private readonly logger: AppLoggerService,
    ) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiQuery({ name: 'dealershipId', required: true })
    @ApiQuery({ name: 'from', required: true })
    @ApiQuery({ name: 'to', required: true })
    @ApiOkResponse({
        description: 'Returns list of slots with statuses',
        schema: {
            example: {
                success: true,
                data: {
                    dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                    from: '2026-03-17T08:00:00.000Z',
                    to: '2026-03-17T18:00:00.000Z',
                    slots: [
                        {
                            start: '2026-03-17T08:00:00.000Z',
                            end: '2026-03-17T08:30:00.000Z',
                            status: 'FREE',
                        },
                        {
                            start: '2026-03-17T08:30:00.000Z',
                            end: '2026-03-17T09:00:00.000Z',
                            status: 'HELD',
                        },
                        {
                            start: '2026-03-17T09:00:00.000Z',
                            end: '2026-03-17T09:30:00.000Z',
                            status: 'BOOKED',
                        },
                        {
                            start: '2026-03-17T09:30:00.000Z',
                            end: '2026-03-17T10:00:00.000Z',
                            status: 'COMPLETED',
                        },
                    ],
                },
                message: null,
                meta: {
                    timestamp: '2026-03-17T10:00:00.000Z',
                    requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                },
            },
        },
    })
    async findAll(@Query() query: GetSlotsQueryDto) {
        this.logger.debug('Received get slots request', {
            dealershipId: query.dealershipId,
            from: query.from,
            to: query.to,
        });

        return this.slotsService.getSlots(query);
    }
}
