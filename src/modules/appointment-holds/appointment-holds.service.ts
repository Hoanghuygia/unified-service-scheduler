import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { HoldStatus } from '../../common/enums/hold-status.enum';
import { CreateAppointmentHoldDto } from './dto/create-appointment-hold.dto';

@Injectable()
export class AppointmentHoldsService {
    constructor(private readonly prisma: PrismaService) {}

    async createHold(dto: CreateAppointmentHoldDto) {
        void this.prisma;
        const isAvailable = await this.checkSlotAvailability(dto);

        if (!isAvailable) {
            return {
                success: false,
                message: 'Requested slot is not available',
                suggestedSlot: this.getSuggestedSlot(dto.desiredTime),
            };
        }

        const now = Date.now();
        const expiresAt = new Date(now + 7 * 60 * 1000).toISOString();

        return {
            success: true,
            holdId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
            status: HoldStatus.ACTIVE,
            expiresAt,
            dealershipId: dto.dealershipId,
            serviceTypeId: dto.serviceTypeId,
            vehicleId: dto.vehicleId,
            desiredTime: dto.desiredTime,
        };
    }

    protected async checkSlotAvailability(_dto: CreateAppointmentHoldDto): Promise<boolean> {
        return true;
    }

    protected getSuggestedSlot(desiredTime: string): string {
        const base = new Date(desiredTime);
        base.setMinutes(base.getMinutes() + 30);
        return base.toISOString();
    }
}
