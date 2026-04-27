/**
 * Text-to-Speech Provider Contract Interface
 * 
 * This contract defines a stable interface for TTS (Text-to-Speech) providers, enabling
 * the application to switch between different speech synthesis services (AWS Polly,
 * ElevenLabs, local TTS engines, etc.) without modifying core logic. All TTS provider
 * adapters must implement this interface.
 * 
 * The contract follows the Dependency Inversion Principle: high-level application logic
 * depends on this stable interface, while low-level vendor implementations are pluggable
 * adapters that implement the contract.
 */

/**
 * TTS Provider interface that all speech synthesis service adapters must implement
 * 
 * This interface abstracts away vendor-specific implementation details and provides
 * a consistent API for text-to-speech conversion. Adapters are responsible for:
 * - Handling vendor-specific authentication and configuration
 * - Converting text to speech using the vendor's API
 * - Ensuring audio output is accessible via a consistent URL format
 * - Managing audio format conversion if needed
 * - Handling errors and providing descriptive error messages
 */
export interface TTSProvider {
  /**
   * Synthesize text to speech and return a publicly accessible audio URL
   * 
   * This method converts the provided text into spoken audio using the specified
   * voice and language. The returned URL must be publicly accessible and point to
   * an audio file that can be played by standard web browsers.
   * 
   * @param text - The text content to convert to speech
   * @param voiceId - Voice identifier (provider-specific, e.g., 'Joanna' for AWS Polly, 'en-US-Neural2-F' for Google)
   * @param languageCode - Language code following BCP-47 standard (e.g., 'en-US', 'ja-JP', 'es-ES')
   * @returns Promise resolving to a publicly accessible URL string pointing to the synthesized audio file
   * @throws Error if speech synthesis fails or audio cannot be made accessible
   * 
   * @example
   * ```typescript
   * const provider = new AWSPollyAdapter();
   * const audioUrl = await provider.synthesize(
   *   "Hello, welcome to the lesson!",
   *   "Joanna",
   *   "en-US"
   * );
   * console.log(audioUrl); // https://example.com/audio/speech-123456.mp3
   * ```
   */
  synthesize(
    text: string,
    voiceId: string,
    languageCode: string,
    voiceGender?: 'male' | 'female',
  ): Promise<string>;
}
