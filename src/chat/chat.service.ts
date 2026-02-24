import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

@Injectable() 
export class ChatService {
  private readonly useMock: boolean;
  private readonly client?: OpenAI; 
  private readonly model: string;     
  constructor(private readonly config: ConfigService) {

    this.useMock = (this.config.get<string>('USE_MOCK') ?? 'false') === 'true';
    this.model = this.config.get<string>('OPENAI_MODEL') ?? 'gpt-5';
    const apiKey = this.config.get<string>('OPENAI_API_KEY');

    // Si no es modo mock, configuramos cliente OpenAI
    if (!this.useMock) {
      if (!apiKey) throw new Error('Falta OPENAI_API_KEY en .env');
      this.client = new OpenAI({ apiKey });
    }
  }

  //Método sin streaming
  async chatOnce(message: string): Promise<string> {
    // Si está en modo mock, regresamos texto simulado
    if (this.useMock) {
      return 'Texto para hacer test del text streaming';
    }

    // Llamada a OpenAI
    const resp = await this.client!.responses.create({
      model: this.model,
      input: [{ role: 'user', content: message }],
    });
    return resp.output_text ?? '';
  }

  // Método con streaming
  async *chatStream(message: string): AsyncGenerator<string> {
    // Modo mock: simulamos streaming dividiendo texto en palabras
    if (this.useMock) {
      const fake = 'Texto para hacer test del text streaming';

      const words = fake.split(' ');
      for (const w of words) {
        yield (w + ' ');  // Envia cada palabra
        await sleep(80);  
      }
      return;
    }

    const stream = await this.client!.responses.create({
      model: this.model,
      input: [{ role: 'user', content: message }],
      stream: true, 
    });

    for await (const event of stream) {

      // Evento cuando llega un fragmento de texto
      // @ts-ignore
      if (event.type === 'response.output_text.delta') {
        // @ts-ignore
        yield event.delta ?? '';
      }

      // Evento de error
      // @ts-ignore
      if (event.type === 'error') {
        // @ts-ignore
        throw new Error(event.error?.message ?? 'OpenAI stream error');
      }
    }
  }
}