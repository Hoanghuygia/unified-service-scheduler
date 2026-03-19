import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class GetSlotsQueryDto {
    @ApiProperty({
        example: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f',
        description: 'Dealership ID used to scope occupied slot retrieval',
    })
    @IsUUID('4', { message: 'dealershipId must be a UUID v4' })
    dealershipId!: string;

    @ApiProperty({
        example: '2026-03-17T18:00:00.000Z',
        description: 'Upper bound for the occupied slot search window (UTC ISO-8601)',
    })
    @IsDateString()
    endTime!: string;

    @ApiPropertyOptional({
        example: 1,
        description: 'Page number (1-indexed)',
        default: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({
        example: 20,
        description: 'Maximum number of occupied slots returned per page',
        default: 20,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number;

    @ApiPropertyOptional({
        example: '1ce6c8d6-6309-49ea-a0b7-24855e0d7f39',
        description: 'Optional filter by assigned technician ID',
    })
    @IsOptional()
    @IsUUID('4', { message: 'technicianId must be a UUID v4' })
    technicianId?: string;

    @ApiPropertyOptional({
        example: '59e82402-1c7f-4477-8f1a-a07f938ac8f8',
        description: 'Optional filter by assigned service bay ID',
    })
    @IsOptional()
    @IsUUID('4', { message: 'serviceBayId must be a UUID v4' })
    serviceBayId?: string;
}
