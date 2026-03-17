import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppointmentHoldsModule } from './modules/appointment-holds/appointment-holds.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { HealthModule } from './modules/health/health.module';
import { SlotsModule } from './modules/slots/slots.module';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { LoggerModule } from './common/logger/logger.module';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
            load: [appConfig],
            validate: validateEnv,
        }),
        LoggerModule,
        PrismaModule,
        HealthModule,
        AppointmentHoldsModule,
        AppointmentsModule,
        SlotsModule,
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(RequestContextMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        });
    }
}
