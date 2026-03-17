import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppointmentHoldsModule } from './modules/appointment-holds/appointment-holds.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { HealthModule } from './modules/health/health.module';
import { SlotsModule } from './modules/slots/slots.module';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [appConfig],
            validate: validateEnv,
        }),
        PrismaModule,
        HealthModule,
        AppointmentHoldsModule,
        AppointmentsModule,
        SlotsModule,
    ],
})
export class AppModule {}
