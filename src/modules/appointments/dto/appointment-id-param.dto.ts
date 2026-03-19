import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AppointmentIdParamDto {
    @ApiProperty({ example: 'd8a43f44-e8d6-4fb2-8f59-d4d1df3efde9' })
    @IsUUID('4', { message: 'id must be a UUID v4' })
    id!: string;
}