import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { ConsultationsService } from './consultations.service';
import { InstantConsultationRequestDto } from './dto/instant-consultation.dto';
import { ScheduleConsultationDto } from './dto/schedule-consultation.dto';
import { UpdateConsultationStatusDto } from './dto/update-consultation-status.dto';

@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post('schedule')
  @Roles(UserRole.patient, UserRole.admin)
  scheduleConsultation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ScheduleConsultationDto,
  ) {
    return this.consultationsService.scheduleConsultation(user, dto);
  }

  @Post('instant/request')
  @Roles(UserRole.patient, UserRole.admin)
  requestInstantConsultation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InstantConsultationRequestDto,
  ) {
    return this.consultationsService.requestInstantConsultation(user, dto);
  }

  @Post('instant/match')
  @Roles(UserRole.doctor, UserRole.admin)
  matchInstantConsultation(@CurrentUser() user: AuthenticatedUser) {
    return this.consultationsService.matchInstantConsultation(user);
  }

  @Get('me')
  @Roles(UserRole.patient, UserRole.doctor, UserRole.admin)
  getMyConsultations(@CurrentUser() user: AuthenticatedUser) {
    return this.consultationsService.getMyConsultations(user);
  }

  @Get('me/history')
  @Roles(UserRole.patient, UserRole.admin)
  getMyHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.consultationsService.getMyHistory(user);
  }

  @Patch(':id/status')
  @Roles(UserRole.patient, UserRole.doctor, UserRole.admin)
  updateConsultationStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationStatusDto,
  ) {
    return this.consultationsService.updateConsultationStatus(user, id, dto);
  }

  @Get(':id/session')
  @Roles(UserRole.patient, UserRole.doctor, UserRole.admin)
  getVideoSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.consultationsService.getVideoSession(user, id);
  }

  @Post(':id/session')
  @Roles(UserRole.patient, UserRole.doctor, UserRole.admin)
  createVideoSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.consultationsService.createVideoSession(user, id);
  }
}
