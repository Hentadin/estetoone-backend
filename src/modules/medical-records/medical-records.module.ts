import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { HealthWalletController } from './health-wallet.controller';
import { HealthWalletService } from './health-wallet.service';
import { MedicalRecordsController } from './medical-records.controller';
import { MedicalRecordsRepository } from './medical-records.repository';
import { MedicalRecordsService } from './medical-records.service';

@Module({
  imports: [AuthModule],
  controllers: [MedicalRecordsController, HealthWalletController],
  providers: [MedicalRecordsService, HealthWalletService, MedicalRecordsRepository],
  exports: [MedicalRecordsService, HealthWalletService],
})
export class MedicalRecordsModule {}
