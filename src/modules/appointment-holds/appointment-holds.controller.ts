import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AppLoggerService } from '../../common/logger/logger.service';
import { AppointmentHoldsService } from './appointment-holds.service';
import { CreateAppointmentHoldDto } from './dto/create-appointment-hold.dto';

@ApiTags('appointment-holds')
@Controller('appointment-holds')
export class AppointmentHoldsController {
    constructor(
        private readonly appointmentHoldsService: AppointmentHoldsService,
        private readonly logger: AppLoggerService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiBody({
        type: CreateAppointmentHoldDto,
        examples: {
            default: {
                summary: 'Create appointment hold',
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
        description: 'Hold created or suggestion returned when unavailable',
        schema: {
            examples: {
                holdCreated: {
                    value: {
                        success: true,
                        holdId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                        status: 'ACTIVE',
                        expiresAt: '2026-03-17T12:07:00.000Z',
                        dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                        serviceTypeId: '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0',
                        vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
                        desiredTime: '2026-03-17T12:00:00.000Z',
                    },
                },
                suggestedSlot: {
                    value: {
                        success: false,
                        message: 'Requested slot is not available',
                        suggestedSlot: '2026-03-17T12:30:00.000Z',
                    },
                },
            },
        },
    })
    async create(@Body() dto: CreateAppointmentHoldDto) {
        this.logger.debug('Received create appointment hold request', {
            dealershipId: dto.dealershipId,
            desiredTime: dto.desiredTime,
        });

        return this.appointmentHoldsService.createHold(dto);
    }
}
