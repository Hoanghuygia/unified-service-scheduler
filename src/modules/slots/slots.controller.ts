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
    @ApiQuery({ name: 'endTime', required: true })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'technicianId', required: false })
    @ApiQuery({ name: 'serviceBayId', required: false })
    @ApiOkResponse({
        description: 'Returns occupied slots from now until endTime',
        schema: {
            example: {
                success: true,
                data: {
                    slots: [
                        {
                            type: 'RESERVATION',
                            id: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                            startTime: '2026-03-17T12:00:00.000Z',
                            endTime: '2026-03-17T13:00:00.000Z',
                            technicianId: '1ce6c8d6-6309-49ea-a0b7-24855e0d7f39',
                            serviceBayId: '59e82402-1c7f-4477-8f1a-a07f938ac8f8',
                        },
                    ],
                    pagination: {
                        page: 1,
                        limit: 20,
                        total: 1,
                    },
                },
                message: null,
                meta: {
                    timestamp: '2026-03-17T10:00:00.000Z',
                    requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                },
            },
        },
    })
    async findAll(@Query() query: GetSlotsQueryDto): Promise<unknown> {
        this.logger.debug('Received get slots request', {
            dealershipId: query.dealershipId,
            endTime: query.endTime,
            page: query.page,
            limit: query.limit,
            technicianId: query.technicianId,
            serviceBayId: query.serviceBayId,
        });

        return this.slotsService.getSlots(query);
    }
}
