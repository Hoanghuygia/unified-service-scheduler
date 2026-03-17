import { Injectable } from '@nestjs/common';
import { SlotStatus } from '../../common/enums/slot-status.enum';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';

@Injectable()
export class SlotsService {
    async getSlots(query: GetSlotsQueryDto) {
        return {
            dealershipId: query.dealershipId,
            from: query.from,
            to: query.to,
            slots: [
                {
                    start: query.from,
                    end: new Date(new Date(query.from).getTime() + 30 * 60 * 1000).toISOString(),
                    status: SlotStatus.FREE,
                },
                {
                    start: new Date(new Date(query.from).getTime() + 30 * 60 * 1000).toISOString(),
                    end: new Date(new Date(query.from).getTime() + 60 * 60 * 1000).toISOString(),
                    status: SlotStatus.HELD,
                },
                {
                    start: new Date(new Date(query.from).getTime() + 60 * 60 * 1000).toISOString(),
                    end: new Date(new Date(query.from).getTime() + 90 * 60 * 1000).toISOString(),
                    status: SlotStatus.BOOKED,
                },
                {
                    start: new Date(new Date(query.from).getTime() + 90 * 60 * 1000).toISOString(),
                    end: new Date(new Date(query.from).getTime() + 120 * 60 * 1000).toISOString(),
                    status: SlotStatus.COMPLETED,
                },
            ],
        };
    }
}
