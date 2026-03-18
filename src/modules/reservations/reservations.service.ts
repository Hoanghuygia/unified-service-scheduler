import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { AppLoggerService } from '../../common/logger/logger.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateReservationDto } from './dto/create-reservation.dto';

const HOLD_MINUTES = 15;
const SHORT_HOLD_MINUTES = 5;
const RECOMMENDATION_WINDOW_HOURS = 3;
const RECOMMENDATION_STEP_MINUTES = 15;
const RECOMMENDATION_LIMIT = 3;

interface AvailableResources {
    technicianId: string;
    serviceBayId: string;
}

interface BookingEntry {
    startTime: Date;
    endTime: Date;
    technicianId: string | null;
    serviceBayId: string | null;
}

interface TimeSlot {
    startTime: Date;
    endTime: Date;
}

@Injectable()
export class ReservationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService,
    ) {}

    async createReservation(dto: CreateReservationDto) {
        const { vehicleId, dealershipId, serviceTypeIds, desiredTime } = dto;
        const now = new Date();
        const startTime = new Date(desiredTime);

        this.logger.log('Creating reservation', {
            vehicleId,
            dealershipId,
            serviceTypeCount: serviceTypeIds.length,
            desiredTime,
        });

        // Validate dealership and service types before the transaction to keep it short
        const [dealership, serviceTypes] = await Promise.all([
            this.prisma.dealership.findUnique({ where: { id: dealershipId }, select: { id: true } }),
            this.prisma.serviceType.findMany({
                where: { id: { in: serviceTypeIds } },
                select: { id: true, durationMinutes: true },
            }),
        ]);

        if (!dealership) {
            throw new NotFoundException(`Dealership ${dealershipId} not found`);
        }

        if (serviceTypes.length !== serviceTypeIds.length) {
            const found = new Set(serviceTypes.map((s) => s.id));
            const missing = serviceTypeIds.filter((id) => !found.has(id));
            throw new NotFoundException(`ServiceType(s) not found: ${missing.join(', ')}`);
        }

        const totalDurationMinutes = serviceTypes.reduce((sum, s) => sum + s.durationMinutes, 0);
        const endTime = new Date(startTime.getTime() + totalDurationMinutes * 60_000);

        this.logger.debug('Computed time window', {
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            totalDurationMinutes,
        });

        return this.prisma.$transaction(
            async (tx) => {
                // Acquire per-dealership advisory lock — prevents concurrent double-booking
                // for the same dealership without requiring Serializable isolation
                const lockKey = `reservation:${dealershipId}`;
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`;

                // Batch-fetch all resources and overlapping bookings in a single round-trip
                const searchWindowEnd = new Date(
                    startTime.getTime() +
                        (RECOMMENDATION_WINDOW_HOURS * 60 + totalDurationMinutes) * 60_000,
                );

                const [allTechnicians, allBays, bookings] = await Promise.all([
                    tx.technician.findMany({ select: { id: true } }),
                    tx.serviceBay.findMany({
                        where: { dealershipId },
                        select: { id: true },
                    }),
                    this.fetchBookingsInWindow(tx, startTime, searchWindowEnd, now),
                ]);

                // ── Happy path: desired slot is available ──────────────────────────────
                const initialResources = this.resolveAvailableResources(
                    bookings,
                    allTechnicians,
                    allBays,
                    startTime,
                    endTime,
                );

                if (initialResources) {
                    this.logger.log('Slot available — creating reservation', {
                        technicianId: initialResources.technicianId,
                        serviceBayId: initialResources.serviceBayId,
                        startTime: startTime.toISOString(),
                    });

                    const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);
                    const reservation = await tx.reservation.create({
                        data: {
                            vehicleId,
                            dealershipId,
                            desiredTime: startTime,
                            startTime,
                            endTime,
                            expiresAt,
                            totalDurationMinutes,
                            status: ReservationStatus.ACTIVE,
                            technicianId: initialResources.technicianId,
                            serviceBayId: initialResources.serviceBayId,
                            serviceTypes: {
                                create: serviceTypeIds.map((serviceTypeId) => ({ serviceTypeId })),
                            },
                        },
                        select: { id: true, startTime: true, endTime: true, expiresAt: true },
                    });

                    this.logger.log('Reservation created', {
                        reservationId: reservation.id,
                        expiresAt: reservation.expiresAt.toISOString(),
                    });

                    return {
                        isAvailable: true,
                        reservationId: reservation.id,
                        startTime: reservation.startTime,
                        endTime: reservation.endTime,
                        expiresAt: reservation.expiresAt,
                    };
                }

                // ── Fallback: find nearest available slots ─────────────────────────────
                this.logger.warn('Requested slot unavailable — finding recommendations', {
                    dealershipId,
                    desiredTime,
                });

                // All recommendation checks are in-memory against pre-fetched bookings
                const recommendations = this.buildRecommendations(
                    bookings,
                    allTechnicians,
                    allBays,
                    startTime,
                    totalDurationMinutes,
                );

                let heldRecommendation: {
                    reservationId: string;
                    startTime: Date;
                    endTime: Date;
                    expiresAt: Date;
                } | null = null;

                if (recommendations.length > 0) {
                    const [first] = recommendations;
                    const firstResources = this.resolveAvailableResources(
                        bookings,
                        allTechnicians,
                        allBays,
                        first.startTime,
                        first.endTime,
                    );

                    if (firstResources) {
                        const shortExpiresAt = new Date(
                            now.getTime() + SHORT_HOLD_MINUTES * 60_000,
                        );
                        const held = await tx.reservation.create({
                            data: {
                                vehicleId,
                                dealershipId,
                                desiredTime: startTime,
                                startTime: first.startTime,
                                endTime: first.endTime,
                                expiresAt: shortExpiresAt,
                                totalDurationMinutes,
                                status: ReservationStatus.ACTIVE,
                                technicianId: firstResources.technicianId,
                                serviceBayId: firstResources.serviceBayId,
                                serviceTypes: {
                                    create: serviceTypeIds.map((serviceTypeId) => ({
                                        serviceTypeId,
                                    })),
                                },
                            },
                            select: { id: true, startTime: true, endTime: true, expiresAt: true },
                        });

                        heldRecommendation = {
                            reservationId: held.id,
                            startTime: held.startTime,
                            endTime: held.endTime,
                            expiresAt: held.expiresAt,
                        };

                        this.logger.log('Auto-held first recommended slot', {
                            reservationId: held.id,
                            startTime: held.startTime.toISOString(),
                            expiresAt: held.expiresAt.toISOString(),
                        });
                    }
                }

                return {
                    isAvailable: false,
                    reason: 'Requested slot is not available',
                    recommendations,
                    heldRecommendation,
                };
            },
            {
                isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
                maxWait: 5000,
                timeout: 15000,
            },
        );
    }

    // ── Private helpers ────────────────────────────────────────────────────────

    /**
     * Fetches all BOOKED appointments and ACTIVE (non-expired) reservations that
     * overlap with the given window. Used once per request; all slot checks after
     * this are resolved in memory.
     */
    private async fetchBookingsInWindow(
        tx: Prisma.TransactionClient,
        windowStart: Date,
        windowEnd: Date,
        now: Date,
    ): Promise<BookingEntry[]> {
        const overlapFilter = {
            startTime: { lt: windowEnd },
            endTime: { gt: windowStart },
        };
        const selectFields = {
            startTime: true,
            endTime: true,
            technicianId: true,
            serviceBayId: true,
        };

        const [appointments, reservations] = await Promise.all([
            tx.appointment.findMany({
                where: { status: AppointmentStatus.BOOKED, ...overlapFilter },
                select: selectFields,
            }),
            tx.reservation.findMany({
                where: {
                    status: ReservationStatus.ACTIVE,
                    expiresAt: { gt: now },
                    ...overlapFilter,
                },
                select: selectFields,
            }),
        ]);

        return [...appointments, ...reservations];
    }

    /**
     * Pure function: given pre-fetched bookings and the full resource lists,
     * returns the first available technician + service-bay pair for the requested
     * window, or null if none is free.
     */
    private resolveAvailableResources(
        bookings: BookingEntry[],
        allTechnicians: { id: string }[],
        allBays: { id: string }[],
        startTime: Date,
        endTime: Date,
    ): AvailableResources | null {
        const conflicting = bookings.filter(
            (b) => b.startTime < endTime && b.endTime > startTime,
        );

        const blockedTechIds = new Set(
            conflicting
                .map((b) => b.technicianId)
                .filter((id): id is string => id !== null),
        );
        const blockedBayIds = new Set(
            conflicting
                .map((b) => b.serviceBayId)
                .filter((id): id is string => id !== null),
        );

        const technician = allTechnicians.find((t) => !blockedTechIds.has(t.id));
        const bay = allBays.find((b) => !blockedBayIds.has(b.id));

        if (!technician || !bay) return null;
        return { technicianId: technician.id, serviceBayId: bay.id };
    }

    /**
     * In-memory recommendation algorithm. Iterates in 15-minute steps from
     * desiredStart + 1 step up to +3 hours, returning up to 3 available slots.
     * All checks are O(n) against pre-fetched bookings — no extra DB round-trips.
     */
    private buildRecommendations(
        bookings: BookingEntry[],
        allTechnicians: { id: string }[],
        allBays: { id: string }[],
        desiredStart: Date,
        totalDurationMinutes: number,
    ): TimeSlot[] {
        const results: TimeSlot[] = [];
        const windowEnd = new Date(
            desiredStart.getTime() + RECOMMENDATION_WINDOW_HOURS * 60 * 60_000,
        );
        let cursor = new Date(
            desiredStart.getTime() + RECOMMENDATION_STEP_MINUTES * 60_000,
        );

        while (cursor < windowEnd && results.length < RECOMMENDATION_LIMIT) {
            const slotEnd = new Date(cursor.getTime() + totalDurationMinutes * 60_000);
            const available = this.resolveAvailableResources(
                bookings,
                allTechnicians,
                allBays,
                cursor,
                slotEnd,
            );

            if (available) {
                results.push({ startTime: new Date(cursor), endTime: new Date(slotEnd) });
            }

            cursor = new Date(cursor.getTime() + RECOMMENDATION_STEP_MINUTES * 60_000);
        }

        return results;
    }
}
