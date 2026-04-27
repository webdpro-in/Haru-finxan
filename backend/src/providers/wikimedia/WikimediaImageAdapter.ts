/**
 * Wikimedia Image Adapter — real, accuracy-first image search.
 *
 * Educational topics deserve real photos/diagrams (NASA, Wikipedia, etc.),
 * not AI-generated art that hallucinates. This adapter queries the Wikipedia
 * search API + pageimages prop to fetch the lead image of the most relevant
 * article. Free, keyless, fast.
 *
 * If Wikipedia returns nothing, falls back to PollinationsImageAdapter so we
 * never leave the user staring at an empty panel.
 */

import { ImageProvider } from '../../contracts/ImageProvider.js';
import { PollinationsImageAdapter } from '../pollinations/PollinationsImageAdapter.js';

interface WikiPage {
  pageid: number;
  title: string;
  thumbnail?: { source: string; width: number; height: number };
  original?: { source: string; width: number; height: number };
  index?: number;
}

interface WikiSearchResponse {
  query?: { pages?: Record<string, WikiPage> };
}

export class WikimediaImageAdapter implements ImageProvider {
  private readonly endpoint = 'https://en.wikipedia.org/w/api.php';
  private fallback = new PollinationsImageAdapter();

  async search(query: string, count = 3): Promise<string[]> {
    try {
      const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        origin: '*',
        prop: 'pageimages',
        piprop: 'original|thumbnail',
        pithumbsize: '800',
        pilimit: String(count),
        generator: 'search',
        gsrsearch: query,
        gsrlimit: String(count),
        gsrnamespace: '0',
      });

      const res = await fetch(`${this.endpoint}?${params.toString()}`);
      if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
      const data = (await res.json()) as WikiSearchResponse;

      const pages = Object.values(data.query?.pages || {});
      pages.sort((a, b) => (a.index ?? 999) - (b.index ?? 999));

      const urls = pages
        .map((p) => p.original?.source || p.thumbnail?.source)
        .filter((u): u is string => Boolean(u))
        .slice(0, count);

      if (urls.length === 0) {
        console.log(`WikimediaImageAdapter: no results for "${query}", falling back`);
        return this.fallback.search(query, count);
      }

      console.log(`WikimediaImageAdapter: found ${urls.length} real images for "${query}"`);
      return urls;
    } catch (err) {
      console.warn('WikimediaImageAdapter search failed, falling back:', (err as Error).message);
      return this.fallback.search(query, count);
    }
  }

  /**
   * For "generate" we still prefer real imagery: take the top search result.
   * Only fall through to Pollinations AI generation if Wikipedia has nothing.
   */
  async generate(prompt: string): Promise<string> {
    const results = await this.search(prompt, 1);
    if (results[0]) return results[0];
    return this.fallback.generate(prompt);
  }
}
