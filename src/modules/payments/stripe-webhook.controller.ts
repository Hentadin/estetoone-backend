import {
  Controller,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class StripeWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiSecurity('stripe-signature')
  @ApiOperation({ summary: 'Stripe webhook handler (raw body + signature)' })
  @ApiOkResponse({ schema: { properties: { received: { type: 'boolean', enum: [true] } } } })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const payload = req.rawBody ?? Buffer.from('');
    return this.paymentsService.handleWebhook(payload, signature);
  }
}
