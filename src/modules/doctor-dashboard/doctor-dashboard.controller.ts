import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../../common/decorators/swagger.decorators';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { DoctorDashboardService } from './doctor-dashboard.service';
import { AddPatientDto } from './dto/add-patient.dto';
import { UpdateOnlineStatusDto } from './dto/update-online-status.dto';

@ApiTags('doctor-dashboard')
@ApiBearerAuth('access-token')
@ApiStandardErrors()
@Controller('doctor-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.doctor, UserRole.admin)
export class DoctorDashboardController {
  constructor(private readonly doctorDashboardService: DoctorDashboardService) {}

  @Get('patients')
  @ApiOperation({ summary: 'List linked patients' })
  listPatients(@CurrentUser() user: AuthenticatedUser) {
    return this.doctorDashboardService.listPatients(user);
  }

  @Post('patients')
  @ApiOperation({ summary: 'Link patient to doctor' })
  addPatient(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddPatientDto) {
    return this.doctorDashboardService.addPatient(user, dto);
  }

  @Get('appointments/today')
  @ApiOperation({ summary: "Get today's appointments" })
  getTodayAppointments(@CurrentUser() user: AuthenticatedUser) {
    return this.doctorDashboardService.getTodayAppointments(user);
  }

  @Patch('online-status')
  @ApiOperation({ summary: 'Toggle doctor online status' })
  updateOnlineStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOnlineStatusDto,
  ) {
    return this.doctorDashboardService.updateOnlineStatus(user, dto);
  }
}
