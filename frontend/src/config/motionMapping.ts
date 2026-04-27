/**
 * Motion Mapping Configuration
 * Maps gesture types to specific Live2D motions
 * STRICT: Only use motions from haru_greeter_pro_jp folder
 */

import { MotionConfig, GestureType, MotionName } from '../types';

export const MOTION_MAPPING: Record<GestureType, MotionName[]> = {
  idle: ['haru_g_idle', 'haru_g_m26'],
  listening: ['haru_g_idle'],
  greeting: ['haru_g_m02', 'haru_g_m03', 'haru_g_m04', 'haru_g_m05', 'haru_g_m25'],
  // m01 is the dedicated head-nod motion — own its own gesture for affirmation.
  nodding: ['haru_g_m01'],
  // Hand pointing toward the Visual Aids panel (right side of screen).
  pointLeft: ['haru_g_m06', 'haru_g_m07', 'haru_g_m08', 'haru_g_m09', 'haru_g_m13', 'haru_g_m14', 'haru_g_m15', 'haru_g_m22'],
  pointRight: ['haru_g_m16', 'haru_g_m17', 'haru_g_m18', 'haru_g_m19', 'haru_g_m23'],
  emphasis: ['haru_g_m10', 'haru_g_m11', 'haru_g_m12', 'haru_g_m24'],
  warning: ['haru_g_m20', 'haru_g_m21'],
  // Reuse the relaxed-idle motion for "let me think" — gentle, not action-y.
  thinking: ['haru_g_m26'],
};

export const MOTION_CONFIGS: MotionConfig[] = [
  // Idle
  { name: 'haru_g_idle', gesture: 'idle', priority: 0, duration: 10, description: 'Neutral idle pose' },
  
  // Greeting (m01-m05)
  { name: 'haru_g_m01', gesture: 'greeting', priority: 5, duration: 2.9, description: 'Head nod greeting' },
  { name: 'haru_g_m02', gesture: 'greeting', priority: 5, duration: 3, description: 'Wave greeting' },
  { name: 'haru_g_m03', gesture: 'greeting', priority: 5, duration: 3, description: 'Bow greeting' },
  { name: 'haru_g_m04', gesture: 'greeting', priority: 5, duration: 3, description: 'Friendly wave' },
  { name: 'haru_g_m05', gesture: 'greeting', priority: 5, duration: 3, description: 'Welcome gesture' },
  
  // Point Left - Text Explanation (m06-m15)
  { name: 'haru_g_m06', gesture: 'pointLeft', priority: 3, duration: 4, description: 'Point left casual' },
  { name: 'haru_g_m07', gesture: 'pointLeft', priority: 3, duration: 4, description: 'Point left formal' },
  { name: 'haru_g_m08', gesture: 'pointLeft', priority: 3, duration: 4, description: 'Gesture left explain' },
  { name: 'haru_g_m09', gesture: 'pointLeft', priority: 3, duration: 4, description: 'Indicate left' },
  { name: 'haru_g_m10', gesture: 'emphasis', priority: 4, duration: 5.5, description: 'Excited emphasis' },
  { name: 'haru_g_m11', gesture: 'emphasis', priority: 4, duration: 4, description: 'Important point' },
  { name: 'haru_g_m12', gesture: 'emphasis', priority: 4, duration: 4, description: 'Key concept' },
  { name: 'haru_g_m13', gesture: 'pointLeft', priority: 3, duration: 4, description: 'Teaching gesture left' },
  { name: 'haru_g_m14', gesture: 'pointLeft', priority: 3, duration: 4, description: 'Explain left detail' },
  { name: 'haru_g_m15', gesture: 'pointLeft', priority: 3, duration: 4, description: 'Reference left' },
  
  // Point Right - Image Explanation (m16-m19)
  { name: 'haru_g_m16', gesture: 'pointRight', priority: 3, duration: 4, description: 'Point right casual' },
  { name: 'haru_g_m17', gesture: 'pointRight', priority: 3, duration: 4, description: 'Point right formal' },
  { name: 'haru_g_m18', gesture: 'pointRight', priority: 3, duration: 4, description: 'Gesture right explain' },
  { name: 'haru_g_m19', gesture: 'pointRight', priority: 3, duration: 4, description: 'Indicate right' },
  
  // Warning/Concern (m20-m21)
  { name: 'haru_g_m20', gesture: 'warning', priority: 4, duration: 6, description: 'Concerned expression' },
  { name: 'haru_g_m21', gesture: 'warning', priority: 4, duration: 4, description: 'Caution gesture' },
  
  // Additional gestures (m22-m26) - can be mapped as needed
  { name: 'haru_g_m22', gesture: 'pointLeft', priority: 3, duration: 4, description: 'Additional left gesture' },
  { name: 'haru_g_m23', gesture: 'pointRight', priority: 3, duration: 4, description: 'Additional right gesture' },
  { name: 'haru_g_m24', gesture: 'emphasis', priority: 4, duration: 4, description: 'Additional emphasis' },
  { name: 'haru_g_m25', gesture: 'greeting', priority: 5, duration: 3, description: 'Additional greeting' },
  { name: 'haru_g_m26', gesture: 'idle', priority: 1, duration: 4, description: 'Relaxed idle' },
];

/**
 * Get a deterministic motion for a gesture type
 * Uses the first motion in the list for deterministic behavior
 * In production, always returns the same motion for the same gesture
 */
export function getMotionForGesture(gesture: GestureType, index: number = 0): MotionName {
  const motions = MOTION_MAPPING[gesture];
  if (!motions || motions.length === 0) {
    return 'haru_g_idle';
  }
  // Use modulo to cycle through motions deterministically
  const motionIndex = index % motions.length;
  return motions[motionIndex];
}

/**
 * Get motion configuration
 */
export function getMotionConfig(motionName: MotionName): MotionConfig | undefined {
  return MOTION_CONFIGS.find(config => config.name === motionName);
}

/**
 * Get motion duration in milliseconds
 */
export function getMotionDuration(motionName: MotionName): number {
  const config = getMotionConfig(motionName);
  return config ? config.duration * 1000 : 3000;
}
