import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { MedicalRecordsService } from './medical-records.service';

@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get('me')
  @Roles(UserRole.patient, UserRole.admin)
  listMyRecords(@CurrentUser() user: AuthenticatedUser) {
    return this.medicalRecordsService.listRecords(user);
  }

  @Get('me/:id')
  @Roles(UserRole.patient, UserRole.admin)
  getMyRecord(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.medicalRecordsService.getRecord(user, id);
  }

  @Post('me')
  @Roles(UserRole.patient, UserRole.admin)
  createMyRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.createRecord(user, dto);
  }

  @Delete('me/:id')
  @Roles(UserRole.patient, UserRole.admin)
  @HttpCode(200)
  deleteMyRecord(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.medicalRecordsService.deleteRecord(user, id);
  }
}
