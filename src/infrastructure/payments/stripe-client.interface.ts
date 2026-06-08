export interface StripeSetupIntentResult {
  id: string;
  clientSecret: string;
}

export interface StripeCustomerResult {
  id: string;
}

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface StripeClient {
  createCustomer(email: string, metadata?: Record<string, string>): Promise<StripeCustomerResult>;
  createSetupIntent(customerId: string): Promise<StripeSetupIntentResult>;
  constructWebhookEvent(payload: Buffer, signature: string, secret: string): StripeWebhookEvent;
}

export const STRIPE_CLIENT = Symbol('STRIPE_CLIENT');
