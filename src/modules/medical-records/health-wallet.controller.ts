import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../../common/decorators/swagger.decorators';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateVitalDto } from './dto/create-vital.dto';
import { HealthWalletService } from './health-wallet.service';

@ApiTags('health-wallet')
@ApiBearerAuth('access-token')
@ApiStandardErrors()
@Controller('health-wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class HealthWalletController {
  constructor(private readonly healthWalletService: HealthWalletService) {}

  @Get('me')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Get aggregated health wallet' })
  getMyWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.healthWalletService.getWallet(user);
  }

  @Get('me/vitals')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'List patient vitals' })
  listMyVitals(@CurrentUser() user: AuthenticatedUser) {
    return this.healthWalletService.listVitals(user);
  }

  @Post('me/vitals')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Record a vital sign' })
  createMyVital(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateVitalDto) {
    return this.healthWalletService.createVital(user, dto);
  }

  @Get('me/consultations')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'List consultation records for health wallet' })
  listMyConsultations(@CurrentUser() user: AuthenticatedUser) {
    return this.healthWalletService.listConsultations(user);
  }
}
