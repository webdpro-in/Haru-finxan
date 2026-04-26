/**
 * OpenAI Provider Adapter
 * 
 * Implements the AIProvider contract for OpenAI API.
 * Supports GPT-4, GPT-3.5-turbo, and other OpenAI models.
 * 
 * Architecture: This adapter normalizes OpenAI's API responses to match
 * the stable AIProvider contract, ensuring the core application remains
 * vendor-agnostic and can switch to other providers via environment variables.
 */

import { AIProvider, AIMessage, AIResponse } from '../../contracts/AIProvider.js';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIAdapter implements AIProvider {
  private apiKey: string;
  private model: string;
  private apiEndpoint: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.model = model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.apiEndpoint = 'https://api.openai.com/v1';

    if (!this.apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set. OpenAI adapter will fail at runtime.');
    }
  }

  async chat(
    message: string,
    systemPrompt: string,
    history?: AIMessage[]
  ): Promise<AIResponse> {
    try {
      // Build messages array in OpenAI format
      const messages: OpenAIMessage[] = [];

      // Add system prompt
      messages.push({
        role: 'system',
        content: systemPrompt,
      });

      // Add conversation history if provided
      if (history && history.length > 0) {
        for (const msg of history) {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content,
          });
        }
      }

      // Add current user message
      messages.push({
        role: 'user',
        content: message,
      });

      // Prepare request payload
      const payload = {
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      };

      // Call OpenAI API
      const url = `${this.apiEndpoint}/chat/completions`;
      
      console.log('🔗 Calling OpenAI API:', url);
      console.log('📦 Model:', this.model);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as OpenAIResponse;
      console.log('✅ OpenAI API response received');
      console.log('   Tokens used:', data.usage?.total_tokens || 'unknown');

      // Normalize output to AIResponse contract format
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from OpenAI API');
      }

      const choice = data.choices[0];
      const text = choice.message.content;

      // Return normalized response matching the contract
      return {
        text,
        images: [], // OpenAI chat models don't return images
      };
    } catch (error) {
      console.error('OpenAIAdapter error:', error);
      throw new Error(`Failed to get AI response from OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
