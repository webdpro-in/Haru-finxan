/**
 * Haru Character System
 * Manages Live2D character animation, emotions, and lip sync
 * 
 * Task Group 10: Haru Character System
 */

import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display';

export type EmotionType = 
  | 'neutral' 
  | 'happy' 
  | 'excited' 
  | 'thinking' 
  | 'confused' 
  | 'encouraging' 
  | 'celebrating';

export interface EmotionConfig {
  motion: string;
  expression?: string;
  duration: number;
}

export class HaruCharacterService {
  private app: PIXI.Application | null = null;
  private model: Live2DModel | null = null;
  private currentEmotion: EmotionType = 'neutral';
  private isTransitioning: boolean = false;
  private lipSyncInterval: number | null = null;

  // Emotion to motion mapping
  private readonly emotionMap: Record<EmotionType, EmotionConfig> = {
    neutral: { motion: 'idle', duration: 3000 },
    happy: { motion: 'happy', duration: 2000 },
    excited: { motion: 'excited', duration: 2500 },
    thinking: { motion: 'thinking', duration: 3000 },
    confused: { motion: 'confused', duration: 2500 },
    encouraging: { motion: 'encouraging', duration: 2000 },
    celebrating: { motion: 'celebrating', duration: 3000 },
  };

  /**
   * 10.1: Integrate Live2D Cubism SDK
   * Initialize PIXI application and Live2D
   */
  async initialize(container: HTMLElement): Promise<void> {
    try {
      // Create PIXI application
      this.app = new PIXI.Application({
        view: document.createElement('canvas'),
        width: 800,
        height: 800,
        backgroundColor: 0x000000,
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      container.appendChild(this.app.view as HTMLCanvasElement);

      console.log('✅ PIXI Application initialized');

      // Load Haru model
      await this.loadModel();
    } catch (error) {
      console.error('❌ Failed to initialize Haru Character System:', error);
      throw error;
    }
  }

  /**
   * 10.2: Load Haru model from model3.json
   * Load the Live2D model and configure it
   */
  private async loadModel(): Promise<void> {
    if (!this.app) {
      throw new Error('PIXI Application not initialized');
    }

    try {
      // Load Haru model
      const modelPath = '/haru_greeter_pro_jp/runtime/haru_greeter_t05.model3.json';
      
      this.model = await Live2DModel.from(modelPath, {
        autoInteract: false,
        autoUpdate: true,
      });

      // Scale and position the model
      const scale = Math.min(
        this.app.screen.width / this.model.width,
        this.app.screen.height / this.model.height
      ) * 0.8;

      this.model.scale.set(scale);
      this.model.x = this.app.screen.width / 2;
      this.model.y = this.app.screen.height / 2;
      this.model.anchor.set(0.5, 0.5);

      // Add model to stage
      this.app.stage.addChild(this.model as any);

      console.log('✅ Haru model loaded successfully');
      console.log('Available motions:', this.model.internalModel.motionManager.definitions);

      // Start with idle animation
      this.playMotion('idle', 0);
    } catch (error) {
      console.error('❌ Failed to load Haru model:', error);
      throw error;
    }
  }

  /**
   * 10.3: Implement emotion selection logic
   * Select appropriate emotion based on context
   */
  selectEmotion(context: {
    confusionDetected?: boolean;
    correctAnswer?: boolean;
    encouragementNeeded?: boolean;
    celebrating?: boolean;
  }): EmotionType {
    if (context.celebrating) {
      return 'celebrating';
    }

    if (context.confusionDetected) {
      return 'confused';
    }

    if (context.encouragementNeeded) {
      return 'encouraging';
    }

    if (context.correctAnswer === true) {
      return 'happy';
    }

    if (context.correctAnswer === false) {
      return 'thinking';
    }

    return 'neutral';
  }

  /**
   * 10.4: Implement animation playback
   * Play a specific motion/animation
   */
  private playMotion(motionName: string, priority: number = 2): void {
    if (!this.model) {
      console.warn('Model not loaded, cannot play motion');
      return;
    }

    try {
      // Map motion names to available motions
      const motionMap: Record<string, string> = {
        idle: 'haru_g_idle',
        happy: 'haru_g_m01',
        excited: 'haru_g_m02',
        thinking: 'haru_g_m03',
        confused: 'haru_g_m04',
        encouraging: 'haru_g_m05',
        celebrating: 'haru_g_m06',
      };

      const actualMotion = motionMap[motionName] || motionMap.idle;

      // Play motion
      this.model.motion(actualMotion, priority);

      console.log(`🎭 Playing motion: ${actualMotion}`);
    } catch (error) {
      console.error('Failed to play motion:', error);
    }
  }

  /**
   * 10.5: Implement lip sync with audio
   * Synchronize mouth movements with audio playback
   */
  startLipSync(audioElement: HTMLAudioElement): void {
    if (!this.model) {
      console.warn('Model not loaded, cannot start lip sync');
      return;
    }

    // Stop any existing lip sync
    this.stopLipSync();

    // Create audio context for analysis
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaElementSource(audioElement);
    
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Update lip sync based on audio volume
    const updateLipSync = () => {
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
      const normalizedVolume = average / 255;

      // Update mouth opening parameter
      if (this.model && this.model.internalModel) {
        try {
          // Assuming the model has a mouth opening parameter
          // This may need adjustment based on actual model parameters
          const mouthParam = this.model.internalModel.coreModel.getParameterIndex('ParamMouthOpenY');
          if (mouthParam >= 0) {
            this.model.internalModel.coreModel.setParameterValueById(
              mouthParam,
              normalizedVolume
            );
          }
        } catch (error) {
          // Parameter might not exist, silently continue
        }
      }
    };

    // Start lip sync loop
    this.lipSyncInterval = window.setInterval(updateLipSync, 50);

    // Stop lip sync when audio ends
    audioElement.addEventListener('ended', () => this.stopLipSync(), { once: true });

    console.log('🎤 Lip sync started');
  }

  /**
   * Stop lip sync animation
   */
  stopLipSync(): void {
    if (this.lipSyncInterval !== null) {
      clearInterval(this.lipSyncInterval);
      this.lipSyncInterval = null;
      console.log('🎤 Lip sync stopped');
    }
  }

  /**
   * 10.6: Implement smooth emotion transitions
   * Transition between emotions with smooth animations
   */
  async transitionToEmotion(emotion: EmotionType): Promise<void> {
    if (this.currentEmotion === emotion || this.isTransitioning) {
      return;
    }

    this.isTransitioning = true;

    try {
      const config = this.emotionMap[emotion];

      // Play the motion
      this.playMotion(config.motion, 2);

      // Update current emotion
      this.currentEmotion = emotion;

      // Wait for transition to complete
      await new Promise(resolve => setTimeout(resolve, config.duration));
    } finally {
      this.isTransitioning = false;
    }
  }

  /**
   * Get current emotion
   */
  getCurrentEmotion(): EmotionType {
    return this.currentEmotion;
  }

  /**
   * Update emotion based on context
   */
  async updateEmotion(context: {
    confusionDetected?: boolean;
    correctAnswer?: boolean;
    encouragementNeeded?: boolean;
    celebrating?: boolean;
  }): Promise<void> {
    const newEmotion = this.selectEmotion(context);
    await this.transitionToEmotion(newEmotion);
  }

  /**
   * Handle user interaction (tap/click)
   */
  handleInteraction(x: number, y: number): void {
    if (!this.model) {
      return;
    }

    // Trigger a random happy motion on interaction
    const happyMotions = ['happy', 'excited', 'celebrating'];
    const randomMotion = happyMotions[Math.floor(Math.random() * happyMotions.length)];
    
    this.playMotion(randomMotion, 3);
  }

  /**
   * Resize handler
   */
  resize(width: number, height: number): void {
    if (!this.app || !this.model) {
      return;
    }

    this.app.renderer.resize(width, height);

    // Rescale and reposition model
    const scale = Math.min(
      width / this.model.width,
      height / this.model.height
    ) * 0.8;

    this.model.scale.set(scale);
    this.model.x = width / 2;
    this.model.y = height / 2;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopLipSync();

    if (this.model) {
      this.model.destroy();
      this.model = null;
    }

    if (this.app) {
      this.app.destroy(true, { children: true, texture: true, baseTexture: true });
      this.app = null;
    }

    console.log('🗑️ Haru Character System destroyed');
  }
}

// Singleton instance
export const haruCharacter = new HaruCharacterService();
