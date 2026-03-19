import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus, ReservationStatus } from '@prisma/client';
import { AppLoggerService } from '../../common/logger/logger.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GetSlotsQueryDto } from './dto/get-slots-query.dto';

type OccupiedSlotType = 'RESERVATION' | 'APPOINTMENT';

interface OccupiedSlot {
    type: OccupiedSlotType;
    id: string;
    startTime: Date;
    endTime: Date;
    technicianId: string | null;
    serviceBayId: string | null;
}

interface PaginatedSlotsResponse {
    slots: OccupiedSlot[];
    pagination: {
        page: number;
        limit: number;
        total: number;
    };
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

@Injectable()
export class SlotsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService,
    ) {}

    async getSlots(query: GetSlotsQueryDto): Promise<PaginatedSlotsResponse> {
        const now = this.getUtcNow();
        const endTime = new Date(query.endTime);

        if (Number.isNaN(endTime.getTime())) {
            throw new BadRequestException('endTime must be a valid ISO date string');
        }

        if (endTime <= now) {
            throw new BadRequestException('endTime must be greater than current UTC time');
        }

        const page = query.page ?? DEFAULT_PAGE;
        const limit = query.limit ?? DEFAULT_LIMIT;

        this.logger.log('Fetching occupied slots for dealership', {
            dealershipId: query.dealershipId,
            startTime: now.toISOString(),
            endTime: endTime.toISOString(),
            page,
            limit,
            technicianId: query.technicianId,
            serviceBayId: query.serviceBayId,
        });

        const dealership = await this.prisma.dealership.findUnique({
            where: { id: query.dealershipId },
            select: { id: true },
        });

        if (!dealership) {
            throw new NotFoundException(`Dealership ${query.dealershipId} not found`);
        }

        const overlapFilter = {
            startTime: { lt: endTime },
            endTime: { gt: now },
        };

        const resourceFilter = {
            ...(query.technicianId ? { technicianId: query.technicianId } : {}),
            ...(query.serviceBayId ? { serviceBayId: query.serviceBayId } : {}),
        };

        const selectFields = {
            id: true,
            startTime: true,
            endTime: true,
            technicianId: true,
            serviceBayId: true,
        };

        const [activeReservations, bookedAppointments] = await this.prisma.$transaction([
            this.prisma.reservation.findMany({
                where: {
                    dealershipId: query.dealershipId,
                    status: ReservationStatus.ACTIVE,
                    expiresAt: { gt: now },
                    ...overlapFilter,
                    ...resourceFilter,
                },
                select: selectFields,
            }),
            this.prisma.appointment.findMany({
                where: {
                    dealershipId: query.dealershipId,
                    status: AppointmentStatus.BOOKED,
                    ...overlapFilter,
                    ...resourceFilter,
                },
                select: selectFields,
            }),
        ]);

        const mergedSlots: OccupiedSlot[] = [
            ...activeReservations.map((reservation) => ({
                type: 'RESERVATION' as const,
                id: reservation.id,
                startTime: reservation.startTime,
                endTime: reservation.endTime,
                technicianId: reservation.technicianId,
                serviceBayId: reservation.serviceBayId,
            })),
            ...bookedAppointments.map((appointment) => ({
                type: 'APPOINTMENT' as const,
                id: appointment.id,
                startTime: appointment.startTime,
                endTime: appointment.endTime,
                technicianId: appointment.technicianId,
                serviceBayId: appointment.serviceBayId,
            })),
        ].sort((left, right) => left.startTime.getTime() - right.startTime.getTime());

        const total = mergedSlots.length;
        const offset = (page - 1) * limit;
        const slots = mergedSlots.slice(offset, offset + limit);

        this.logger.log('Occupied slots fetched', {
            dealershipId: query.dealershipId,
            startTime: now.toISOString(),
            endTime: endTime.toISOString(),
            total,
            slotsReturned: slots.length,
            page,
            limit,
            technicianId: query.technicianId,
            serviceBayId: query.serviceBayId,
        });

        return {
            slots,
            pagination: {
                page,
                limit,
                total,
            },
        };
    }

    async runAvailabilityRefreshJob(jobId: string): Promise<void> {
        this.logger.log('Processing job', {
            jobId,
            traceId: jobId,
        });
    }

    private getUtcNow(): Date {
        return new Date();
    }
}
