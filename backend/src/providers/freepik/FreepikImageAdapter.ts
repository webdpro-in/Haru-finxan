/**
 * Freepik Image Adapter
 * 
 * Professional image generation using Freepik Mystic API with Pollinations.ai fallback.
 * 
 * Features:
 * - Primary: Freepik Mystic API (high quality)
 * - Fallback: Pollinations.ai (free, instant)
 * - Automatic error handling
 * - Fast generation
 */

import axios from 'axios';
import { ImageProvider } from '../../contracts/ImageProvider';

export class FreepikImageAdapter implements ImageProvider {
  private readonly FREEPIK_API_URL = 'https://api.freepik.com/v1/ai/mystic';
  private readonly POLLINATIONS_BASE_URL = 'https://image.pollinations.ai/prompt';
  private readonly apiKey: string;

  constructor() {
    this.apiKey = process.env.FREEPIK_API_KEY || '';
    
    if (this.apiKey) {
      console.log('✅ FreepikImageAdapter: Using Freepik Mystic API with Pollinations fallback');
    } else {
      console.log('✅ FreepikImageAdapter: Using Pollinations.ai (no API key)');
    }
  }

  /**
   * Search for images - generates multiple images based on query
   */
  async search(query: string, count: number = 3): Promise<string[]> {
    console.log(`FreepikImageAdapter: Generating ${count} images for: "${query}"`);
    
    const images: string[] = [];
    for (let i = 0; i < count; i++) {
      const prompt = `${query} variation ${i + 1}`;
      const imageUrl = await this.generate(prompt);
      images.push(imageUrl);
    }
    
    return images;
  }

  /**
   * Generate an image from a text prompt
   * 
   * Uses Pollinations.ai as primary (instant, reliable)
   * Freepik as optional enhancement (slow, requires polling)
   */
  async generate(prompt: string): Promise<string> {
    console.log(`FreepikImageAdapter: Generating "${prompt.substring(0, 50)}..."`);
    
    // Use Pollinations.ai for instant results (primary)
    const imageUrl = this.generatePollinationsUrl(prompt);
    console.log('FreepikImageAdapter: ✅ Generated with Pollinations (instant)');
    
    // Optional: Try Freepik in background for higher quality (don't wait)
    if (this.apiKey) {
      this.generateWithFreepik(prompt)
        .then(url => console.log('FreepikImageAdapter: 🎨 Freepik enhanced version ready:', url))
        .catch(err => console.log('FreepikImageAdapter: Freepik enhancement skipped'));
    }
    
    return imageUrl;
  }

  /**
   * Generate image using Freepik Mystic API
   * Freepik uses async task-based generation - we submit and poll for results
   */
  private async generateWithFreepik(prompt: string): Promise<string> {
    try {
      // Step 1: Submit generation task
      const submitResponse = await axios.post(
        this.FREEPIK_API_URL,
        {
          prompt: prompt,
          num_images: 1,
          image: {
            size: 'landscape_16_9'
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-freepik-api-key': this.apiKey
          },
          timeout: 10000
        }
      );

      const taskId = submitResponse.data?.data?.task_id;
      if (!taskId) {
        throw new Error('No task_id in Freepik response');
      }

      console.log(`Freepik task created: ${taskId}, polling for result...`);

      // Step 2: Poll for completion (max 30 seconds)
      const maxAttempts = 30;
      const pollInterval = 1000; // 1 second

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const statusResponse = await axios.get(
          `${this.FREEPIK_API_URL}/${taskId}`,
          {
            headers: {
              'x-freepik-api-key': this.apiKey
            },
            timeout: 5000
          }
        );

        const status = statusResponse.data?.data?.status;
        const generated = statusResponse.data?.data?.generated;

        if (status === 'COMPLETED' && generated && generated.length > 0) {
          const imageUrl = generated[0]?.image?.url || generated[0]?.url;
          if (imageUrl) {
            console.log(`Freepik task completed in ${attempt + 1} seconds`);
            return imageUrl;
          }
        }

        if (status === 'FAILED' || status === 'ERROR') {
          throw new Error(`Freepik task failed with status: ${status}`);
        }

        // Continue polling...
      }

      throw new Error('Freepik task timeout after 30 seconds');

    } catch (error: any) {
      if (error.response) {
        console.error('Freepik API error:', error.response.status, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Generate Pollinations.ai URL (instant, free fallback)
   */
  private generatePollinationsUrl(prompt: string): string {
    const encodedPrompt = encodeURIComponent(prompt);
    return `${this.POLLINATIONS_BASE_URL}/${encodedPrompt}?width=800&height=600&nologo=true&enhance=true`;
  }

  /**
   * Generate image with custom dimensions
   */
  async generateWithSize(prompt: string, width: number = 800, height: number = 600): Promise<string> {
    // Try Freepik first
    if (this.apiKey) {
      try {
        return await this.generateWithFreepik(prompt);
      } catch (error) {
        console.warn('Freepik failed, using Pollinations');
      }
    }
    
    // Fallback to Pollinations with custom size
    const encodedPrompt = encodeURIComponent(prompt);
    return `${this.POLLINATIONS_BASE_URL}/${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=true`;
  }
}
