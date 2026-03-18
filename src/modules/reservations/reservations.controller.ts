import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
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
                    serviceTypeId: '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0',
                    dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                    desiredTime: '2026-03-17T12:00:00.000Z',
                },
            },
        },
    })
    @ApiCreatedResponse({
        description: 'Reservation created or suggestion returned when unavailable',
        schema: {
            examples: {
                reservationCreated: {
                    value: {
                        success: true,
                        data: {
                            isAvailable: true,
                            reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                            status: 'ACTIVE',
                            expiresAt: '2026-03-17T12:07:00.000Z',
                            dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                            serviceTypeId: '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0',
                            vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
                            desiredTime: '2026-03-17T12:00:00.000Z',
                        },
                        message: null,
                        meta: {
                            timestamp: '2026-03-17T12:00:00.000Z',
                            requestId: '3e6c28f9-8309-4e39-b128-4f7918589144',
                        },
                    },
                },
                suggestedSlot: {
                    value: {
                        success: true,
                        data: {
                            isAvailable: false,
                            reason: 'Requested slot is not available',
                            suggestedSlot: '2026-03-17T12:30:00.000Z',
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
    async create(@Body() dto: CreateReservationDto) {
        this.logger.debug('Received create reservation request', {
            dealershipId: dto.dealershipId,
            desiredTime: dto.desiredTime,
        });

        return this.reservationsService.createReservation(dto);
    }
}
