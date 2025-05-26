import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum } from "class-validator";

export class InviteResponseDto {
  @ApiProperty({ description: 'Invite token' })
  @IsString()
  token: string;

  @ApiProperty({ 
    description: 'Response to the invite',
    enum: ['accepted', 'declined']
  })
  @IsEnum(['accepted', 'declined'])
  response: 'accepted' | 'declined';
}