import { PartialType } from '@nestjs/swagger';
import { CreateFolioChargeDto } from './create-folio-charge.dto';

export class UpdateFolioChargeDto extends PartialType(CreateFolioChargeDto) {}
