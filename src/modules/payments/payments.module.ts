import { Module } from '@nestjs/common';
import { PaymentsInfrastructureModule } from '../../infrastructure/payments/payments-infrastructure.module';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [PaymentsInfrastructureModule],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService, PaymentsRepository],
  exports: [PaymentsService],
})
export class PaymentsModule {}
