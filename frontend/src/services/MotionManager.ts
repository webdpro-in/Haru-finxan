/**
 * MotionManager — character-aware FSM for Live2D gestures.
 *
 * The character config (see `config/characters.ts`) maps every abstract
 * gesture (`greeting`, `pointLeft`, …) to a concrete (group, index) pair in
 * the chosen model3.json.  This keeps gesture *intent* portable across
 * characters with very different motion sets — Haru has 27 motions, Ren Pro
 * only 3 — without the rest of the app caring.
 */

import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch';
import { GestureType, HaruState } from '../types';
import { CharacterConfig, CharacterMotion, getCharacter } from '../config/characters';

export class MotionManager {
  private model: Live2DModel | null = null;
  private character: CharacterConfig = getCharacter('haru');
  private currentMotion: CharacterMotion = { group: '', index: 0 };
  private currentState: HaruState = 'idle';
  private isTransitioning: boolean = false;
  private motionQueue: GestureType[] = [];
  private returnToIdleTimeout: ReturnType<typeof setTimeout> | null = null;
  private gestureCounter: Map<GestureType, number> = new Map();

  /**
   * Bind to a freshly loaded Live2D model.  The optional character argument
   * tells us which gesture map to use; defaults to whatever is currently
   * selected if omitted.
   */
  public setModel(model: Live2DModel, character?: CharacterConfig): void {
    this.model = model;
    if (character) this.character = character;
    this.gestureCounter.clear();
    this.motionQueue = [];
    if (this.returnToIdleTimeout) {
      clearTimeout(this.returnToIdleTimeout);
      this.returnToIdleTimeout = null;
    }
    console.log(`🎬 MotionManager bound to ${this.character.id}`);
    // Play idle so the rig starts breathing instead of frozen in T-pose.
    void this.playGestureMotion('idle');
  }

  public getState(): HaruState { return this.currentState; }
  public isActive(): boolean   { return this.currentState !== 'idle'; }
  /** Debug helper — exposes the (group, index) currently playing. */
  public getCurrentMotion(): CharacterMotion { return this.currentMotion; }

  /** Pick the next concrete motion for an abstract gesture, cycling per call. */
  private resolveMotion(gesture: GestureType): CharacterMotion {
    const list = this.character.motions[gesture] || this.character.motions.idle;
    if (!list || list.length === 0) return { group: '', index: 0 };
    const counter = this.gestureCounter.get(gesture) || 0;
    this.gestureCounter.set(gesture, counter + 1);
    return list[counter % list.length];
  }

  /** Estimate how long a motion plays.  We don't read motion3.json files just
   *  to time them — 3.5s is a sensible default for the gestures we use, and
   *  Live2D will internally truncate if the clip is shorter. */
  private estimateDuration(gesture: GestureType): number {
    if (gesture === 'idle' || gesture === 'listening') return 0;
    if (gesture === 'greeting' || gesture === 'emphasis') return 3500;
    return 3000;
  }

  /** Low-level: actually play (group, index) on the model. */
  private async playMotionRaw(motion: CharacterMotion, loop: boolean): Promise<void> {
    if (!this.model) return;
    try {
      // priority: 3 = Force.  Using Force everywhere lets new gestures
      // pre-empt a still-playing one cleanly.
      await this.model.motion(motion.group, motion.index, 3);
      this.currentMotion = motion;
    } catch (err) {
      console.warn(`[MotionManager] motion(${motion.group}, ${motion.index}) failed:`, err);
    }
    if (!loop) {
      const duration = this.estimateDuration('emphasis');
      this.scheduleReturnToIdle(duration);
    }
  }

  /** High-level: play the gesture's mapped motion. */
  private async playGestureMotion(gesture: GestureType): Promise<void> {
    const motion = this.resolveMotion(gesture);
    const loop = gesture === 'idle' || gesture === 'listening';
    await this.playMotionRaw(motion, loop);
  }

  /** Public entrypoint — caller asks for a gesture, we resolve + play. */
  public async requestGesture(gesture: GestureType): Promise<void> {
    if (this.isTransitioning) {
      this.motionQueue.push(gesture);
      return;
    }
    this.isTransitioning = true;
    if (this.returnToIdleTimeout) {
      clearTimeout(this.returnToIdleTimeout);
      this.returnToIdleTimeout = null;
    }

    this.currentState = gesture === 'idle' || gesture === 'listening'
      ? gesture
      : 'gesturing';

    await this.playGestureMotion(gesture);
    this.isTransitioning = false;
    this.processQueue();
  }

  private scheduleReturnToIdle(duration: number): void {
    if (this.returnToIdleTimeout) clearTimeout(this.returnToIdleTimeout);
    this.returnToIdleTimeout = setTimeout(() => {
      void this.returnToIdle();
    }, duration);
  }

  public async returnToIdle(): Promise<void> {
    if (this.isTransitioning) return;
    this.currentState = 'idle';
    await this.playGestureMotion('idle');
  }

  private async processQueue(): Promise<void> {
    if (this.motionQueue.length === 0 || this.isTransitioning) return;
    const next = this.motionQueue.shift();
    if (next) await this.requestGesture(next);
  }

  public setListening(listening: boolean): void {
    if (listening) void this.requestGesture('listening');
    else if (this.currentState === 'listening') void this.returnToIdle();
  }

  public setSpeaking(speaking: boolean): void {
    this.currentState = speaking ? 'speaking' : 'idle';
    if (!speaking) void this.returnToIdle();
  }

  public stop(): void {
    this.motionQueue = [];
    if (this.returnToIdleTimeout) {
      clearTimeout(this.returnToIdleTimeout);
      this.returnToIdleTimeout = null;
    }
    this.isTransitioning = false;
    void this.returnToIdle();
  }

  public destroy(): void {
    this.stop();
    this.model = null;
  }
}

// Singleton instance
export const motionManager = new MotionManager();
