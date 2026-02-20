/**
 * Cliente OpenAI singleton.
 * Solo se instancia si OPENAI_API_KEY esta configurada.
 */
import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new OpenAIKeyMissingError();
  }

  if (!_client) {
    _client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return _client;
}

export function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export class OpenAIKeyMissingError extends Error {
  constructor() {
    super(
      'OPENAI_API_KEY no esta configurada. ' +
      'El padre debe anadir su API key en .env.local para generar historias.'
    );
    this.name = 'OpenAIKeyMissingError';
  }
}
