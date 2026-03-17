import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            transform: true,
            forbidNonWhitelisted: true,
        }),
    );

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

    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await app.listen(port);
}

void bootstrap();
