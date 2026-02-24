import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';

@Controller('chat') 
export class ChatController {
  constructor(private readonly chat: ChatService) {} 

  // Endpoint SIN streaming
  @Post()
  async chatOnce(@Body() body: { message?: string }) {
    // Validamos que el mensaje exista
    const message = body?.message?.trim();
    if (!message) throw new BadRequestException('message is required');

    // servicio que genera la respuesta
    const text = await this.chat.chatOnce(message);
    return { text };
  }

  // Endpoint CON streaming 
  @Get('stream')
  async chatStream(@Query('message') message: string, @Res() res: Response) {
    const msg = (message ?? '').trim();
    if (!msg) throw new BadRequestException('message query param is required');

    // cabeceras para SSE 
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');

    // Enviamos evento inicial
    res.write(`event: ready\ndata: {}\n\n`);

    try {
      // Itera sobre los chunks 
      for await (const delta of this.chat.chatStream(msg)) {
        // Envia chunks al cliente
        res.write(`event: delta\ndata: ${JSON.stringify({ delta })}\n\n`);
      }

      res.write(`event: done\ndata: {}\n\n`);
      res.end(); 
    } catch (err: any) {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          message: err?.message ?? 'Unknown error',
        })}\n\n`,
      );
      res.end();
    }
  }
}