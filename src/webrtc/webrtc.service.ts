import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SdpDto } from './dto/sdp.dto';

@Injectable()
export class WebrtcService {
  private readonly logger = new Logger(WebrtcService.name);
  private readonly OPENAI_REALTIME_URL = 'https://api.openai.com/v1/realtime';

  constructor(private configService: ConfigService) {}

  async initiateConnection(
    sdpOffer: SdpDto,
  ): Promise<{ sdp: string; type: string }> {
    try {
      this.logger.log('Received SDP offer from client');
      this.logger.debug(`SDP Type: ${sdpOffer.type}`);

      const apiKey = this.configService.get<string>('OPENAI_API_KEY');
      if (!apiKey || apiKey === 'your_openai_api_key_here') {
        throw new Error(
          'OPENAI_API_KEY is not configured. Please add your real OpenAI API key to the .env file',
        );
      }

      // Forward the SDP offer to OpenAI Real-time API
      this.logger.log('Forwarding SDP offer to OpenAI Real-time API...');

      const response = await fetch(
        `${this.OPENAI_REALTIME_URL}?model=gpt-4o-realtime-preview-2024-12-17`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/sdp',
          },
          body: sdpOffer.sdp,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `OpenAI API error: ${response.status} - ${errorText}`,
        );
        throw new Error(`OpenAI API responded with status: ${response.status}`);
      }

      // Get the SDP answer from OpenAI
      const answerSdp = await response.text();
      this.logger.log('Received SDP answer from OpenAI');
      this.logger.debug(`Answer SDP length: ${answerSdp.length}`);

      return {
        sdp: answerSdp,
        type: 'answer',
      };
    } catch (error) {
      this.logger.error('Error in initiateConnection:', error);
      throw error;
    }
  }
}
