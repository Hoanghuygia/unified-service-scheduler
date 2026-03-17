import { Test, TestingModule } from '@nestjs/testing';
import { AppLoggerService } from '../../src/common/logger/logger.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';

describe('AppointmentsService', () => {
    let service: AppointmentsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppointmentsService,
                {
                    provide: PrismaService,
                    useValue: {
                        appointment: {
                            create: jest.fn(),
                            update: jest.fn(),
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

        service = module.get<AppointmentsService>(AppointmentsService);
    });

    it('should confirm booking from hold', async () => {
        const result = await service.confirmBooking({
            holdId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
        });

        expect(result).toEqual(
            expect.objectContaining({
                holdId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                status: 'BOOKED',
            }),
        );
    });

    it('should mark appointment as completed', async () => {
        const result = await service.markCompleted('appt_mock_456', {
            completedAt: '2026-03-17T14:00:00.000Z',
        });

        expect(result).toEqual(
            expect.objectContaining({
                appointmentId: 'appt_mock_456',
                status: 'COMPLETED',
            }),
        );
    });
});
