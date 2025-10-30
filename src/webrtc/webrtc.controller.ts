import { Controller, Post, Body, Logger } from '@nestjs/common';
import { WebrtcService } from './webrtc.service';
import { SdpDto } from './dto/sdp.dto';

@Controller()
export class WebrtcController {
  private readonly logger = new Logger(WebrtcController.name);

  constructor(private readonly webrtcService: WebrtcService) {}

  @Post('initiate-connection')
  async initiateConnection(@Body() sdpOffer: SdpDto) {
    this.logger.log('POST /initiate-connection - Received SDP offer');

    try {
      const answer = await this.webrtcService.initiateConnection(sdpOffer);
      this.logger.log('Successfully processed WebRTC connection');
      return answer;
    } catch (error) {
      this.logger.error('Error processing WebRTC connection:', error);
      throw error;
    }
  }
}
