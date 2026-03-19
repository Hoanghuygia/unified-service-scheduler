import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { GlobalExceptionFilter } from '../../src/common/http/filters/global-exception.filter';
import { ResponseInterceptor } from '../../src/common/http/interceptors/response.interceptor';
import { RequestLoggingInterceptor } from '../../src/common/logger/request-logging.interceptor';
import { AppointmentsService } from '../../src/modules/appointments/appointments.service';
import { ReservationsService } from '../../src/modules/reservations/reservations.service';
import { SlotsService } from '../../src/modules/slots/slots.service';

describe('API Endpoints (e2e)', () => {
    let app: INestApplication;
    const appointmentId = '11111111-1111-4111-8111-111111111111';
    const reservationsService = {
        createReservation: jest.fn(),
        cancelReservation: jest.fn(),
    };
    const appointmentsService = {
        confirmBooking: jest.fn(),
        completeAppointment: jest.fn(),
        cancelAppointment: jest.fn(),
    };
    const slotsService = {
        getSlots: jest.fn(),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ReservationsService)
            .useValue(reservationsService)
            .overrideProvider(AppointmentsService)
            .useValue(appointmentsService)
            .overrideProvider(SlotsService)
            .useValue(slotsService)
            .compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
                forbidNonWhitelisted: true,
            }),
        );
        app.useGlobalInterceptors(
            moduleFixture.get(RequestLoggingInterceptor),
            moduleFixture.get(ResponseInterceptor),
        );
        app.useGlobalFilters(moduleFixture.get(GlobalExceptionFilter));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('GET /health returns 200', async () => {
        const response = await request(app.getHttpServer()).get('/health').expect(200);

        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    status: 'ok',
                    timestamp: expect.any(String),
                }),
                message: null,
                meta: expect.objectContaining({
                    requestId: expect.any(String),
                    timestamp: expect.any(String),
                }),
            }),
        );
    });

    it('POST /reservations returns 201 with reservation data', async () => {
        reservationsService.createReservation.mockResolvedValue({
            isAvailable: true,
            reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
            startTime: '2026-03-17T12:00:00.000Z',
            endTime: '2026-03-17T13:00:00.000Z',
            expiresAt: '2026-03-17T12:15:00.000Z',
        });

        const response = await request(app.getHttpServer())
            .post('/reservations')
            .send({
                vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
                serviceTypeIds: ['4c4f1960-a95b-4e60-b45f-e58bde8d0ec0'],
                dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                desiredTime: '2026-03-17T12:00:00.000Z',
            })
            .expect(201);

        expect(reservationsService.createReservation).toHaveBeenCalledWith(
            expect.objectContaining({
                vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
                serviceTypeIds: ['4c4f1960-a95b-4e60-b45f-e58bde8d0ec0'],
                dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                desiredTime: '2026-03-17T12:00:00.000Z',
            }),
        );
        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    isAvailable: true,
                    reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                }),
                meta: expect.objectContaining({
                    requestId: expect.any(String),
                }),
            }),
        );
    });

    it('PATCH /reservations/:reservationId/cancel returns 200', async () => {
        reservationsService.cancelReservation.mockResolvedValue({
            message: 'Reservation cancelled successfully',
            id: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
            status: 'EXPIRED',
        });

        const response = await request(app.getHttpServer())
            .patch('/reservations/d8a43f44-e8d6-4fb2-8f59-d4d1df3efde9/cancel')
            .expect(200);

        expect(reservationsService.cancelReservation).toHaveBeenCalledWith(
            'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
        );
        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                message: 'Reservation cancelled successfully',
                data: expect.objectContaining({
                    id: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                    status: 'EXPIRED',
                }),
            }),
        );
    });

    it('POST /appointments returns 201', async () => {
        appointmentsService.confirmBooking.mockResolvedValue({
            message: 'Appointment booked successfully',
            appointmentId,
            reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
            status: 'BOOKED',
            bookedAt: '2026-03-17T12:10:00.000Z',
            confirmationResult: 'created',
        });

        const response = await request(app.getHttpServer())
            .post('/appointments')
            .send({
                reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
            })
            .expect(201);

        expect(appointmentsService.confirmBooking).toHaveBeenCalledWith(
            expect.objectContaining({
                reservationId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
            }),
        );
        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                message: 'Appointment booked successfully',
                data: expect.objectContaining({
                    appointmentId,
                    confirmationResult: 'created',
                }),
            }),
        );
    });

    it('PATCH /appointments/:id/complete returns 200', async () => {
        appointmentsService.completeAppointment.mockResolvedValue({
            message: 'Appointment marked as completed',
            appointmentId,
            status: 'COMPLETED',
        });

        const response = await request(app.getHttpServer())
            .patch(`/appointments/${appointmentId}/complete`)
            .expect(200);

        expect(appointmentsService.completeAppointment).toHaveBeenCalledWith(appointmentId);
        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                message: 'Appointment marked as completed',
                data: expect.objectContaining({
                    appointmentId,
                    status: 'COMPLETED',
                }),
            }),
        );
    });

    it('PATCH /appointments/:id/cancel returns 200', async () => {
        appointmentsService.cancelAppointment.mockResolvedValue({
            message: 'Appointment cancelled successfully',
            appointmentId,
            status: 'CANCELLED',
        });

        const response = await request(app.getHttpServer())
            .patch(`/appointments/${appointmentId}/cancel`)
            .expect(200);

        expect(appointmentsService.cancelAppointment).toHaveBeenCalledWith(appointmentId);
        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                message: 'Appointment cancelled successfully',
                data: expect.objectContaining({
                    appointmentId,
                    status: 'CANCELLED',
                }),
            }),
        );
    });

    it('GET /slots returns list', async () => {
        slotsService.getSlots.mockResolvedValue({
            slots: [
                {
                    type: 'RESERVATION',
                    id: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
                    startTime: '2026-03-17T12:00:00.000Z',
                    endTime: '2026-03-17T13:00:00.000Z',
                    technicianId: '1ce6c8d6-6309-49ea-a0b7-24855e0d7f39',
                    serviceBayId: '59e82402-1c7f-4477-8f1a-a07f938ac8f8',
                },
            ],
            pagination: {
                page: 1,
                limit: 20,
                total: 1,
            },
        });

        const response = await request(app.getHttpServer())
            .get('/slots')
            .query({
                dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                endTime: '2027-03-17T18:00:00.000Z',
            })
            .expect(200);

        expect(slotsService.getSlots).toHaveBeenCalledWith(
            expect.objectContaining({
                dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                endTime: '2027-03-17T18:00:00.000Z',
            }),
        );
        expect(response.body).toEqual(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    slots: expect.any(Array),
                    pagination: expect.objectContaining({
                        page: 1,
                        limit: 20,
                        total: 1,
                    }),
                }),
            }),
        );
    });
});
