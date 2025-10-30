import { IsString, IsIn } from 'class-validator';

export class SdpDto {
  @IsString()
  sdp: string;

  @IsIn(['offer', 'answer', 'pranswer', 'rollback'])
  type: RTCSdpType;
}
