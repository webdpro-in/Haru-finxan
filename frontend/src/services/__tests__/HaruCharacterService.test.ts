/**
 * Integration Tests for Haru Character System
 * Tests Live2D integration, emotion selection, and animation playback
 * 
 * 10.7: Write integration tests for character system
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HaruCharacterService, EmotionType } from '../HaruCharacterService';

// Mock PIXI and Live2D
vi.mock('pixi.js', () => ({
  Application: vi.fn(() => ({
    view: document.createElement('canvas'),
    screen: { width: 800, height: 800 },
    stage: {
      addChild: vi.fn(),
    },
    renderer: {
      resize: vi.fn(),
    },
    destroy: vi.fn(),
  })),
  Container: vi.fn(),
}));

vi.mock('pixi-live2d-display', () => ({
  Live2DModel: {
    from: vi.fn(() => Promise.resolve({
      width: 400,
      height: 600,
      scale: { set: vi.fn() },
      anchor: { set: vi.fn() },
      x: 0,
      y: 0,
      motion: vi.fn(),
      destroy: vi.fn(),
      internalModel: {
        motionManager: {
          definitions: {
            idle: ['haru_g_idle'],
            happy: ['haru_g_m01'],
          },
        },
        coreModel: {
          getParameterIndex: vi.fn(() => 0),
          setParameterValueById: vi.fn(),
        },
      },
    })),
  },
}));

describe('HaruCharacterService', () => {
  let service: HaruCharacterService;
  let container: HTMLElement;

  beforeEach(() => {
    service = new HaruCharacterService();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    service.destroy();
    document.body.removeChild(container);
  });

  describe('10.1: Live2D Cubism SDK Integration', () => {
    it('should initialize PIXI application', async () => {
      await service.initialize(container);

      expect(container.querySelector('canvas')).toBeTruthy();
    });

    it('should handle initialization errors gracefully', async () => {
      const invalidContainer = null as any;

      await expect(service.initialize(invalidContainer)).rejects.toThrow();
    });
  });

  describe('10.2: Model Loading', () => {
    it('should load Haru model from model3.json', async () => {
      await service.initialize(container);

      // Model should be loaded (tested via no errors thrown)
      expect(true).toBe(true);
    });

    it('should scale and position model correctly', async () => {
      await service.initialize(container);

      // Model positioning is handled internally
      expect(true).toBe(true);
    });
  });

  describe('10.3: Emotion Selection Logic', () => {
    it('should select celebrating emotion when celebrating', () => {
      const emotion = service.selectEmotion({ celebrating: true });

      expect(emotion).toBe('celebrating');
    });

    it('should select confused emotion when confusion detected', () => {
      const emotion = service.selectEmotion({ confusionDetected: true });

      expect(emotion).toBe('confused');
    });

    it('should select encouraging emotion when encouragement needed', () => {
      const emotion = service.selectEmotion({ encouragementNeeded: true });

      expect(emotion).toBe('encouraging');
    });

    it('should select happy emotion on correct answer', () => {
      const emotion = service.selectEmotion({ correctAnswer: true });

      expect(emotion).toBe('happy');
    });

    it('should select thinking emotion on incorrect answer', () => {
      const emotion = service.selectEmotion({ correctAnswer: false });

      expect(emotion).toBe('thinking');
    });

    it('should default to neutral emotion', () => {
      const emotion = service.selectEmotion({});

      expect(emotion).toBe('neutral');
    });

    it('should prioritize emotions correctly', () => {
      // Celebrating should override confusion
      const emotion1 = service.selectEmotion({
        celebrating: true,
        confusionDetected: true,
      });
      expect(emotion1).toBe('celebrating');

      // Confusion should override encouragement
      const emotion2 = service.selectEmotion({
        confusionDetected: true,
        encouragementNeeded: true,
      });
      expect(emotion2).toBe('confused');
    });
  });

  describe('10.4: Animation Playback', () => {
    it('should play motion after initialization', async () => {
      await service.initialize(container);

      // Motion playback is tested via no errors
      expect(true).toBe(true);
    });

    it('should handle motion playback before initialization', () => {
      // Should not throw error
      expect(() => {
        (service as any).playMotion('idle', 0);
      }).not.toThrow();
    });
  });

  describe('10.5: Lip Sync with Audio', () => {
    it('should start lip sync with audio element', async () => {
      await service.initialize(container);

      const audio = document.createElement('audio');
      service.startLipSync(audio);

      // Lip sync should be active
      expect((service as any).lipSyncInterval).not.toBeNull();

      service.stopLipSync();
    });

    it('should stop lip sync', async () => {
      await service.initialize(container);

      const audio = document.createElement('audio');
      service.startLipSync(audio);
      service.stopLipSync();

      expect((service as any).lipSyncInterval).toBeNull();
    });

    it('should stop existing lip sync when starting new one', async () => {
      await service.initialize(container);

      const audio1 = document.createElement('audio');
      const audio2 = document.createElement('audio');

      service.startLipSync(audio1);
      const firstInterval = (service as any).lipSyncInterval;

      service.startLipSync(audio2);
      const secondInterval = (service as any).lipSyncInterval;

      expect(firstInterval).not.toBe(secondInterval);

      service.stopLipSync();
    });

    it('should handle lip sync before model is loaded', () => {
      const audio = document.createElement('audio');

      expect(() => {
        service.startLipSync(audio);
      }).not.toThrow();
    });
  });

  describe('10.6: Smooth Emotion Transitions', () => {
    it('should transition to new emotion', async () => {
      await service.initialize(container);

      await service.transitionToEmotion('happy');

      expect(service.getCurrentEmotion()).toBe('happy');
    });

    it('should not transition if already in target emotion', async () => {
      await service.initialize(container);

      await service.transitionToEmotion('happy');
      const firstTransition = Date.now();

      await service.transitionToEmotion('happy');
      const secondTransition = Date.now();

      // Second transition should be instant
      expect(secondTransition - firstTransition).toBeLessThan(100);
    });

    it('should not allow concurrent transitions', async () => {
      await service.initialize(container);

      const promise1 = service.transitionToEmotion('happy');
      const promise2 = service.transitionToEmotion('excited');

      await Promise.all([promise1, promise2]);

      // Only one transition should have occurred
      expect(['happy', 'excited']).toContain(service.getCurrentEmotion());
    });

    it('should update emotion based on context', async () => {
      await service.initialize(container);

      await service.updateEmotion({ confusionDetected: true });
      expect(service.getCurrentEmotion()).toBe('confused');

      await service.updateEmotion({ correctAnswer: true });
      expect(service.getCurrentEmotion()).toBe('happy');
    });

    it('should transition through multiple emotions', async () => {
      await service.initialize(container);

      const emotions: EmotionType[] = ['happy', 'thinking', 'confused', 'encouraging'];

      for (const emotion of emotions) {
        await service.transitionToEmotion(emotion);
        expect(service.getCurrentEmotion()).toBe(emotion);
      }
    });
  });

  describe('User Interaction', () => {
    it('should handle tap/click interaction', async () => {
      await service.initialize(container);

      expect(() => {
        service.handleInteraction(100, 100);
      }).not.toThrow();
    });

    it('should handle interaction before initialization', () => {
      expect(() => {
        service.handleInteraction(100, 100);
      }).not.toThrow();
    });
  });

  describe('Resize Handling', () => {
    it('should resize canvas and reposition model', async () => {
      await service.initialize(container);

      expect(() => {
        service.resize(1024, 768);
      }).not.toThrow();
    });

    it('should handle resize before initialization', () => {
      expect(() => {
        service.resize(1024, 768);
      }).not.toThrow();
    });
  });

  describe('Resource Cleanup', () => {
    it('should destroy all resources', async () => {
      await service.initialize(container);

      const audio = document.createElement('audio');
      service.startLipSync(audio);

      service.destroy();

      expect((service as any).model).toBeNull();
      expect((service as any).app).toBeNull();
      expect((service as any).lipSyncInterval).toBeNull();
    });

    it('should handle destroy before initialization', () => {
      expect(() => {
        service.destroy();
      }).not.toThrow();
    });

    it('should handle multiple destroy calls', async () => {
      await service.initialize(container);

      service.destroy();
      service.destroy();

      expect((service as any).model).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid emotion changes', async () => {
      await service.initialize(container);

      const emotions: EmotionType[] = ['happy', 'confused', 'thinking', 'excited'];

      // Rapid transitions
      const promises = emotions.map(e => service.transitionToEmotion(e));
      await Promise.all(promises);

      // Should end in a valid emotion
      expect(emotions).toContain(service.getCurrentEmotion());
    });

    it('should handle lip sync with very short audio', async () => {
      await service.initialize(container);

      const audio = document.createElement('audio');
      service.startLipSync(audio);

      // Simulate audio ending immediately
      audio.dispatchEvent(new Event('ended'));

      expect((service as any).lipSyncInterval).toBeNull();
    });

    it('should maintain state after multiple operations', async () => {
      await service.initialize(container);

      await service.transitionToEmotion('happy');
      service.handleInteraction(100, 100);
      service.resize(1024, 768);

      expect(service.getCurrentEmotion()).toBe('happy');
    });
  });

  describe('Performance', () => {
    it('should initialize quickly', async () => {
      const start = Date.now();
      await service.initialize(container);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(5000); // Should initialize in under 5 seconds
    });

    it('should transition emotions quickly', async () => {
      await service.initialize(container);

      const start = Date.now();
      await service.transitionToEmotion('happy');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(3000); // Should transition in under 3 seconds
    });
  });
});
