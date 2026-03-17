import { Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@Injectable()
export class AppointmentsService {
    constructor(private readonly prisma: PrismaService) {}

    async confirmBooking(dto: CreateAppointmentDto) {
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
            throw new NotFoundException('Appointment id is required');
        }

        return {
            appointmentId: id,
            status: AppointmentStatus.COMPLETED,
            completedAt: dto.completedAt ?? new Date().toISOString(),
        };
    }
}
