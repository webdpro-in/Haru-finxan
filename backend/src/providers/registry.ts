import { AIProvider } from '../contracts/AIProvider.js';
import { TTSProvider } from '../contracts/TTSProvider.js';
import { STTProvider } from '../contracts/STTProvider.js';
import { ImageProvider } from '../contracts/ImageProvider.js';

/**
 * Provider Registry
 *
 * Defaults: AI=groq, Image=pollinations (free), TTS=aws-polly, STT=aws-transcribe.
 * Environment overrides: AI_PROVIDER, IMAGE_PROVIDER, TTS_PROVIDER, STT_PROVIDER.
 */
export class ProviderRegistry {
  private static aiProvider: AIProvider | null = null;
  private static ttsProvider: TTSProvider | null = null;
  private static sttProvider: STTProvider | null = null;
  private static imageProvider: ImageProvider | null = null;

  static async getAIProvider(): Promise<AIProvider> {
    if (!this.aiProvider) {
      this.aiProvider = await this.createAIProvider(process.env.AI_PROVIDER || 'groq');
    }
    return this.aiProvider;
  }

  /** Build a one-off AI provider with a user-supplied API key (no caching). */
  static async createAIProviderWithKey(providerName: string, apiKey: string): Promise<AIProvider> {
    return this.createAIProvider(providerName, apiKey);
  }

  static async getTTSProvider(): Promise<TTSProvider> {
    if (!this.ttsProvider) {
      this.ttsProvider = await this.createTTSProvider(process.env.TTS_PROVIDER || 'aws-polly');
    }
    return this.ttsProvider;
  }

  static async getSTTProvider(): Promise<STTProvider> {
    if (!this.sttProvider) {
      this.sttProvider = await this.createSTTProvider(process.env.STT_PROVIDER || 'aws-transcribe');
    }
    return this.sttProvider;
  }

  static async getImageProvider(): Promise<ImageProvider> {
    if (!this.imageProvider) {
      this.imageProvider = await this.createImageProvider(process.env.IMAGE_PROVIDER || 'pollinations');
    }
    return this.imageProvider;
  }

  private static async createAIProvider(name: string, apiKey?: string): Promise<AIProvider> {
    switch (name) {
      case 'groq': {
        const { GroqAdapter } = await import('./groq/GroqAdapter.js');
        return new GroqAdapter(apiKey);
      }
      case 'openai': {
        const { OpenAIAdapter } = await import('./openai/OpenAIAdapter.js');
        return new OpenAIAdapter(apiKey);
      }
      case 'gemini': {
        const { GeminiAdapter } = await import('./gemini/GeminiAdapter.js');
        return new GeminiAdapter(apiKey);
      }
      default:
        throw new Error(`Unknown AI provider: ${name}. Available: groq, openai, gemini`);
    }
  }

  private static async createTTSProvider(name: string): Promise<TTSProvider> {
    switch (name) {
      case 'aws-polly': {
        const { AWSPollyAdapter } = await import('./aws/AWSPollyAdapter.js');
        return new AWSPollyAdapter();
      }
      default:
        throw new Error(`Unknown TTS provider: ${name}. Available: aws-polly`);
    }
  }

  private static async createSTTProvider(name: string): Promise<STTProvider> {
    switch (name) {
      case 'aws-transcribe': {
        const { AWSTranscribeAdapter } = await import('./aws/AWSTranscribeAdapter.js');
        return new AWSTranscribeAdapter();
      }
      default:
        throw new Error(`Unknown STT provider: ${name}. Available: aws-transcribe`);
    }
  }

  private static async createImageProvider(name: string): Promise<ImageProvider> {
    switch (name) {
      case 'pollinations': {
        const { PollinationsImageAdapter } = await import('./pollinations/PollinationsImageAdapter.js');
        return new PollinationsImageAdapter();
      }
      case 'openrouter': {
        const { OpenRouterImageAdapter } = await import('./openrouter/OpenRouterImageAdapter.js');
        return new OpenRouterImageAdapter();
      }
      case 'freepik': {
        const { FreepikImageAdapter } = await import('./freepik/FreepikImageAdapter.js');
        return new FreepikImageAdapter();
      }
      default:
        throw new Error(`Unknown Image provider: ${name}. Available: pollinations, openrouter, freepik`);
    }
  }

  static reset(): void {
    this.aiProvider = null;
    this.ttsProvider = null;
    this.sttProvider = null;
    this.imageProvider = null;
  }
}
