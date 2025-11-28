import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/enums/user-role.enum';

export class UserData {
  @ApiProperty({
    description: 'User public ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  publicId: string;

  @ApiProperty({
    description: 'User email address',
    example: 'admin@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'System',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Admin',
  })
  lastName: string;

  @ApiProperty({
    description: 'User role',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  role: UserRole;

  @ApiProperty({
    description: 'Tenant ID',
    example: 1,
  })
  tenantId: number;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: 'Refresh token',
    example: 'a1b2c3d4e5f6g7h8i9j0...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'User information',
    type: UserData,
  })
  user: UserData;
}
