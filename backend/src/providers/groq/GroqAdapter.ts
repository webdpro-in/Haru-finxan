/**
 * Groq AI Provider Adapter
 * 
 * Implements the AIProvider contract for Groq's API.
 * Groq provides ultra-fast inference using LPU hardware.
 * API is OpenAI-compatible, making integration straightforward.
 * 
 * Models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
 */

import { AIProvider, AIMessage, AIResponse } from '../../contracts/AIProvider.js';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface GroqResponse {
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

export class GroqAdapter implements AIProvider {
  private apiKey: string;
  private model: string;
  private apiEndpoint: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    this.model = model || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    this.apiEndpoint = 'https://api.groq.com/openai/v1';

    if (!this.apiKey) {
      console.warn('⚠️  GROQ_API_KEY not set. Groq adapter will fail at runtime.');
    }
  }

  async chat(
    message: string,
    systemPrompt: string,
    history?: AIMessage[]
  ): Promise<AIResponse> {
    try {
      // Build messages array in OpenAI-compatible format
      const messages: GroqMessage[] = [];

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
        stream: false,
      };

      // Call Groq API (OpenAI-compatible endpoint)
      const url = `${this.apiEndpoint}/chat/completions`;
      
      console.log('🔗 Calling Groq API:', url);
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
        console.error('❌ Groq API error:', response.status, errorText);
        throw new Error(`Groq API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json() as GroqResponse;
      console.log('✅ Groq API response received');
      console.log('   Tokens used:', data.usage?.total_tokens || 'unknown');
      console.log('   Model:', data.model);

      // Normalize output to AIResponse contract format
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Groq API');
      }

      const choice = data.choices[0];
      const text = choice.message.content;

      // Return normalized response matching the contract
      return {
        text,
        images: [],
      };
    } catch (error) {
      console.error('GroqAdapter error:', error);
      throw new Error(`Failed to get AI response from Groq: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
