/**
 * Gemini API Client Wrapper
 * 
 * Provides a robust client for interacting with Google Gemini API with:
 * - Streaming response handling
 * - Retry logic with exponential backoff
 * - Rate limiting and usage tracking
 * - Fallback responses on failure
 * - System prompt building
 */

import { AIMessage } from '../contracts/AIProvider.js';

export interface GeminiConfig {
  apiKey: string;
  model: string;
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  timeout?: number;
}

export interface GeminiStreamChunk {
  text: string;
  isComplete: boolean;
}

export interface GeminiUsageStats {
  requestCount: number;
  tokenCount: number;
  errorCount: number;
  lastRequestTime: number;
}

export interface GeminiResponse {
  text: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface GeminiAPIResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: Array<any>;
  }>;
  promptFeedback?: {
    safetyRatings: Array<any>;
  };
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiClient {
  private config: Required<GeminiConfig>;
  private apiEndpoint: string;
  private usageStats: GeminiUsageStats;
  private rateLimitWindow: number = 60000; // 1 minute
  private maxRequestsPerWindow: number = 60;

  constructor(config: GeminiConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model,
      maxRetries: config.maxRetries ?? 3,
      baseDelay: config.baseDelay ?? 1000,
      maxDelay: config.maxDelay ?? 10000,
      timeout: config.timeout ?? 30000,
    };

    this.apiEndpoint = 'https://generativelanguage.googleapis.com/v1beta';
    
    this.usageStats = {
      requestCount: 0,
      tokenCount: 0,
      errorCount: 0,
      lastRequestTime: 0,
    };

    if (!this.config.apiKey) {
      throw new Error('Gemini API key is required');
    }
  }

  /**
   * Generate a response from Gemini API with retry logic
   */
  async generateResponse(
    message: string,
    systemPrompt: string,
    history?: AIMessage[]
  ): Promise<GeminiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // Check rate limit
        await this.checkRateLimit();

        // Build request payload
        const payload = this.buildPayload(message, systemPrompt, history);

        // Make API call
        const response = await this.makeRequest(payload);

        // Update usage stats
        this.updateUsageStats(response);

        // Extract and return response
        return this.extractResponse(response);
      } catch (error) {
        lastError = error as Error;
        this.usageStats.errorCount++;

        // Don't retry on last attempt
        if (attempt === this.config.maxRetries) {
          break;
        }

        // Calculate backoff delay
        const delay = this.calculateBackoff(attempt);
        console.warn(`Gemini API attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
        
        await this.sleep(delay);
      }
    }

    // All retries failed, throw error
    throw new Error(`Gemini API failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Stream response from Gemini API
   */
  async *streamResponse(
    message: string,
    systemPrompt: string,
    history?: AIMessage[]
  ): AsyncGenerator<GeminiStreamChunk> {
    try {
      // Check rate limit
      await this.checkRateLimit();

      // Build request payload
      const payload = this.buildPayload(message, systemPrompt, history);

      // Make streaming API call
      const url = `${this.apiEndpoint}/models/${this.config.model}:streamGenerateContent`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      // Stream response chunks
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        
        // Process complete JSON objects from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line) as GeminiAPIResponse;
              const text = this.extractTextFromResponse(data);
              
              yield {
                text,
                isComplete: false,
              };
            } catch (e) {
              // Skip invalid JSON
              continue;
            }
          }
        }
      }

      // Final chunk
      yield {
        text: '',
        isComplete: true,
      };

      this.usageStats.requestCount++;
      this.usageStats.lastRequestTime = Date.now();
    } catch (error) {
      this.usageStats.errorCount++;
      throw error;
    }
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): GeminiUsageStats {
    return { ...this.usageStats };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.usageStats = {
      requestCount: 0,
      tokenCount: 0,
      errorCount: 0,
      lastRequestTime: 0,
    };
  }

  /**
   * Build request payload
   */
  private buildPayload(
    message: string,
    systemPrompt: string,
    history?: AIMessage[]
  ): any {
    const contents: Array<{ parts: Array<{ text: string }> }> = [];

    // Add conversation history if provided
    if (history && history.length > 0) {
      for (const msg of history) {
        contents.push({
          parts: [{ text: msg.content }],
        });
      }
    }

    // Add system prompt as first message if no history
    if (!history || history.length === 0) {
      contents.push({
        parts: [{ text: systemPrompt }],
      });
    }

    // Add current user message
    contents.push({
      parts: [{ text: message }],
    });

    return { contents };
  }

  /**
   * Make API request with timeout
   */
  private async makeRequest(payload: any): Promise<GeminiAPIResponse> {
    const url = `${this.apiEndpoint}/models/${this.config.model}:generateContent`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': this.config.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      return await response.json() as GeminiAPIResponse;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Extract response from API response
   */
  private extractResponse(data: GeminiAPIResponse): GeminiResponse {
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error('No response from Gemini API');
    }

    const candidate = data.candidates[0];
    const text = this.extractTextFromResponse(data);

    return {
      text,
      finishReason: candidate.finishReason,
      usage: data.usageMetadata ? {
        promptTokens: data.usageMetadata.promptTokenCount,
        completionTokens: data.usageMetadata.candidatesTokenCount,
        totalTokens: data.usageMetadata.totalTokenCount,
      } : undefined,
    };
  }

  /**
   * Extract text from API response
   */
  private extractTextFromResponse(data: GeminiAPIResponse): string {
    if (!data.candidates || data.candidates.length === 0) {
      return '';
    }

    const candidate = data.candidates[0];
    return candidate.content.parts.map(part => part.text).join('');
  }

  /**
   * Update usage statistics
   */
  private updateUsageStats(response: GeminiAPIResponse): void {
    this.usageStats.requestCount++;
    this.usageStats.lastRequestTime = Date.now();

    if (response.usageMetadata) {
      this.usageStats.tokenCount += response.usageMetadata.totalTokenCount;
    }
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.usageStats.lastRequestTime;

    // Reset counter if outside window
    if (timeSinceLastRequest > this.rateLimitWindow) {
      this.usageStats.requestCount = 0;
    }

    // Check if we've exceeded rate limit
    if (this.usageStats.requestCount >= this.maxRequestsPerWindow) {
      const waitTime = this.rateLimitWindow - timeSinceLastRequest;
      if (waitTime > 0) {
        console.warn(`Rate limit reached, waiting ${waitTime}ms...`);
        await this.sleep(waitTime);
        this.usageStats.requestCount = 0;
      }
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = this.config.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
    return Math.min(delay + jitter, this.config.maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
