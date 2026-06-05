import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ValidatePaymentDto } from './dto/validate-payment.dto';
import { PaymentValidationResult, PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('validate')
  @HttpCode(200)
  validatePayment(@Body() dto: ValidatePaymentDto): PaymentValidationResult {
    return this.paymentsService.validatePaymentMethod(dto);
  }
}
