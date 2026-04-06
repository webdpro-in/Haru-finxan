/**
 * Pollinations.ai Image Adapter
 * 
 * This adapter uses Pollinations.ai for free, fast image generation.
 * No API keys required - completely free and unlimited!
 * 
 * Features:
 * - Free image generation (no API keys)
 * - Fast generation (2-5 seconds)
 * - Reliable service
 * - Simple URL-based API
 * - Works from both browser and Node.js
 */

import { ImageProvider } from '../../contracts/ImageProvider';

/**
 * Pollinations.ai Image Adapter implementation
 * 
 * Uses Pollinations.ai's free image generation service.
 * Images are generated via simple URL construction - no API calls needed!
 */
export class PollinationsImageAdapter implements ImageProvider {
  private readonly BASE_URL = 'https://image.pollinations.ai/prompt';
  private readonly defaultWidth = 800;
  private readonly defaultHeight = 600;

  /**
   * Search for images - returns placeholder images
   * 
   * Pollinations.ai focuses on generation, not search.
   * 
   * @param query - Search query string
   * @param count - Number of images to return (default: 3)
   * @returns Promise resolving to an array of placeholder image URLs
   */
  async search(query: string, count: number = 3): Promise<string[]> {
    console.warn('PollinationsImageAdapter: Search not supported, returning placeholders');
    return this.getPlaceholderImages(query, count);
  }

  /**
   * Generate an image from a text prompt using Pollinations.ai
   * 
   * This method generates images using Pollinations.ai's free service.
   * The API is URL-based - just construct the URL and the image is generated!
   * 
   * @param prompt - Text description of the image to generate
   * @returns Promise resolving to a publicly accessible URL of the generated image
   */
  async generate(prompt: string): Promise<string> {
    try {
      console.log(`PollinationsImageAdapter: Generating image for: "${prompt}"`);

      // Construct the image URL
      // Pollinations.ai generates images on-demand via URL
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `${this.BASE_URL}/${encodedPrompt}?width=${this.defaultWidth}&height=${this.defaultHeight}&nologo=true&enhance=true`;

      console.log(`PollinationsImageAdapter: Image URL generated`);
      console.log(`  URL: ${imageUrl.substring(0, 100)}...`);

      // The image is generated when the URL is accessed
      // Return the URL immediately - it will generate on first load
      return imageUrl;
    } catch (error: any) {
      console.error('PollinationsImageAdapter generate error:', error.message);
      
      // Fallback to placeholder on error
      console.warn('Falling back to placeholder image');
      return `https://via.placeholder.com/800x600/4facfe/ffffff?text=${encodeURIComponent(prompt.substring(0, 50))}`;
    }
  }

  /**
   * Generate image with custom dimensions
   * 
   * @param prompt - Text description of the image to generate
   * @param width - Image width (default: 800)
   * @param height - Image height (default: 600)
   * @returns Promise resolving to a publicly accessible URL of the generated image
   */
  async generateWithSize(
    prompt: string,
    width: number = this.defaultWidth,
    height: number = this.defaultHeight
  ): Promise<string> {
    try {
      console.log(`PollinationsImageAdapter: Generating ${width}x${height} image`);

      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `${this.BASE_URL}/${encodedPrompt}?width=${width}&height=${height}&nologo=true&enhance=true`;

      return imageUrl;
    } catch (error: any) {
      console.error(`PollinationsImageAdapter generateWithSize error:`, error.message);
      return `https://via.placeholder.com/${width}x${height}/4facfe/ffffff?text=${encodeURIComponent(prompt.substring(0, 50))}`;
    }
  }

  /**
   * Generate image with seed for reproducibility
   * 
   * @param prompt - Text description of the image to generate
   * @param seed - Seed number for reproducible generation
   * @returns Promise resolving to a publicly accessible URL of the generated image
   */
  async generateWithSeed(prompt: string, seed: number): Promise<string> {
    try {
      const encodedPrompt = encodeURIComponent(prompt);
      const imageUrl = `${this.BASE_URL}/${encodedPrompt}?width=${this.defaultWidth}&height=${this.defaultHeight}&seed=${seed}&nologo=true&enhance=true`;

      console.log(`PollinationsImageAdapter: Generated with seed ${seed}`);
      return imageUrl;
    } catch (error: any) {
      console.error(`PollinationsImageAdapter generateWithSeed error:`, error.message);
      return `https://via.placeholder.com/800x600/4facfe/ffffff?text=${encodeURIComponent(prompt.substring(0, 50))}`;
    }
  }

  /**
   * Get placeholder images for fallback scenarios
   * 
   * @param query - Search query to include in placeholder text
   * @param count - Number of placeholder images to generate
   * @returns Array of publicly accessible placeholder image URLs
   */
  private getPlaceholderImages(query: string, count: number): string[] {
    const images: string[] = [];

    for (let i = 0; i < count; i++) {
      images.push(
        `https://via.placeholder.com/800x600/4facfe/ffffff?text=${encodeURIComponent(query)}+${i + 1}`
      );
    }

    return images;
  }
}
