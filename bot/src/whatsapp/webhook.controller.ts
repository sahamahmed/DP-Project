import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { BotService } from '../bot.service';
import { WhatsappBodyPayload } from '../interfaces/whatsapp.interface';

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly verifyToken: string;

  constructor(
    private readonly botService: BotService,
    private readonly configService: ConfigService,
  ) {
    this.verifyToken =
      this.configService.get<string>('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || '';
  }

  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    this.logger.log('Webhook verification request received');

    if (mode === 'subscribe' && token === this.verifyToken) {
      this.logger.log('Webhook verified successfully');
      return challenge;
    }

    this.logger.warn('Webhook verification failed');
    return 'Verification failed';
  }

  @Post()
  async handleIncomingMessage(
    @Body() body: WhatsappBodyPayload,
    @Res() res: Response,
  ) {
    res.status(200).send('OK');
    await this.botService.handleIncomingMessage(body);
  }
}
