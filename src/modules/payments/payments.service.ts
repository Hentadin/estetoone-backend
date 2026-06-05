import { BadRequestException, Injectable } from '@nestjs/common';
import { ValidatePaymentDto } from './dto/validate-payment.dto';

export interface PaymentValidationResult {
  valid: true;
  message: string;
}

@Injectable()
export class PaymentsService {
  validatePaymentMethod(dto: ValidatePaymentDto): PaymentValidationResult {
    const digits = dto.cardNumber.replace(/\D/g, '');

    if (!this.passesLuhnCheck(digits)) {
      throw new BadRequestException('Invalid card number');
    }

    const [month, year] = dto.cardExpiry.split('/');
    const expiry = new Date(2000 + Number(year), Number(month), 0, 23, 59, 59);

    if (expiry < new Date()) {
      throw new BadRequestException('Card is expired');
    }

    return {
      valid: true,
      message: 'Payment method validated',
    };
  }

  private passesLuhnCheck(cardNumber: string): boolean {
    let sum = 0;
    let shouldDouble = false;

    for (let i = cardNumber.length - 1; i >= 0; i -= 1) {
      let digit = Number(cardNumber[i]);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }
}
