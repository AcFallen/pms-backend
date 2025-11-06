import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus } from '../enums/room-status.enum';
import { CleaningStatus } from '../enums/cleaning-status.enum';

export class CreateRoomDto {
  @ApiProperty({
    description: 'Room type public ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  @IsNotEmpty()
  roomTypePublicId: string;

  @ApiProperty({
    description: 'Room number',
    example: '101',
    maxLength: 20,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  roomNumber: string;

  @ApiProperty({
    description: 'Floor number',
    example: 1,
    required: false,
  })
  @IsNumber()
  @IsOptional()
  floor?: number;

  @ApiProperty({
    description: 'Room status',
    enum: RoomStatus,
    example: RoomStatus.AVAILABLE,
    default: RoomStatus.AVAILABLE,
    required: false,
  })
  @IsEnum(RoomStatus)
  @IsOptional()
  status?: RoomStatus;

  @ApiProperty({
    description: 'Cleaning status',
    enum: CleaningStatus,
    example: CleaningStatus.CLEAN,
    default: CleaningStatus.CLEAN,
    required: false,
  })
  @IsEnum(CleaningStatus)
  @IsOptional()
  cleaningStatus?: CleaningStatus;

  @ApiProperty({
    description: 'Is room active',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Habitación renovada recientemente',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
