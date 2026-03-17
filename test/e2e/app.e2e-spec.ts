import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('API Endpoints (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                transform: true,
                forbidNonWhitelisted: true,
            }),
        );
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('POST /appointment-holds returns 201 and mock response', async () => {
        const response = await request(app.getHttpServer())
            .post('/appointment-holds')
            .send({
                vehicleId: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6',
                serviceTypeId: '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0',
                dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                desiredTime: '2026-03-17T12:00:00.000Z',
            })
            .expect(201);

        expect(response.body).toHaveProperty('success');
    });

    it('POST /appointments returns 201', async () => {
        await request(app.getHttpServer())
            .post('/appointments')
            .send({
                holdId: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9',
            })
            .expect(201);
    });

    it('PATCH /appointments/:id returns 200', async () => {
        await request(app.getHttpServer())
            .patch('/appointments/appt_mock_456')
            .send({ completedAt: '2026-03-17T14:00:00.000Z' })
            .expect(200);
    });

    it('GET /slots returns list', async () => {
        const response = await request(app.getHttpServer())
            .get('/slots')
            .query({
                dealershipId: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
                from: '2026-03-17T08:00:00.000Z',
                to: '2026-03-17T18:00:00.000Z',
            })
            .expect(200);

        expect(Array.isArray(response.body.slots)).toBe(true);
    });
});
