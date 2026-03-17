import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { AppLoggerService } from '../../common/logger/logger.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService,
    ) {}

    async confirmBooking(dto: CreateAppointmentDto) {
        this.logger.log('Confirming appointment booking from hold', {
            holdId: dto.holdId,
        });

        void this.prisma;

        return {
            appointmentId: 'appt_mock_456',
            holdId: dto.holdId,
            status: AppointmentStatus.BOOKED,
            bookedAt: new Date().toISOString(),
        };
    }

    async markCompleted(id: string, dto: UpdateAppointmentDto) {
        if (!id) {
            this.logger.warn('Appointment completion failed due to missing id');
            throw new NotFoundException('Appointment id is required');
        }

        this.logger.log('Marking appointment as completed', {
            appointmentId: id,
            completedAt: dto.completedAt,
        });

        return {
            appointmentId: id,
            status: AppointmentStatus.COMPLETED,
            completedAt: dto.completedAt ?? new Date().toISOString(),
        };
    }
}
