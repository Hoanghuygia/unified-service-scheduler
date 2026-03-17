import { Module } from '@nestjs/common';
import { AppointmentHoldsController } from './appointment-holds.controller';
import { AppointmentHoldsService } from './appointment-holds.service';

@Module({
    controllers: [AppointmentHoldsController],
    providers: [AppointmentHoldsService],
    exports: [AppointmentHoldsService],
})
export class AppointmentHoldsModule {}
