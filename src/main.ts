import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { RequestLoggingInterceptor } from './common/logger/request-logging.interceptor';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });

    app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

    app.useGlobalInterceptors(app.get(RequestLoggingInterceptor));

    const swaggerConfig = new DocumentBuilder()
        .setTitle('Unified Service Scheduler API')
        .setDescription('Vehicle service appointment booking system API')
        .setVersion('1.0.0')
        .addTag('health')
        .addTag('appointment-holds')
        .addTag('appointments')
        .addTag('slots')
        .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api-docs', app, document);

    const configService = app.get(ConfigService);
    const port = configService.getOrThrow<number>('app.port');
    await app.listen(port);
}

void bootstrap();
