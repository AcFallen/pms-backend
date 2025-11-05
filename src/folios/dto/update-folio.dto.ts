import { PartialType } from '@nestjs/swagger';
import { CreateFolioDto } from './create-folio.dto';

export class UpdateFolioDto extends PartialType(CreateFolioDto) {}
