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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiStandardErrors } from '../../common/decorators/swagger.decorators';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { MedicalRecordsService } from './medical-records.service';

@ApiTags('medical-records')
@ApiBearerAuth('access-token')
@ApiStandardErrors()
@Controller('medical-records')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicalRecordsController {
  constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

  @Get('me')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'List patient medical records' })
  listMyRecords(@CurrentUser() user: AuthenticatedUser) {
    return this.medicalRecordsService.listRecords(user);
  }

  @Get('me/:id')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Get medical record detail' })
  getMyRecord(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.medicalRecordsService.getRecord(user, id);
  }

  @Post('me')
  @Roles(UserRole.patient, UserRole.admin)
  @ApiOperation({ summary: 'Create medical record' })
  createMyRecord(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMedicalRecordDto,
  ) {
    return this.medicalRecordsService.createRecord(user, dto);
  }

  @Delete('me/:id')
  @Roles(UserRole.patient, UserRole.admin)
  @HttpCode(200)
  @ApiOperation({ summary: 'Delete medical record' })
  deleteMyRecord(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.medicalRecordsService.deleteRecord(user, id);
  }
}
