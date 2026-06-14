import { IsString } from "class-validator";

export class QzSignRequestDto {
  @IsString()
  request!: string;
}
