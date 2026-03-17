import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '../../src/common/logger/logger.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { AppointmentHoldsService } from '../../src/modules/appointment-holds/appointment-holds.service';

describe('AppointmentHoldsService', () => {
    let service: AppointmentHoldsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppointmentHoldsService,
                {
                    provide: PrismaService,
                    useValue: {
                        appointmentHold: {
                            create: jest.fn(),
                        },
                    },
                },
                {
                    provide: AppLoggerService,
                    useValue: {
                        log: jest.fn(),
                        warn: jest.fn(),
                        error: jest.fn(),
                        debug: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<AppointmentHoldsService>(AppointmentHoldsService);
    });

    it('should create a hold when slot is available (mocked)', async () => {
        jest.spyOn(service as any, 'checkSlotAvailability').mockResolvedValueOnce(true);

        const result = await service.createHold({
            vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
            serviceTypeId: '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0',
            dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
            desiredTime: '2026-03-17T12:00:00.000Z',
        });

        expect(result.success).toBe(true);
        expect(result).toHaveProperty('holdId');
        expect(result).toHaveProperty('expiresAt');
    });

    it('should return suggested slot when unavailable', async () => {
        jest.spyOn(service as any, 'checkSlotAvailability').mockResolvedValueOnce(false);

        const result = await service.createHold({
            vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
            serviceTypeId: '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0',
            dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
            desiredTime: '2026-03-17T12:00:00.000Z',
        });

        expect(result.success).toBe(false);
        expect(result).toHaveProperty('suggestedSlot');
    });
});
