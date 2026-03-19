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
import { ReservationsService } from './reservations.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

@ApiTags('reservations')
@Controller('reservations')
export class ReservationsController {
    constructor(
        private readonly reservationsService: ReservationsService,
        private readonly logger: AppLoggerService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({
        type: CreateReservationDto,
        examples: {
            default: {
                summary: 'Create reservation',
                value: {
                    vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
                    serviceTypeIds: ['4c4f1960-a95b-4e60-b45f-e58bde8d0ec0'],
                    dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                    desiredTime: '2026-03-17T12:00:00.000Z',
                },
            },
            multipleServices: {
                summary: 'Create reservation with multiple service types',
                value: {
                    vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
                    serviceTypeIds: [
                        '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0',
                        '9d1a2b3c-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
                    ],
                    dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                    desiredTime: '2026-03-17T12:00:00.000Z',
                },
            },
        },
    })
    @ApiCreatedResponse({
        description: 'Reservation created, or recommendations returned when unavailable',
        schema: {
            examples: {
                reservationCreated: {
                    summary: 'Desired slot was available',
                    value: {
                        success: true,
                        data: {
                            isAvailable: true,
                            reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                            startTime: '2026-03-17T12:00:00.000Z',
                            endTime: '2026-03-17T13:00:00.000Z',
                            expiresAt: '2026-03-17T12:15:00.000Z',
                        },
                        message: null,
                        meta: {
                            timestamp: '2026-03-17T12:00:00.000Z',
                            requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                        },
                    },
                },
                recommendations: {
                    summary: 'Desired slot unavailable — alternatives offered + first auto-held',
                    value: {
                        success: true,
                        data: {
                            isAvailable: false,
                            reason: 'Requested slot is not available',
                            recommendations: [
                                {
                                    startTime: '2026-03-17T12:15:00.000Z',
                                    endTime: '2026-03-17T13:15:00.000Z',
                                },
                                {
                                    startTime: '2026-03-17T12:30:00.000Z',
                                    endTime: '2026-03-17T13:30:00.000Z',
                                },
                                {
                                    startTime: '2026-03-17T12:45:00.000Z',
                                    endTime: '2026-03-17T13:45:00.000Z',
                                },
                            ],
                            heldRecommendation: {
                                reservationId: 'e1a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                                startTime: '2026-03-17T12:15:00.000Z',
                                endTime: '2026-03-17T13:15:00.000Z',
                                expiresAt: '2026-03-17T12:05:00.000Z',
                            },
                        },
                        message: null,
                        meta: {
                            timestamp: '2026-03-17T12:00:00.000Z',
                            requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                        },
                    },
                },
            },
        },
    })
    @ApiNotFoundResponse({ description: 'Dealership or ServiceType not found' })
    async create(@Body() dto: CreateReservationDto): Promise<unknown> {
        this.logger.debug('Received create reservation request', {
            dealershipId: dto.dealershipId,
            desiredTime: dto.desiredTime,
            serviceTypeCount: dto.serviceTypeIds.length,
        });

        return this.reservationsService.createReservation(dto);
    }

    @Patch(':reservationId/cancel')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel reservation' })
    @ApiParam({
        name: 'reservationId',
        description: 'Reservation id',
        example: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
    })
    @ApiOkResponse({
        description: 'Reservation cancelled successfully',
        schema: {
            example: {
                success: true,
                data: {
                    id: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                    vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
                    desiredTime: '2026-03-17T12:00:00.000Z',
                    startTime: '2026-03-17T12:15:00.000Z',
                    endTime: '2026-03-17T13:15:00.000Z',
                    expiresAt: '2026-03-17T12:02:00.000Z',
                    totalDurationMinutes: 60,
                    status: 'EXPIRED',
                    dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                    technicianId: '1ce6c8d6-6309-49ea-a0b7-24855e0d7f39',
                    serviceBayId: '59e82402-1c7f-4477-8f1a-a07f938ac8f8',
                    appointmentId: null,
                    createdAt: '2026-03-17T11:59:30.000Z',
                    updatedAt: '2026-03-17T12:02:00.000Z',
                },
                message: 'Reservation cancelled successfully',
                meta: {
                    timestamp: '2026-03-17T12:02:00.000Z',
                    requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                },
            },
        },
    })
    @ApiBadRequestResponse({ description: 'Cannot cancel non-active reservation' })
    @ApiNotFoundResponse({ description: 'Reservation not found' })
    async cancel(@Param('reservationId') reservationId: string): Promise<unknown> {
        this.logger.debug('Received cancel reservation request', {
            reservationId,
            action: 'cancel reservation',
        });

        return this.reservationsService.cancelReservation(reservationId);
    }
}
