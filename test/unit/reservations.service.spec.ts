import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReservationStatus } from '../../src/common/enums/reservation-status.enum';
import { AppLoggerService } from '../../src/common/logger/logger.service';
import { PrismaService } from '../../src/common/prisma/prisma.service';
import { ReservationsService } from '../../src/modules/reservations/reservations.service';

const DEALERSHIP_ID = '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f';
const SERVICE_TYPE_ID = '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0';
const VEHICLE_ID = 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6';

const baseDto = {
    vehicleId: VEHICLE_ID,
    serviceTypeIds: [SERVICE_TYPE_ID],
    dealershipId: DEALERSHIP_ID,
    desiredTime: '2026-03-20T12:00:00.000Z',
};

describe('ReservationsService', () => {
    let service: ReservationsService;
    let prismaMock: {
        dealership: { findUnique: jest.Mock };
        reservation: { findUnique: jest.Mock; update: jest.Mock };
        serviceType: { findMany: jest.Mock };
        $transaction: jest.Mock;
    };

    beforeEach(async () => {
        prismaMock = {
            dealership: { findUnique: jest.fn() },
            reservation: { findUnique: jest.fn(), update: jest.fn() },
            serviceType: { findMany: jest.fn() },
            $transaction: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReservationsService,
                { provide: PrismaService, useValue: prismaMock },
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

        service = module.get<ReservationsService>(ReservationsService);
    });

    describe('input validation', () => {
        it('should throw NotFoundException when dealership is not found', async () => {
            prismaMock.dealership.findUnique.mockResolvedValueOnce(null);
            prismaMock.serviceType.findMany.mockResolvedValueOnce([
                { id: SERVICE_TYPE_ID, durationMinutes: 60 },
            ]);

            await expect(service.createReservation(baseDto)).rejects.toThrow(NotFoundException);
            expect(prismaMock.$transaction).not.toHaveBeenCalled();
        });

        it('should throw NotFoundException when a serviceType is not found', async () => {
            prismaMock.dealership.findUnique.mockResolvedValueOnce({ id: DEALERSHIP_ID });
            // Returns fewer records than requested
            prismaMock.serviceType.findMany.mockResolvedValueOnce([]);

            await expect(service.createReservation(baseDto)).rejects.toThrow(NotFoundException);
            expect(prismaMock.$transaction).not.toHaveBeenCalled();
        });
    });

    describe('cancelReservation', () => {
        const reservationId = 'res-uuid-123';

        it('should throw NotFoundException when reservation is not found', async () => {
            prismaMock.$transaction.mockImplementationOnce(async (callback) =>
                callback({ reservation: prismaMock.reservation }),
            );
            prismaMock.reservation.findUnique.mockResolvedValueOnce(null);

            await expect(service.cancelReservation(reservationId)).rejects.toThrow(
                NotFoundException,
            );

            expect(prismaMock.reservation.findUnique).toHaveBeenCalledWith({
                where: { id: reservationId },
            });
            expect(prismaMock.reservation.update).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException when reservation is not active', async () => {
            prismaMock.$transaction.mockImplementationOnce(async (callback) =>
                callback({ reservation: prismaMock.reservation }),
            );
            prismaMock.reservation.findUnique.mockResolvedValueOnce({
                id: reservationId,
                status: ReservationStatus.CONVERTED,
            });

            await expect(service.cancelReservation(reservationId)).rejects.toThrow(
                BadRequestException,
            );

            expect(prismaMock.reservation.update).not.toHaveBeenCalled();
        });

        it('should expire an active reservation and return the updated record', async () => {
            const updatedReservation = {
                id: reservationId,
                vehicleId: VEHICLE_ID,
                desiredTime: new Date('2026-03-20T12:00:00.000Z'),
                startTime: new Date('2026-03-20T12:00:00.000Z'),
                endTime: new Date('2026-03-20T13:00:00.000Z'),
                expiresAt: new Date('2026-03-20T11:05:00.000Z'),
                totalDurationMinutes: 60,
                status: ReservationStatus.EXPIRED,
                dealershipId: DEALERSHIP_ID,
                technicianId: 'tech-123',
                serviceBayId: 'bay-123',
                appointmentId: null,
                createdAt: new Date('2026-03-20T10:00:00.000Z'),
                updatedAt: new Date('2026-03-20T11:05:00.000Z'),
            };

            prismaMock.$transaction.mockImplementationOnce(async (callback) =>
                callback({ reservation: prismaMock.reservation }),
            );
            prismaMock.reservation.findUnique.mockResolvedValueOnce({
                id: reservationId,
                status: ReservationStatus.ACTIVE,
            });
            prismaMock.reservation.update.mockResolvedValueOnce(updatedReservation);

            const result = await service.cancelReservation(reservationId);

            expect(prismaMock.reservation.update).toHaveBeenCalledWith({
                where: { id: reservationId },
                data: {
                    status: ReservationStatus.EXPIRED,
                    expiresAt: expect.any(Date),
                },
            });
            expect(result).toEqual({
                message: 'Reservation cancelled successfully',
                ...updatedReservation,
            });
        });
    });

    describe('happy path', () => {
        it('should return reservation details when desired slot is available', async () => {
            prismaMock.dealership.findUnique.mockResolvedValueOnce({ id: DEALERSHIP_ID });
            prismaMock.serviceType.findMany.mockResolvedValueOnce([
                { id: SERVICE_TYPE_ID, durationMinutes: 60 },
            ]);

            const txResult = {
                isAvailable: true,
                reservationId: 'res-uuid-123',
                startTime: new Date('2026-03-20T12:00:00.000Z'),
                endTime: new Date('2026-03-20T13:00:00.000Z'),
                expiresAt: new Date('2026-03-20T12:15:00.000Z'),
            };
            prismaMock.$transaction.mockResolvedValueOnce(txResult);

            const result = await service.createReservation(baseDto);

            expect(result.isAvailable).toBe(true);
            expect(result).toHaveProperty('reservationId');
            expect(result).toHaveProperty('startTime');
            expect(result).toHaveProperty('endTime');
            expect(result).toHaveProperty('expiresAt');
        });
    });

    describe('fallback path', () => {
        it('should return recommendations and a held slot when desired slot is unavailable', async () => {
            prismaMock.dealership.findUnique.mockResolvedValueOnce({ id: DEALERSHIP_ID });
            prismaMock.serviceType.findMany.mockResolvedValueOnce([
                { id: SERVICE_TYPE_ID, durationMinutes: 60 },
            ]);

            const txResult = {
                isAvailable: false,
                reason: 'Requested slot is not available',
                recommendations: [
                    {
                        startTime: new Date('2026-03-20T12:15:00.000Z'),
                        endTime: new Date('2026-03-20T13:15:00.000Z'),
                    },
                    {
                        startTime: new Date('2026-03-20T12:30:00.000Z'),
                        endTime: new Date('2026-03-20T13:30:00.000Z'),
                    },
                ],
                heldRecommendation: {
                    reservationId: 'held-uuid-456',
                    startTime: new Date('2026-03-20T12:15:00.000Z'),
                    endTime: new Date('2026-03-20T13:15:00.000Z'),
                    expiresAt: new Date('2026-03-20T12:20:00.000Z'),
                },
            };
            prismaMock.$transaction.mockResolvedValueOnce(txResult);

            const result = await service.createReservation(baseDto);

            expect(result.isAvailable).toBe(false);
            expect(result).toHaveProperty('recommendations');
            expect(result).toHaveProperty('heldRecommendation');
            expect((result as typeof txResult).recommendations).toHaveLength(2);
        });

        it('should return null heldRecommendation when no slots are found in window', async () => {
            prismaMock.dealership.findUnique.mockResolvedValueOnce({ id: DEALERSHIP_ID });
            prismaMock.serviceType.findMany.mockResolvedValueOnce([
                { id: SERVICE_TYPE_ID, durationMinutes: 60 },
            ]);

            const txResult = {
                isAvailable: false,
                reason: 'Requested slot is not available',
                recommendations: [],
                heldRecommendation: null,
            };
            prismaMock.$transaction.mockResolvedValueOnce(txResult);

            const result = await service.createReservation(baseDto);

            expect(result.isAvailable).toBe(false);
            expect((result as typeof txResult).heldRecommendation).toBeNull();
        });
    });
});
