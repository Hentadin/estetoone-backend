import { Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../../common/decorators/swagger.decorators';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { PaymentPlanResponseDto } from './dto/plan-response.dto';
import { SetupIntentResponseDto } from './dto/setup-intent-response.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('plans')
  @HttpCode(200)
  @ApiOperation({ summary: 'List payment plans' })
  @ApiOkResponse({ type: PaymentPlanResponseDto, isArray: true })
  listPlans(): Promise<PaymentPlanResponseDto[]> {
    return this.paymentsService.listPlans();
  }

  @Post('setup-intent')
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create Stripe setup intent (mocked without STRIPE_SECRET_KEY)' })
  @ApiOkResponse({ type: SetupIntentResponseDto })
  @ApiStandardErrors()
  createSetupIntent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SetupIntentResponseDto> {
    return this.paymentsService.createSetupIntent(user.id);
  }

  @Get('subscription')
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user subscription' })
  @ApiOkResponse({ type: SubscriptionResponseDto })
  @ApiStandardErrors()
  getSubscription(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubscriptionResponseDto> {
    return this.paymentsService.getSubscription(user.id);
  }
}
