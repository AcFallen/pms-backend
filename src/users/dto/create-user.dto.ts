import { IsEmail, IsString, IsNotEmpty, MinLength, MaxLength, IsNumber, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { UserRole } from '../enums/user-role.enum';

export class CreateUserDto {
  @IsNumber()
  @IsNotEmpty()
  tenantId: number;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
