import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DoctorDashboardController } from './doctor-dashboard.controller';
import { DoctorDashboardRepository } from './doctor-dashboard.repository';
import { DoctorDashboardService } from './doctor-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [DoctorDashboardController],
  providers: [DoctorDashboardService, DoctorDashboardRepository],
})
export class DoctorDashboardModule {}
