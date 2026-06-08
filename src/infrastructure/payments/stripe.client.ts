import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  StripeClient,
  StripeCustomerResult,
  StripeSetupIntentResult,
  StripeWebhookEvent,
} from './stripe-client.interface';

@Injectable()
export class StripeClientImpl implements StripeClient {
  private readonly stripe: Stripe;

  constructor(private readonly configService: ConfigService) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is required for StripeClientImpl');
    }

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2025-02-24.acacia',
    });
  }

  async createCustomer(
    email: string,
    metadata?: Record<string, string>,
  ): Promise<StripeCustomerResult> {
    const customer = await this.stripe.customers.create({ email, metadata });
    return { id: customer.id };
  }

  async createSetupIntent(customerId: string): Promise<StripeSetupIntentResult> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    if (!setupIntent.client_secret) {
      throw new Error('Stripe SetupIntent missing client_secret');
    }

    return {
      id: setupIntent.id,
      clientSecret: setupIntent.client_secret,
    };
  }

  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    secret: string,
  ): StripeWebhookEvent {
    const event = this.stripe.webhooks.constructEvent(payload, signature, secret);
    return {
      id: event.id,
      type: event.type,
      data: {
        object: event.data.object as unknown as Record<string, unknown>,
      },
    };
  }
}
