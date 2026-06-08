import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Put,
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
import { UpdateDoctorProfileDto } from './dto/update-doctor-profile.dto';
import { UpdatePatientProfileDto } from './dto/update-patient-profile.dto';
import { UploadProfilePhotoDto } from './dto/upload-profile-photo.dto';
import { ProfilesService } from './profiles.service';

@ApiTags('profiles')
@ApiBearerAuth('access-token')
@ApiStandardErrors()
@Controller('profiles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('patient/me')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Get patient profile' })
  getPatientProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getPatientProfile(user);
  }

  @Patch('patient/me')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Update patient profile' })
  updatePatientProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.profilesService.updatePatientProfile(user, dto);
  }

  @Put('patient/me/photo')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Upload patient profile photo' })
  uploadPatientPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadProfilePhotoDto,
  ) {
    return this.profilesService.uploadPatientPhoto(user, dto);
  }

  @Delete('patient/me/photo')
  @Roles(UserRole.patient, UserRole.admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete patient profile photo' })
  deletePatientPhoto(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.deletePatientPhoto(user);
  }

  @Get('doctor/me')
  @Roles(UserRole.doctor, UserRole.admin)
  @ApiOperation({ summary: 'Get doctor profile' })
  getDoctorProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.getDoctorProfile(user);
  }

  @Patch('doctor/me')
  @Roles(UserRole.doctor, UserRole.admin)
  @ApiOperation({ summary: 'Update doctor profile' })
  updateDoctorProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.profilesService.updateDoctorProfile(user, dto);
  }

  @Put('doctor/me/photo')
  @Roles(UserRole.doctor, UserRole.admin)
  @ApiOperation({ summary: 'Upload doctor profile photo' })
  uploadDoctorPhoto(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadProfilePhotoDto,
  ) {
    return this.profilesService.uploadDoctorPhoto(user, dto);
  }

  @Delete('doctor/me/photo')
  @Roles(UserRole.doctor, UserRole.admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete doctor profile photo' })
  deleteDoctorPhoto(@CurrentUser() user: AuthenticatedUser) {
    return this.profilesService.deleteDoctorPhoto(user);
  }
}
