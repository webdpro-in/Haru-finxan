/**
 * Lip Sync Service
 * Synchronizes mouth movements with speech audio.
 *
 * Three sources of mouth motion (in order of preference):
 *   1. AudioContext analyser → real RMS amplitude (HTMLAudioElement only).
 *   2. SpeechSynthesis word boundary events → mouth pulse per word.
 *   3. Time-based oscillation → fallback when no boundary events fire.
 *
 * SpeechSynthesis output cannot be tapped by AudioContext directly (the
 * browser doesn't expose the audio stream), so for browser TTS we use a
 * synthetic envelope driven by `onboundary`. This produces visibly accurate
 * mouth movement even though we don't have the real audio waveform.
 */

import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch';

export class LipSyncService {
  private model: Live2DModel | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private animationFrameId: number | null = null;
  private isSpeaking: boolean = false;
  private syntheticTarget = 0;
  private syntheticCurrent = 0;
  private syntheticStart = 0;

  /**
   * Initialize with Live2D model
   */
  public setModel(model: Live2DModel): void {
    this.model = model;
    console.log('🎤 LipSyncService initialized');
  }

  /**
   * Start lip sync with audio element
   */
  public async startLipSync(audioElement: HTMLAudioElement): Promise<void> {
    if (!this.model) {
      console.warn('⚠️ Model not set for lip sync');
      return;
    }

    try {
      // Create audio context if not exists
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 256;
        
        const bufferLength = this.analyser.frequencyBinCount;
        this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength)) as Uint8Array<ArrayBuffer>;
      }

      // Connect audio element to analyser
      const source = this.audioContext.createMediaElementSource(audioElement);
      if (this.analyser) {
        source.connect(this.analyser);
        this.analyser.connect(this.audioContext.destination);
      }

      this.isSpeaking = true;
      this.updateMouthMovement();

      console.log('🎤 Lip sync started');
    } catch (error) {
      console.error('❌ Failed to start lip sync:', error);
      // Fallback to simple lip sync if audio analysis fails
      this.startSimpleLipSync();
    }
  }

  /**
   * Start lip sync with simple animation (no audio analysis).
   * Used during browser SpeechSynthesis playback. Mouth value is driven
   * by `pulseFromBoundary()` calls + a smooth decay envelope; if no
   * boundary events come, we fall back to a continuous time-based oscillation
   * that simulates natural speech rhythm.
   */
  public startSimpleLipSync(): void {
    if (!this.model) {
      console.warn('⚠️ Model not set for lip sync');
      return;
    }

    this.isSpeaking = true;
    this.syntheticTarget = 0.5; // Start with mouth slightly open
    this.syntheticCurrent = 0;
    this.syntheticStart = performance.now();
    this.updateSyntheticMouth();
    console.log('🎤 Synthetic lip sync started');
  }

  /**
   * Pulse the mouth open envelope. Call this on every word boundary
   * (SpeechSynthesisUtterance.onboundary) to drive a per-word mouth pulse.
   */
  public pulseFromBoundary(): void {
    // Random target between 0.5 and 0.95 for more visible mouth movement
    this.syntheticTarget = 0.5 + Math.random() * 0.45;
  }

  /**
   * Stop lip sync
   */
  public stopLipSync(): void {
    this.isSpeaking = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Close mouth
    if (this.model) {
      const coreModel = (this.model.internalModel as any).coreModel;
      if (coreModel && coreModel.setParameterValueById) {
        coreModel.setParameterValueById('ParamMouthOpenY', 0);
      }
    }

    console.log('🎤 Lip sync stopped');
  }

  /**
   * Update mouth movement based on audio analysis
   * Enhanced with smoothing and minimum movement threshold
   */
  private updateMouthMovement(): void {
    if (!this.isSpeaking || !this.model || !this.analyser || !this.dataArray) {
      return;
    }

    // Get audio frequency data
    this.analyser.getByteFrequencyData(this.dataArray);

    // Calculate average volume with emphasis on speech frequencies (200-3000 Hz)
    let sum = 0;
    const speechRange = Math.floor(this.dataArray.length * 0.3); // Focus on speech frequencies
    for (let i = 0; i < speechRange; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / speechRange;

    // Normalize to 0-1 range with better scaling for visibility
    let mouthOpen = Math.min(average / 100, 1.0); // Lower threshold for more sensitivity
    
    // Add minimum baseline movement so mouth is always slightly moving
    const t = performance.now() / 1000;
    const baseline = 0.15 + Math.sin(t * 10) * 0.05; // Continuous subtle movement
    
    // Combine audio-driven movement with baseline
    mouthOpen = Math.max(baseline, mouthOpen);
    
    // Smooth the movement for more natural look
    if (!this.syntheticCurrent) this.syntheticCurrent = mouthOpen;
    this.syntheticCurrent += (mouthOpen - this.syntheticCurrent) * 0.3;

    // Apply to model
    const coreModel = (this.model.internalModel as any).coreModel;
    if (coreModel && coreModel.setParameterValueById) {
      coreModel.setParameterValueById('ParamMouthOpenY', this.syntheticCurrent);
    }

    // Continue animation
    this.animationFrameId = requestAnimationFrame(() => this.updateMouthMovement());
  }

  /**
   * Synthetic envelope: smoothly approach `syntheticTarget`, decay back
   * toward a baseline between pulses, with continuous oscillation that
   * simulates natural speech rhythm. The mouth moves every frame to look
   * like the character is actively speaking.
   */
  private updateSyntheticMouth = (): void => {
    if (!this.isSpeaking || !this.model) return;

    // Smooth toward target with faster response for more reactive movement
    this.syntheticCurrent += (this.syntheticTarget - this.syntheticCurrent) * 0.25;
    
    // Decay target slower so mouth stays open longer per word
    this.syntheticTarget *= 0.92;

    // Continuous baseline oscillation that simulates natural speech rhythm
    // This ensures the mouth is ALWAYS moving while speaking
    const t = (performance.now() - this.syntheticStart) / 1000;
    
    // Primary speech rhythm (3-5 Hz, typical syllable rate)
    const primaryWave = Math.sin(t * 12) * 0.15; // Faster, more visible
    
    // Secondary micro-movements for realism
    const secondaryWave = Math.sin(t * 25) * 0.08;
    
    // Tertiary subtle variation
    const tertiaryWave = Math.sin(t * 8) * 0.05;
    
    // Combine waves for natural-looking continuous movement
    const baseline = 0.25 + primaryWave + secondaryWave + tertiaryWave;
    
    // Final mouth value: target pulse + continuous baseline
    // Ensures mouth is always moving between 0.15 and 1.0
    const mouthOpen = Math.max(0.15, Math.min(1, this.syntheticCurrent + baseline));

    const coreModel = (this.model.internalModel as any).coreModel;
    if (coreModel && coreModel.setParameterValueById) {
      try {
        coreModel.setParameterValueById('ParamMouthOpenY', mouthOpen);
      } catch { /* model destroyed */ }
    }

    this.animationFrameId = requestAnimationFrame(this.updateSyntheticMouth);
  };

  /**
   * Cleanup
   */
  public destroy(): void {
    this.stopLipSync();
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    this.analyser = null;
    this.dataArray = null;
    this.model = null;
  }
}

// Singleton instance
export const lipSyncService = new LipSyncService();
