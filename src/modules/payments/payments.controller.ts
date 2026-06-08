import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaymentPlanResponseDto } from './dto/plan-response.dto';
import { SetupIntentResponseDto } from './dto/setup-intent-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('plans')
  @HttpCode(200)
  listPlans(): Promise<PaymentPlanResponseDto[]> {
    return this.paymentsService.listPlans();
  }

  @Post('setup-intent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  createSetupIntent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SetupIntentResponseDto> {
    return this.paymentsService.createSetupIntent(user.id);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  getSubscription(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionResponseDto> {
    return this.paymentsService.getSubscription(user.id);
  }
}
