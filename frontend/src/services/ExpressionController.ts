/**
 * ExpressionController — drives Haru's facial expression via Live2D parameters.
 *
 * Targets the standard Cubism 4 brow / mouth / eye / angle params:
 *   ParamBrowLY, ParamBrowRY (raise/lower brow, range -1..1)
 *   ParamMouthForm  (smile: -1 sad .. 1 smile)
 *   ParamEyeLOpen, ParamEyeROpen
 *   ParamAngleX (head turn -30..30), ParamAngleZ (head tilt)
 *
 * Tween between states over ~400ms so transitions never look mechanical.
 */

import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch';

export type Expression = 'neutral' | 'smile' | 'curious' | 'thoughtful' | 'concerned' | 'warm';

interface ParamTarget {
  ParamBrowLY: number;
  ParamBrowRY: number;
  ParamMouthForm: number;
  ParamAngleZ: number;
}

const PRESETS: Record<Expression, ParamTarget> = {
  neutral:    { ParamBrowLY: 0,    ParamBrowRY: 0,    ParamMouthForm: 0.2, ParamAngleZ: 0 },
  smile:      { ParamBrowLY: 0.3,  ParamBrowRY: 0.3,  ParamMouthForm: 1.0, ParamAngleZ: 2 },
  warm:       { ParamBrowLY: 0.4,  ParamBrowRY: 0.4,  ParamMouthForm: 0.8, ParamAngleZ: 4 },
  curious:    { ParamBrowLY: 0.6,  ParamBrowRY: 0.2,  ParamMouthForm: 0.1, ParamAngleZ: 6 },
  thoughtful: { ParamBrowLY: -0.3, ParamBrowRY: -0.3, ParamMouthForm: -0.2, ParamAngleZ: -3 },
  concerned:  { ParamBrowLY: -0.5, ParamBrowRY: -0.5, ParamMouthForm: -0.4, ParamAngleZ: 0 },
};

export class ExpressionController {
  private model: Live2DModel | null = null;
  private current: ParamTarget = { ...PRESETS.neutral };
  private rafId: number | null = null;

  public setModel(model: Live2DModel): void {
    this.model = model;
    this.applyImmediate('neutral');
    console.log('🙂 ExpressionController initialized');
  }

  /** Tween toward the target expression over `durationMs`. */
  public setExpression(expr: Expression, durationMs = 400): void {
    if (!this.model) return;
    const target = PRESETS[expr];
    const start = { ...this.current };
    const startTime = performance.now();

    if (this.rafId) cancelAnimationFrame(this.rafId);

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      const ease = t * t * (3 - 2 * t); // smoothstep

      this.current = {
        ParamBrowLY:    start.ParamBrowLY    + (target.ParamBrowLY    - start.ParamBrowLY)    * ease,
        ParamBrowRY:    start.ParamBrowRY    + (target.ParamBrowRY    - start.ParamBrowRY)    * ease,
        ParamMouthForm: start.ParamMouthForm + (target.ParamMouthForm - start.ParamMouthForm) * ease,
        ParamAngleZ:    start.ParamAngleZ    + (target.ParamAngleZ    - start.ParamAngleZ)    * ease,
      };
      this.applyCurrent();

      if (t < 1) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.rafId = null;
      }
    };

    this.rafId = requestAnimationFrame(step);
  }

  private applyImmediate(expr: Expression): void {
    this.current = { ...PRESETS[expr] };
    this.applyCurrent();
  }

  private applyCurrent(): void {
    if (!this.model) return;
    const core = (this.model.internalModel as any).coreModel;
    if (!core?.setParameterValueById) return;
    try {
      core.setParameterValueById('ParamBrowLY',    this.current.ParamBrowLY);
      core.setParameterValueById('ParamBrowRY',    this.current.ParamBrowRY);
      core.setParameterValueById('ParamMouthForm', this.current.ParamMouthForm);
      core.setParameterValueById('ParamAngleZ',    this.current.ParamAngleZ);
    } catch { /* model destroyed */ }
  }

  /** Pick an expression based on AI response text. Cheap heuristic. */
  public static inferFromText(text: string): Expression {
    const t = text.toLowerCase();
    if (/\b(hi|hello|hey|namaste|hola|welcome|nice to meet)/.test(t)) return 'warm';
    if (/(great|excellent|perfect|well done|correct|exactly|that's right|bahut achha|शाबाश)/.test(t)) return 'smile';
    if (/\?$|(let me think|i wonder|hmm|interesting|consider|imagine)/.test(t)) return 'curious';
    if (/(sorry|i'm not sure|that's not quite|let's revisit|actually|careful|incorrect|समझ नहीं)/.test(t)) return 'thoughtful';
    if (/(important|warning|don't|avoid|mistake|wrong)/.test(t)) return 'concerned';
    return 'neutral';
  }

  public destroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    this.model = null;
  }
}

export const expressionController = new ExpressionController();
