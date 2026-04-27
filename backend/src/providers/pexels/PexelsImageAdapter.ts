/**
 * Pexels image search adapter.
 *
 * Uses the public Pexels API to fetch real photographs / illustrations for a
 * given query.  Pexels is free, keyed (PEXELS_API_KEY), and gives high-quality
 * landscape images perfect for the Visual Aids panel.
 *
 * `generate()` is implemented as a `search()` shortcut — Pexels has no AI
 * generation endpoint, but for our use case "find a relevant photograph for
 * this prompt" is the same query.
 */
import { ImageProvider } from '../../contracts/ImageProvider.js';

interface PexelsPhoto {
  id: number;
  url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
  };
}
interface PexelsSearchResponse {
  photos: PexelsPhoto[];
}

export class PexelsImageAdapter implements ImageProvider {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.PEXELS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[Pexels] PEXELS_API_KEY not set — image search calls will fail.');
    }
  }

  async search(query: string, count: number = 3): Promise<string[]> {
    if (!this.apiKey) return [];

    const params = new URLSearchParams({
      query,
      per_page: String(Math.max(1, Math.min(count, 10))),
      orientation: 'landscape',
    });

    try {
      const res = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
        headers: { Authorization: this.apiKey },
      });
      if (!res.ok) {
        console.warn(`[Pexels] search failed ${res.status} for "${query}"`);
        return [];
      }
      const data = (await res.json()) as PexelsSearchResponse;
      return (data.photos || [])
        // `large` is ~940x650 — fits the Visual Aids stage well without
        // pulling 5MB originals.
        .map((p) => p.src.large || p.src.medium || p.src.original)
        .filter(Boolean)
        .slice(0, count);
    } catch (err) {
      console.warn('[Pexels] fetch error:', err);
      return [];
    }
  }

  /** Single best image for a prompt — used by the chat route's auto image pick. */
  async generate(prompt: string): Promise<string> {
    const results = await this.search(prompt, 1);
    if (results[0]) return results[0];
    throw new Error(`Pexels: no image found for "${prompt}"`);
  }
}
