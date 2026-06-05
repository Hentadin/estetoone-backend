import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { AuditModule } from './infrastructure/audit/audit.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlansModule } from './modules/plans/plans.module';
import { ProfilesModule } from './modules/profiles/profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    RedisModule,
    AuditModule,
    HealthModule,
    AuthModule,
    PlansModule,
    PaymentsModule,
    ProfilesModule,
    MedicalRecordsModule,
  ],
})
export class AppModule {}
