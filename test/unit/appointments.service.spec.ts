import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppointmentStatus } from '../../src/common/enums/appointment-status.enum';
import { ReservationStatus } from '../../src/common/enums/reservation-status.enum';
import { AppLoggerService } from '../../src/common/logger/logger.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';

describe('AppointmentsService', () => {
    let service: AppointmentsService;
    let prisma: {
        $transaction: jest.Mock;
        appointment: {
            create: jest.Mock;
            findFirst: jest.Mock;
            findUnique: jest.Mock;
            update: jest.Mock;
        };
        reservation: {
            findFirst: jest.Mock;
            findUnique: jest.Mock;
            update: jest.Mock;
            updateMany: jest.Mock;
        };
    };

    const createReservation = (overrides: Record<string, unknown> = {}) => ({
        id: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
        vehicleId: 'vehicle-123',
        dealershipId: 'dealership-123',
        technicianId: 'tech-123',
        serviceBayId: 'bay-123',
        startTime: new Date('2027-03-17T12:00:00.000Z'),
        endTime: new Date('2027-03-17T13:00:00.000Z'),
        expiresAt: new Date('2027-03-17T12:15:00.000Z'),
        totalDurationMinutes: 60,
        status: ReservationStatus.ACTIVE,
        appointmentId: null,
        serviceTypes: [{ serviceTypeId: 'service-type-123' }],
        ...overrides,
    });

    const createdAppointment = {
        id: 'appt-123',
        createdAt: new Date('2027-03-17T12:10:00.000Z'),
        status: AppointmentStatus.BOOKED,
    };

    beforeEach(async () => {
        const tx = {
            $executeRaw: jest.fn(),
            appointment: {
                create: jest.fn(),
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            reservation: {
                findFirst: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                updateMany: jest.fn(),
            },
        };

        prisma = {
            appointment: tx.appointment,
            reservation: tx.reservation,
            $transaction: jest.fn(
                async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
            ),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AppointmentsService,
                {
                    provide: PrismaService,
                    useValue: prisma,
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

    it('should create an appointment from an active reservation', async () => {
        prisma.reservation.findUnique.mockResolvedValue(createReservation());
        prisma.appointment.findFirst.mockResolvedValue(null);
        prisma.reservation.findFirst.mockResolvedValue(null);
        prisma.appointment.create.mockResolvedValue(createdAppointment);
        prisma.reservation.update.mockResolvedValue(undefined);

        const result = await service.confirmBooking({
            reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
        });

        expect(result).toEqual(
            expect.objectContaining({
                appointmentId: 'appt-123',
                reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                status: AppointmentStatus.BOOKED,
                confirmationResult: 'created',
            }),
        );
        expect(prisma.$transaction).toHaveBeenCalledTimes(1);
        expect(prisma.appointment.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    vehicleId: 'vehicle-123',
                    dealershipId: 'dealership-123',
                    technicianId: 'tech-123',
                    serviceBayId: 'bay-123',
                    status: AppointmentStatus.BOOKED,
                }),
            }),
        );
        expect(prisma.reservation.update).toHaveBeenCalledWith({
            where: { id: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9' },
            data: {
                status: ReservationStatus.CONVERTED,
                appointmentId: 'appt-123',
            },
        });
    });

    it('should return the existing appointment when the reservation was already confirmed', async () => {
        prisma.reservation.findUnique.mockResolvedValue(
            createReservation({
                status: ReservationStatus.CONVERTED,
                appointmentId: 'appt-123',
            }),
        );
        prisma.appointment.findUnique.mockResolvedValue(createdAppointment);

        const result = await service.confirmBooking({ reservationId: 'reservation-123' });

        expect(result).toEqual(
            expect.objectContaining({
                appointmentId: 'appt-123',
                reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                confirmationResult: 'already_confirmed',
            }),
        );
        expect(prisma.appointment.create).not.toHaveBeenCalled();
        expect(prisma.reservation.update).not.toHaveBeenCalled();
    });

    it('should throw when the reservation does not exist', async () => {
        prisma.reservation.findUnique.mockResolvedValue(null);

        await expect(
            service.confirmBooking({ reservationId: 'missing-reservation' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should throw when a conflicting booking already exists', async () => {
        prisma.reservation.findUnique.mockResolvedValue(createReservation());
        prisma.appointment.findFirst.mockResolvedValue({
            id: 'conflict-appt-123',
            technicianId: 'tech-123',
            serviceBayId: 'bay-123',
        });

        await expect(
            service.confirmBooking({ reservationId: 'reservation-123' }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(prisma.appointment.create).not.toHaveBeenCalled();
        expect(prisma.reservation.update).not.toHaveBeenCalled();
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
