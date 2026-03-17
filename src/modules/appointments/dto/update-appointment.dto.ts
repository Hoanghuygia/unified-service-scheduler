import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class UpdateAppointmentDto {
    @ApiPropertyOptional({ example: '2026-03-17T14:00:00.000Z' })
    @IsOptional()
    @IsDateString()
    completedAt?: string;
}
