import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../../src/common/guards/roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  const guard = new RolesGuard(reflector);

  const buildContext = (user?: { id: string; email: string; role: UserRole }) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(undefined);

    expect(guard.canActivate(buildContext())).toBe(true);
  });

  it('allows access when user has required role', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue([UserRole.patient]);

    expect(
      guard.canActivate(
        buildContext({ id: '1', email: 'a@b.com', role: UserRole.patient }),
      ),
    ).toBe(true);
  });

  it('denies access when user role does not match', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue([UserRole.doctor]);

    expect(() =>
      guard.canActivate(
        buildContext({ id: '1', email: 'a@b.com', role: UserRole.patient }),
      ),
    ).toThrow('Insufficient role permissions');
  });
});
