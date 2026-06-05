import { BadRequestException } from '@nestjs/common';
import { PaymentsService } from '../../src/modules/payments/payments.service';

describe('PaymentsService', () => {
  const service = new PaymentsService();

  it('validates a valid payment method', () => {
    const result = service.validatePaymentMethod({
      cardName: 'João Silva',
      cardNumber: '4111111111111111',
      cardExpiry: '12/30',
      cardCvv: '123',
    });

    expect(result).toEqual({
      valid: true,
      message: 'Payment method validated',
    });
  });

  it('rejects invalid card numbers', () => {
    expect(() =>
      service.validatePaymentMethod({
        cardName: 'João Silva',
        cardNumber: '4111111111111112',
        cardExpiry: '12/30',
        cardCvv: '123',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects expired cards', () => {
    expect(() =>
      service.validatePaymentMethod({
        cardName: 'João Silva',
        cardNumber: '4111111111111111',
        cardExpiry: '01/20',
        cardCvv: '123',
      }),
    ).toThrow(BadRequestException);
  });
});
