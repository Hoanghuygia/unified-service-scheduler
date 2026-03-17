import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID } from 'class-validator';

export class GetSlotsQueryDto {
    @ApiProperty({ example: '8ec56f3e-4e8d-4fef-a31a-9f89e843e70f' })
    @IsUUID()
    dealershipId!: string;

    @ApiProperty({ example: '2026-03-17T08:00:00.000Z' })
    @IsDateString()
    from!: string;

    @ApiProperty({ example: '2026-03-17T18:00:00.000Z' })
    @IsDateString()
    to!: string;
}
