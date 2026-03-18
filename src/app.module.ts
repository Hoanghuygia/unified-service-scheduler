import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { HealthModule } from './modules/health/health.module';
import { SlotsModule } from './modules/slots/slots.module';
import appConfig from './config/app.config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './common/prisma/prisma.module';
import { LoggerModule } from './common/logger/logger.module';
import { RequestIdMiddleware } from './common/request-context/request-context.middleware';
import { ResponseInterceptor } from './common/http/interceptors/response.interceptor';
import { GlobalExceptionFilter } from './common/http/filters/global-exception.filter';

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
        ReservationsModule,
        AppointmentsModule,
        SlotsModule,
    ],
    providers: [ResponseInterceptor, GlobalExceptionFilter],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(RequestIdMiddleware).forRoutes({
            path: '*',
            method: RequestMethod.ALL,
        });
    }
}
