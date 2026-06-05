import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MockStripeClient } from './mock-stripe.client';
import { STRIPE_CLIENT } from './stripe-client.interface';
import { StripeClientImpl } from './stripe.client';

@Module({
  providers: [
    {
      provide: STRIPE_CLIENT,
      useFactory: (configService: ConfigService) => {
        const secretKey = configService.get<string>('STRIPE_SECRET_KEY');
        if (secretKey) {
          return new StripeClientImpl(configService);
        }
        return new MockStripeClient();
      },
      inject: [ConfigService],
    },
  ],
  exports: [STRIPE_CLIENT],
})
export class PaymentsInfrastructureModule {}
