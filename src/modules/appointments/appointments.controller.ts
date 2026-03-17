import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import { AppLoggerService } from '../../common/logger/logger.service';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
    constructor(
        private readonly appointmentsService: AppointmentsService,
        private readonly logger: AppLoggerService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({
        type: CreateAppointmentDto,
        examples: {
            confirmFromReservation: {
                summary: 'Confirm booking from reservation',
                value: {
                    reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                },
            },
        },
    })
    @ApiCreatedResponse({
        description: 'Appointment created from a valid reservation',
        schema: {
            example: {
                appointmentId: 'appt_mock_456',
                reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                status: 'BOOKED',
                bookedAt: '2026-03-17T12:10:00.000Z',
            },
        },
    })
    async create(@Body() dto: CreateAppointmentDto) {
        this.logger.debug('Received confirm booking request', { reservationId: dto.reservationId });
        return this.appointmentsService.confirmBooking(dto);
    }

    @Patch(':id')
    @HttpCode(HttpStatus.OK)
    @ApiParam({ name: 'id', example: 'appt_mock_456' })
    @ApiBody({
        type: UpdateAppointmentDto,
        examples: {
            completeAppointment: {
                summary: 'Mark completed appointment',
                value: {
                    completedAt: '2026-03-17T14:00:00.000Z',
                },
            },
        },
    })
    @ApiOkResponse({
        description: 'Appointment marked as completed',
        schema: {
            example: {
                appointmentId: 'appt_mock_456',
                status: 'COMPLETED',
                completedAt: '2026-03-17T14:00:00.000Z',
            },
        },
    })
    async update(@Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
        this.logger.debug('Received update appointment request', { appointmentId: id });
        return this.appointmentsService.markCompleted(id, dto);
    }
}
