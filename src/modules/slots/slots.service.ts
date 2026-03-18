import { Injectable } from '@nestjs/common';
import { AppLoggerService } from '../../common/logger/logger.service';
import { SlotStatus } from '../../common/enums/slot-status.enum';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';

@Injectable()
export class SlotsService {
    constructor(private readonly logger: AppLoggerService) {}

    async getSlots(query: GetSlotsQueryDto) {
        this.logger.log('Fetching slots for dealership', {
            dealershipId: query.dealershipId,
            from: query.from,
            to: query.to,
        });

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

    async runAvailabilityRefreshJob(jobId: string): Promise<void> {
        this.logger.log('Processing job', {
            jobId,
            traceId: jobId,
        });
    }
}
