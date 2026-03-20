import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
    ApiBadRequestResponse,
    ApiBody,
    ApiCreatedResponse,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiTags,
} from '@nestjs/swagger';
import { AppLoggerService } from '../../common/logger/logger.service';
import { AppointmentsService } from './appointments.service';
import { AppointmentIdParamDto } from './dto/appointment-id-param.dto';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
    constructor(
        private readonly appointmentsService: AppointmentsService,
        private readonly logger: AppLoggerService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Confirm a reservation and create a final appointment' })
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
                success: true,
                data: {
                    appointmentId: 'appt_mock_456',
                    reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                    status: 'BOOKED',
                    bookedAt: '2026-03-17T12:10:00.000Z',
                    confirmationResult: 'created',
                },
                message: 'Appointment booked successfully',
                meta: {
                    timestamp: '2026-03-17T12:10:00.000Z',
                    requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                },
            },
        },
    })
    @ApiBadRequestResponse({
        description:
            'Reservation is expired, unavailable, not active, or missing assigned resources',
    })
    @ApiNotFoundResponse({ description: 'Reservation not found' })
    async create(@Body() dto: CreateAppointmentDto): Promise<unknown> {
        this.logger.debug('Received confirm booking request', { reservationId: dto.reservationId });
        return this.appointmentsService.confirmBooking(dto);
    }

    @Patch(':id/complete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark appointment as completed' })
    @ApiParam({ name: 'id', example: 'appt_mock_456' })
    @ApiOkResponse({
        description: 'Appointment marked as completed',
        schema: {
            example: {
                success: true,
                data: {
                    appointmentId: 'appt_mock_456',
                    status: 'COMPLETED',
                },
                message: 'Appointment marked as completed',
                meta: {
                    timestamp: '2026-03-17T14:00:00.000Z',
                    requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                },
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'Appointment cannot be completed in the current state or before start time',
    })
    @ApiNotFoundResponse({ description: 'Appointment not found' })
    async completeAppointment(@Param() params: AppointmentIdParamDto): Promise<unknown> {
        this.logger.debug('Received complete appointment request', { appointmentId: params.id });
        return this.appointmentsService.completeAppointment(params.id);
    }

    @Patch(':id/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel appointment' })
    @ApiParam({ name: 'id', example: 'appt_mock_456' })
    @ApiOkResponse({
        description: 'Appointment cancelled',
        schema: {
            example: {
                success: true,
                data: {
                    appointmentId: 'appt_mock_456',
                    status: 'CANCELLED',
                },
                message: 'Appointment cancelled successfully',
                meta: {
                    timestamp: '2026-03-17T10:00:00.000Z',
                    requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                },
            },
        },
    })
    @ApiBadRequestResponse({
        description: 'Appointment cannot be cancelled due to state or 24-hour rule.',
    })
    @ApiNotFoundResponse({ description: 'Appointment not found' })
    async cancelAppointment(@Param() params: AppointmentIdParamDto): Promise<unknown> {
        this.logger.debug('Received cancel appointment request', { appointmentId: params.id });
        return this.appointmentsService.cancelAppointment(params.id);
    }
}
