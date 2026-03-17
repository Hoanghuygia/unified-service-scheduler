import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';
import { SlotsService } from './slots.service';

@ApiTags('slots')
@Controller('slots')
export class SlotsController {
    constructor(private readonly slotsService: SlotsService) {}

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiQuery({ name: 'dealershipId', required: true })
    @ApiQuery({ name: 'from', required: true })
    @ApiQuery({ name: 'to', required: true })
    @ApiOkResponse({
        description: 'Returns list of slots with statuses',
        schema: {
            example: {
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
        },
    })
    async findAll(@Query() query: GetSlotsQueryDto) {
        return this.slotsService.getSlots(query);
    }
}
