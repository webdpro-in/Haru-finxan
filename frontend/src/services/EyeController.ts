/**
 * Eye Controller Service
 * Controls Haru's eye and head direction
 * - Look left when images appear
 * - Look right when chat response
 * - Look center when idle
 */

import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch';

export class EyeController {
  private model: Live2DModel | null = null;
  private currentDirection: 'left' | 'right' | 'center' = 'center';
  private returnToCenterTimeout: NodeJS.Timeout | null = null;
  private blinkTimeout: NodeJS.Timeout | null = null;
  private blinkActive = false;

  /**
   * Initialize with Live2D model
   */
  public setModel(model: Live2DModel): void {
    this.model = model;
    console.log('👀 EyeController initialized');
    this.startAutoBlink();
  }

  /**
   * Subtle automatic blink — triggers every 3–6 s and keeps the
   * character feeling alive when idle.
   */
  public startAutoBlink(): void {
    if (this.blinkActive) return;
    this.blinkActive = true;
    const schedule = () => {
      const delay = 3000 + Math.random() * 3000;
      this.blinkTimeout = setTimeout(() => {
        this.blinkOnce();
        if (this.blinkActive) schedule();
      }, delay);
    };
    schedule();
  }

  public stopAutoBlink(): void {
    this.blinkActive = false;
    if (this.blinkTimeout) {
      clearTimeout(this.blinkTimeout);
      this.blinkTimeout = null;
    }
  }

  private blinkOnce(): void {
    if (!this.model) return;
    try {
      const coreModel = (this.model.internalModel as any).coreModel;
      if (!coreModel?.setParameterValueById) return;
      coreModel.setParameterValueById('ParamEyeLOpen', 0);
      coreModel.setParameterValueById('ParamEyeROpen', 0);
      setTimeout(() => {
        try {
          coreModel.setParameterValueById('ParamEyeLOpen', 1);
          coreModel.setParameterValueById('ParamEyeROpen', 1);
        } catch { /* model may have been destroyed */ }
      }, 110);
    } catch (err) {
      console.warn('blink failed', err);
    }
  }

  /**
   * Look left (at images panel)
   */
  public lookLeft(duration: number = 3000): void {
    if (!this.model) {
      console.warn('⚠️ Model not set for eye control');
      return;
    }

    try {
      const coreModel = (this.model.internalModel as any).coreModel;
      if (coreModel && coreModel.setParameterValueById) {
        coreModel.setParameterValueById('ParamAngleX', -15);
        this.currentDirection = 'left';
        console.log('👀 Looking left (images)');

        // Auto return to center after duration
        this.scheduleReturnToCenter(duration);
      }
    } catch (error) {
      console.error('❌ Error looking left:', error);
    }
  }

  /**
   * Look right (at chat panel)
   */
  public lookRight(duration: number = 3000): void {
    if (!this.model) {
      console.warn('⚠️ Model not set for eye control');
      return;
    }

    try {
      const coreModel = (this.model.internalModel as any).coreModel;
      if (coreModel && coreModel.setParameterValueById) {
        coreModel.setParameterValueById('ParamAngleX', 15);
        this.currentDirection = 'right';
        console.log('👀 Looking right (chat)');

        // Auto return to center after duration
        this.scheduleReturnToCenter(duration);
      }
    } catch (error) {
      console.error('❌ Error looking right:', error);
    }
  }

  /**
   * Look center (at user)
   */
  public lookCenter(): void {
    if (!this.model) {
      console.warn('⚠️ Model not set for eye control');
      return;
    }

    try {
      const coreModel = (this.model.internalModel as any).coreModel;
      if (coreModel && coreModel.setParameterValueById) {
        coreModel.setParameterValueById('ParamAngleX', 0);
        this.currentDirection = 'center';
        console.log('👀 Looking center (user)');

        // Clear any pending return to center
        if (this.returnToCenterTimeout) {
          clearTimeout(this.returnToCenterTimeout);
          this.returnToCenterTimeout = null;
        }
      }
    } catch (error) {
      console.error('❌ Error looking center:', error);
    }
  }

  /**
   * Get current direction
   */
  public getCurrentDirection(): 'left' | 'right' | 'center' {
    return this.currentDirection;
  }

  /**
   * Schedule automatic return to center
   */
  private scheduleReturnToCenter(duration: number): void {
    // Clear any existing timeout
    if (this.returnToCenterTimeout) {
      clearTimeout(this.returnToCenterTimeout);
    }

    // Schedule return to center
    this.returnToCenterTimeout = setTimeout(() => {
      this.lookCenter();
    }, duration);
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    if (this.returnToCenterTimeout) {
      clearTimeout(this.returnToCenterTimeout);
      this.returnToCenterTimeout = null;
    }
    this.stopAutoBlink();
    this.model = null;
  }
}

// Singleton instance
export const eyeController = new EyeController();
