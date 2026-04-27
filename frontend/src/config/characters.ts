/**
 * Character Registry — config-driven character switching.
 *
 * Each character entry tells the runtime:
 *   - where the Live2D model lives
 *   - which group + index in the model3.json maps to each abstract gesture
 *     (`greeting`, `nodding`, `pointLeft`, etc.)
 *   - the voice gender for TTS
 *   - the camera framing (anchor / scale / y) — different rigs have different
 *     proportions, so a one-size-fits-all crop looks wrong
 *
 * To add a new character, drop the runtime files in `public/<id>/runtime/`,
 * add an entry to CHARACTERS, and the rest of the app picks it up.
 */
import { GestureType } from '../types';

/** Resolves which Live2D group + motion index plays for a given gesture. */
export interface CharacterMotion {
  group: string; // model3.json motion group key — Haru uses "", Ren uses "Idle" or ""
  index: number; // index within that group
}

export interface CharacterConfig {
  id: string;
  label: string;            // user-facing in the picker
  emoji: string;            // small icon for the picker
  modelPath: string;        // public-relative model3.json path
  voiceGender: 'female' | 'male';
  speechPitch: number;      // Web Speech API fallback pitch
  /**
   * Framing knobs tuned per rig.
   *   - `fitFraction`: how much of the canvas height the character should
   *     occupy.  At runtime we read the model's intrinsic height and pick a
   *     scale that lands on this fraction — so it works for any rig size,
   *     not just the one we manually calibrated against.
   *   - `anchorY` / `yOffsetFraction`: pin position relative to the canvas.
   */
  framing: {
    anchorY: number;          // 0 = top, 1 = bottom
    fitFraction: number;      // 0..1 — fraction of canvas height to fill
    yOffsetFraction: number;  // 0..1 — top inset as fraction of canvas height
  };
  /** Map every abstract gesture to a concrete (group, index). Array entries
   *  are cycled through deterministically by the MotionManager. */
  motions: Record<GestureType, CharacterMotion[]>;
}

/* ─── Haru — 27 motions, all under empty "" group ───────────────────── */
const HARU: CharacterConfig = {
  id: 'haru',
  label: 'Haru',
  emoji: '🌸',
  modelPath: '/haru_greeter_pro_jp/runtime/haru_greeter_t05.model3.json',
  voiceGender: 'female',
  speechPitch: 1.05,
  // Haru: pushed down 40% more
  framing: { anchorY: 0.75, fitFraction: 2.0, yOffsetFraction: 1.6 },
  motions: {
    idle:       [{ group: '', index: 0 }],
    listening:  [{ group: '', index: 0 }],
    greeting:   [
      { group: '', index: 2 }, // m02 — wave
      { group: '', index: 3 }, // m03 — bow
      { group: '', index: 4 }, // m04 — friendly wave
      { group: '', index: 5 }, // m05 — welcome
      { group: '', index: 25 },// m25
    ],
    nodding:    [{ group: '', index: 1 }], // m01 — head nod
    pointLeft:  [
      { group: '', index: 6 }, { group: '', index: 7 }, { group: '', index: 8 },
      { group: '', index: 9 }, { group: '', index: 13 }, { group: '', index: 14 },
      { group: '', index: 15 }, { group: '', index: 22 },
    ],
    pointRight: [
      { group: '', index: 16 }, { group: '', index: 17 }, { group: '', index: 18 },
      { group: '', index: 19 }, { group: '', index: 23 },
    ],
    emphasis:   [
      { group: '', index: 10 }, { group: '', index: 11 },
      { group: '', index: 12 }, { group: '', index: 24 },
    ],
    warning:    [{ group: '', index: 20 }, { group: '', index: 21 }],
    thinking:   [{ group: '', index: 26 }],
  },
};

/* ─── Ren Pro — only 3 motions (1 Idle + 2 in default group) ───────────
 * model3.json:
 *   "Idle": [mtn_01]
 *   ""    : [mtn_02, mtn_03]
 *
 * With so few motions we map every "active" gesture to the two non-idle
 * clips, alternating.  Any character with a richer motion set can override
 * this just by adding entries — the rest of the app stays unchanged. */
const REN_PRO: CharacterConfig = {
  id: 'ren_pro',
  label: 'Ren Pro',
  emoji: '🧑‍🎓',
  modelPath: '/ren_pro_en/runtime/ren.model3.json',
  voiceGender: 'male',
  speechPitch: 0.95,
  // Ren Pro: pushed down 40% more
  framing: { anchorY: 0.75, fitFraction: 2.0, yOffsetFraction: 1.6 },
  motions: {
    idle:       [{ group: 'Idle', index: 0 }],
    listening:  [{ group: 'Idle', index: 0 }],
    // mtn_02 + mtn_03 cover every "active" gesture — alternate for variety.
    greeting:   [{ group: '', index: 0 }, { group: '', index: 1 }],
    nodding:    [{ group: '', index: 0 }],
    pointLeft:  [{ group: '', index: 1 }, { group: '', index: 0 }],
    pointRight: [{ group: '', index: 1 }, { group: '', index: 0 }],
    emphasis:   [{ group: '', index: 0 }, { group: '', index: 1 }],
    warning:    [{ group: '', index: 1 }],
    thinking:   [{ group: 'Idle', index: 0 }],
  },
};

export const CHARACTERS: Record<string, CharacterConfig> = {
  haru: HARU,
  ren_pro: REN_PRO,
};

export const CHARACTER_LIST: CharacterConfig[] = [HARU, REN_PRO];
export const DEFAULT_CHARACTER_ID = 'haru';

export function getCharacter(id: string | null | undefined): CharacterConfig {
  if (id && CHARACTERS[id]) return CHARACTERS[id];
  return CHARACTERS[DEFAULT_CHARACTER_ID];
}
