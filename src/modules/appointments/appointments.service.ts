import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';
import { ReservationStatus } from '../../common/enums/reservation-status.enum';
import { AppLoggerService } from '../../common/logger/logger.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const CONFIRM_APPOINTMENT_TRANSACTION_OPTIONS = {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5000,
    timeout: 15000,
} as const;

type ReservationForConfirmation = Prisma.ReservationGetPayload<{
    include: {
        serviceTypes: {
            select: {
                serviceTypeId: true;
            };
        };
    };
}>;

type AppointmentForResponse = {
    id: string;
    createdAt: Date;
    status: string;
};

type ConfirmationResult = 'created' | 'already_confirmed';

interface ConfirmAppointmentResponse {
    message: string;
    appointmentId: string;
    reservationId: string;
    status: AppointmentStatus;
    bookedAt: string;
    confirmationResult: ConfirmationResult;
}

@Injectable()
export class AppointmentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly logger: AppLoggerService,
    ) {}

    async confirmBooking(dto: CreateAppointmentDto): Promise<ConfirmAppointmentResponse> {
        this.logger.log('Confirming appointment booking from reservation', {
            reservationId: dto.reservationId,
            result: 'started',
        });

        try {
            const confirmation = await this.confirmReservation(dto.reservationId);

            this.logger.log('Appointment confirmation succeeded', {
                reservationId: dto.reservationId,
                appointmentId: confirmation.appointmentId,
                result: confirmation.confirmationResult,
            });

            return confirmation;
        } catch (error) {
            this.logger.error('Appointment confirmation failed', error as Error, {
                reservationId: dto.reservationId,
                result: 'failed',
                failureReason: this.getFailureReason(error),
            });
            throw error;
        }
    }

    async markCompleted(id: string, dto: UpdateAppointmentDto) {
        if (!id) {
            this.logger.warn('Appointment completion failed due to missing id');
            throw new NotFoundException('Appointment id is required');
        }

        this.logger.log('Marking appointment as completed', {
            appointmentId: id,
            completedAt: dto.completedAt,
        });

        return {
            appointmentId: id,
            status: AppointmentStatus.COMPLETED,
            completedAt: dto.completedAt ?? new Date().toISOString(),
        };
    }

    private async confirmReservation(
        reservationId: string,
        attempt = 1,
    ): Promise<ConfirmAppointmentResponse> {
        try {
            return await this.prisma.$transaction(async (tx) => {
                await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment-confirmation:${reservationId}`}))`;

                const reservation = await tx.reservation.findUnique({
                    where: { id: reservationId },
                    include: {
                        serviceTypes: {
                            select: {
                                serviceTypeId: true,
                            },
                        },
                    },
                });

                if (!reservation) {
                    throw new NotFoundException(`Reservation ${reservationId} not found`);
                }

                if (reservation.appointmentId) {
                    return this.returnExistingAppointment(tx, reservation);
                }

                this.assertReservationCanBeConfirmed(reservation);

                const now = new Date();
                if (reservation.expiresAt <= now) {
                    await tx.reservation.updateMany({
                        where: {
                            id: reservation.id,
                            status: ReservationStatus.ACTIVE,
                            appointmentId: null,
                            expiresAt: { lte: now },
                        },
                        data: { status: ReservationStatus.EXPIRED },
                    });

                    throw new BadRequestException('Reservation has expired');
                }

                await this.assertNoSchedulingConflicts(tx, reservation, now);

                const appointment = await tx.appointment.create({
                    data: {
                        vehicleId: reservation.vehicleId,
                        dealershipId: reservation.dealershipId,
                        technicianId: reservation.technicianId,
                        serviceBayId: reservation.serviceBayId,
                        startTime: reservation.startTime,
                        endTime: reservation.endTime,
                        totalDurationMinutes: reservation.totalDurationMinutes,
                        status: AppointmentStatus.BOOKED,
                        serviceTypes: {
                            create: reservation.serviceTypes.map((serviceType) => ({
                                serviceTypeId: serviceType.serviceTypeId,
                            })),
                        },
                    },
                    select: {
                        id: true,
                        createdAt: true,
                        status: true,
                    },
                });

                await tx.reservation.update({
                    where: { id: reservation.id },
                    data: {
                        status: ReservationStatus.CONVERTED,
                        appointmentId: appointment.id,
                    },
                });

                return this.buildConfirmationResponse(
                    reservation.id,
                    appointment,
                    'Appointment booked successfully',
                    'created',
                );
            }, CONFIRM_APPOINTMENT_TRANSACTION_OPTIONS);
        } catch (error) {
            if (this.shouldRetryTransaction(error) && attempt < 3) {
                this.logger.warn('Retrying appointment confirmation after serialization conflict', {
                    reservationId,
                    attempt,
                });

                return this.confirmReservation(reservationId, attempt + 1);
            }

            throw error;
        }
    }

    private assertReservationCanBeConfirmed(reservation: ReservationForConfirmation): void {
        if (reservation.status === ReservationStatus.EXPIRED) {
            throw new BadRequestException('Reservation has expired');
        }

        if (reservation.status === ReservationStatus.CONVERTED) {
            throw new InternalServerErrorException(
                'Reservation is marked as converted but is missing its appointment link',
            );
        }

        if (reservation.status !== ReservationStatus.ACTIVE) {
            throw new BadRequestException('Reservation is not active');
        }

        if (!reservation.technicianId || !reservation.serviceBayId) {
            throw new BadRequestException(
                'Reservation is missing an assigned technician or service bay',
            );
        }
    }

    private async returnExistingAppointment(
        tx: Prisma.TransactionClient,
        reservation: ReservationForConfirmation,
    ): Promise<ConfirmAppointmentResponse> {
        const appointment = await tx.appointment.findUnique({
            where: { id: reservation.appointmentId! },
            select: {
                id: true,
                createdAt: true,
                status: true,
            },
        });

        if (!appointment) {
            throw new InternalServerErrorException(
                'Reservation references an appointment that does not exist',
            );
        }

        return this.buildConfirmationResponse(
            reservation.id,
            appointment,
            'Appointment already confirmed',
            'already_confirmed',
        );
    }

    private async assertNoSchedulingConflicts(
        tx: Prisma.TransactionClient,
        reservation: ReservationForConfirmation,
        now: Date,
    ): Promise<void> {
        const overlapWindow = this.buildOverlapWindowFilter(
            reservation.startTime,
            reservation.endTime,
        );
        const resourceFilter = {
            OR: [
                { technicianId: reservation.technicianId },
                { serviceBayId: reservation.serviceBayId },
            ],
        };

        const [appointmentConflict, reservationConflict] = await Promise.all([
            tx.appointment.findFirst({
                where: {
                    dealershipId: reservation.dealershipId,
                    status: AppointmentStatus.BOOKED,
                    ...overlapWindow,
                    ...resourceFilter,
                },
                select: {
                    id: true,
                    technicianId: true,
                    serviceBayId: true,
                },
            }),
            tx.reservation.findFirst({
                where: {
                    dealershipId: reservation.dealershipId,
                    id: { not: reservation.id },
                    status: ReservationStatus.ACTIVE,
                    expiresAt: { gt: now },
                    ...overlapWindow,
                    ...resourceFilter,
                },
                select: {
                    id: true,
                    technicianId: true,
                    serviceBayId: true,
                },
            }),
        ]);

        if (appointmentConflict || reservationConflict) {
            throw new BadRequestException('Reserved slot is no longer available');
        }
    }

    private buildOverlapWindowFilter(startTime: Date, endTime: Date) {
        return {
            startTime: { lt: endTime },
            endTime: { gt: startTime },
        };
    }

    private buildConfirmationResponse(
        reservationId: string,
        appointment: AppointmentForResponse,
        message: string,
        confirmationResult: ConfirmationResult,
    ): ConfirmAppointmentResponse {
        return {
            message,
            appointmentId: appointment.id,
            reservationId,
            status: appointment.status as AppointmentStatus,
            bookedAt: appointment.createdAt.toISOString(),
            confirmationResult,
        };
    }

    private shouldRetryTransaction(error: unknown): boolean {
        return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
    }

    private getFailureReason(error: unknown): string {
        if (error instanceof Error) {
            return error.message;
        }

        return 'Unknown error';
    }
}
