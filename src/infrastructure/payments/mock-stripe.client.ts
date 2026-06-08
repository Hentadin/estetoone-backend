import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  StripeClient,
  StripeCustomerResult,
  StripeSetupIntentResult,
  StripeWebhookEvent,
} from './stripe-client.interface';

@Injectable()
export class MockStripeClient implements StripeClient {
  async createCustomer(
    email: string,
    _metadata?: Record<string, string>,
  ): Promise<StripeCustomerResult> {
    return { id: `cus_mock_${email.replace(/[^a-z0-9]/gi, '_')}` };
  }

  async createSetupIntent(customerId: string): Promise<StripeSetupIntentResult> {
    const id = `seti_mock_${randomUUID()}`;
    return {
      id,
      clientSecret: `${id}_secret_mock`,
    };
  }

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    secret: string,
  ): StripeWebhookEvent {
    const expectedSignature = `whsec_mock_${secret}`;
    if (signature !== expectedSignature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    return JSON.parse(payload.toString()) as StripeWebhookEvent;
  }
}
