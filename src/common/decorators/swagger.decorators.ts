import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

export function ApiStandardErrors() {
  return applyDecorators(
    ApiBadRequestResponse({ description: 'Validation error or invalid input' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' }),
    ApiForbiddenResponse({ description: 'Insufficient role permissions' }),
    ApiNotFoundResponse({ description: 'Resource not found' }),
  );
}
