import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Put,
  Query,
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
import { DoctorsService } from './doctors.service';
import { ListDoctorsQueryDto } from './dto/list-doctors-query.dto';
import {
  PatchAvailabilityDto,
  UpdateAvailabilityDto,
} from './dto/update-availability.dto';

@ApiTags('doctors')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  @ApiOperation({ summary: 'Search doctors (paginated)' })
  listDoctors(@Query() query: ListDoctorsQueryDto) {
    return this.doctorsService.listDoctors(query);
  }

  @Get('online')
  @ApiOperation({ summary: 'List online doctors (paginated)' })
  listOnlineDoctors(@Query() query: ListDoctorsQueryDto) {
    return this.doctorsService.listOnlineDoctors(query);
  }

  @Get('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.doctor, UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get own availability schedule' })
  @ApiStandardErrors()
  getMyAvailability(@CurrentUser() user: AuthenticatedUser) {
    return this.doctorsService.getMyAvailability(user);
  }

  @Put('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.doctor, UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Replace availability schedule' })
  @ApiStandardErrors()
  replaceAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.doctorsService.replaceAvailability(user, dto);
  }

  @Patch('me/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.doctor, UserRole.admin)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Merge availability schedule' })
  @ApiStandardErrors()
  patchAvailability(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PatchAvailabilityDto,
  ) {
    return this.doctorsService.patchAvailability(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get doctor detail by profile id' })
  getDoctorById(@Param('id') id: string) {
    return this.doctorsService.getDoctorById(id);
  }
}
