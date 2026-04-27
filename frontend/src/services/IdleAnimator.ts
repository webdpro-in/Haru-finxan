/**
 * IdleAnimator — drives subtle "alive" motion when Haru is idle:
 *   - Breathing: ParamBodyAngleY slow sine wave (period ~4s)
 *   - Micro head sway: ParamAngleX ±2° on a longer period
 *   - Slight torso lean: ParamBodyAngleX
 *
 * Runs continuously once started; pauses when speaking so it doesn't fight
 * gesture motions. Speaking still inherits the breathing baseline.
 */

import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch';

export class IdleAnimator {
  private model: Live2DModel | null = null;
  private rafId: number | null = null;
  private startTime = 0;
  private active = false;
  private speaking = false;
  // Sentence-end nod state: nodEndsAt > 0 means an active nod is overlaying.
  private nodStart = 0;
  private nodEndsAt = 0;
  private nodAmplitude = 0;

  public setModel(model: Live2DModel): void {
    this.model = model;
    this.start();
    console.log('🌬️ IdleAnimator started');
  }

  public start(): void {
    if (this.active) return;
    this.active = true;
    this.startTime = performance.now();
    this.tick();
  }

  public stop(): void {
    this.active = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /** When speaking, dampen the head sway so gestures dominate. Breathing stays. */
  public setSpeaking(speaking: boolean): void {
    this.speaking = speaking;
  }

  /**
   * Trigger a single quick head nod overlay on ParamAngleY — used at sentence
   * boundaries while Haru is speaking to give the impression she's actively
   * making a point. Independent of and additive to motion-file gestures.
   *
   * `strength` 0..1 scales the dip in degrees (default ~6°).
   */
  public nodOnce(strength: number = 1): void {
    const now = performance.now();
    // If a nod is already in flight don't re-trigger — avoids stacking.
    if (now < this.nodEndsAt) return;
    this.nodStart = now;
    this.nodEndsAt = now + 550; // ~half a second
    this.nodAmplitude = 6 * Math.max(0.3, Math.min(1, strength));
  }

  private tick = (): void => {
    if (!this.active || !this.model) return;
    const core = (this.model.internalModel as any).coreModel;
    if (!core?.setParameterValueById) {
      this.rafId = requestAnimationFrame(this.tick);
      return;
    }

    const t = (performance.now() - this.startTime) / 1000;

    // Breathing: ~4s period, amplitude 0.5 on ParamBodyAngleY (vertical body lift).
    const breath = Math.sin((t * Math.PI * 2) / 4) * 0.5;
    // Micro head sway: ~7s period, ±2° (dampened while speaking).
    const sway = Math.sin((t * Math.PI * 2) / 7) * (this.speaking ? 0.5 : 2);
    // Subtle torso lean: ~9s period, ±1°.
    const lean = Math.sin((t * Math.PI * 2) / 9) * 1;

    try {
      core.setParameterValueById('ParamBodyAngleY', breath);
      const cur = core.getParameterValueById?.('ParamAngleX') ?? 0;
      if (Math.abs(cur) < 8) core.setParameterValueById('ParamAngleX', sway);
      core.setParameterValueById('ParamBodyAngleX', lean);

      // Sentence-end nod overlay on ParamAngleY (head pitch).  Half-sine dip
      // from 0 → -amp → 0 over the nod window so it always returns cleanly.
      const now = performance.now();
      if (now < this.nodEndsAt) {
        const progress = (now - this.nodStart) / (this.nodEndsAt - this.nodStart);
        // sin(π·p) gives a smooth 0→1→0 hump that matches a natural head dip.
        const dip = -this.nodAmplitude * Math.sin(Math.PI * progress);
        core.setParameterValueById('ParamAngleY', dip);
      } else if (this.nodEndsAt > 0) {
        // Settle back to 0 once the nod completes.
        core.setParameterValueById('ParamAngleY', 0);
        this.nodEndsAt = 0;
      }
    } catch { /* model destroyed */ }

    this.rafId = requestAnimationFrame(this.tick);
  };

  public destroy(): void {
    this.stop();
    this.model = null;
  }
}

export const idleAnimator = new IdleAnimator();
