import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../../common/decorators/swagger.decorators';
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

@ApiTags('consultations')
@ApiBearerAuth('access-token')
@ApiStandardErrors()
@Controller('consultations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post('schedule')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Schedule a consultation' })
  scheduleConsultation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ScheduleConsultationDto,
  ) {
    return this.consultationsService.scheduleConsultation(user, dto);
  }

  @Post('instant/request')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Request instant consultation' })
  requestInstantConsultation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InstantConsultationRequestDto,
  ) {
    return this.consultationsService.requestInstantConsultation(user, dto);
  }

  @Post('instant/match')
  @Roles(UserRole.doctor, UserRole.admin)
  @ApiOperation({ summary: 'Doctor accepts next queued instant consultation' })
  matchInstantConsultation(@CurrentUser() user: AuthenticatedUser) {
    return this.consultationsService.matchInstantConsultation(user);
  }

  @Get('me')
  @Roles(UserRole.patient, UserRole.doctor, UserRole.admin)
  @ApiOperation({ summary: 'List consultations for current role' })
  getMyConsultations(@CurrentUser() user: AuthenticatedUser) {
    return this.consultationsService.getMyConsultations(user);
  }

  @Get('me/history')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Get consultation history' })
  getMyHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.consultationsService.getMyHistory(user);
  }

  @Patch(':id/status')
  @Roles(UserRole.patient, UserRole.doctor, UserRole.admin)
  @ApiOperation({ summary: 'Update consultation status' })
  updateConsultationStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationStatusDto,
  ) {
    return this.consultationsService.updateConsultationStatus(user, id, dto);
  }

  @Get(':id/session')
  @Roles(UserRole.patient, UserRole.doctor, UserRole.admin)
  @ApiOperation({ summary: 'Get video session room URL' })
  getVideoSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.consultationsService.getVideoSession(user, id);
  }

  @Post(':id/session')
  @Roles(UserRole.patient, UserRole.doctor, UserRole.admin)
  @ApiOperation({ summary: 'Create/start video session' })
  createVideoSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.consultationsService.createVideoSession(user, id);
  }
}
