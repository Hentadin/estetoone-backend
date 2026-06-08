import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { RequestTimingInterceptor } from './common/interceptors/request-timing.interceptor';
import { AuditModule } from './infrastructure/audit/audit.module';
import { DatabaseModule } from './infrastructure/database/database.module';
import { LoggingModule } from './infrastructure/logging/logging.module';
import { SentryModule } from './infrastructure/monitoring/sentry.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MedicalRecordsModule } from './modules/medical-records/medical-records.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PlansModule } from './modules/plans/plans.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { DoctorDashboardModule } from './modules/doctor-dashboard/doctor-dashboard.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { ProfilesModule } from './modules/profiles/profiles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    LoggingModule,
    SentryModule.forRoot(),
    DatabaseModule,
    RedisModule,
    AuditModule,
    HealthModule,
    AuthModule,
    PlansModule,
    PaymentsModule,
    ProfilesModule,
    MedicalRecordsModule,
    DoctorsModule,
    ConsultationsModule,
    DoctorDashboardModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestTimingInterceptor,
    },
  ],
})
export class AppModule {}
