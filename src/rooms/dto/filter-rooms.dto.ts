import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RoomStatus } from '../enums/room-status.enum';
import { CleaningStatus } from '../enums/cleaning-status.enum';

export class FilterRoomsDto {
  @ApiPropertyOptional({
    description: 'Search by room number',
    example: '101',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by room status',
    enum: RoomStatus,
    example: RoomStatus.AVAILABLE,
  })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({
    description: 'Filter by cleaning status',
    enum: CleaningStatus,
    example: CleaningStatus.CLEAN,
  })
  @IsOptional()
  @IsEnum(CleaningStatus)
  cleaningStatus?: CleaningStatus;

  @ApiPropertyOptional({
    description: 'Filter by room type public ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  roomTypePublicId?: string;
}
