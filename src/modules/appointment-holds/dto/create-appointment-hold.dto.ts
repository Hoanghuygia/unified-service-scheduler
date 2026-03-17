import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class CreateAppointmentHoldDto {
    @ApiProperty({ example: 'c7bbf5f3-8f57-4452-95a6-a66cd4afe5f6' })
    @IsUUID()
    vehicleId!: string;

    @ApiProperty({ example: '4c4f1960-a95b-4e60-b45f-e58bde8d0ec0' })
    @IsUUID()
    serviceTypeId!: string;

    @ApiProperty({ example: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f' })
    @IsUUID()
    dealershipId!: string;

    @ApiProperty({ example: '2026-03-17T12:00:00.000Z' })
    @IsDateString()
    desiredTime!: string;
}
