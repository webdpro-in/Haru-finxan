/**
 * Synchronization Coordinator
 * Coordinates text, speech, gestures, and images across all modalities
 * Ensures all updates happen within 100ms of each other
 */

import { TeachingSegment } from '../types';
import { motionManager } from './MotionManager';
import { speechController } from './SpeechController';
import { eyeController } from './EyeController';
import { expressionController, ExpressionController } from './ExpressionController';
import { idleAnimator } from './IdleAnimator';
import { useAppStore } from '../store/useAppStore';

export class SynchronizationCoordinator {
  private isExecuting: boolean = false;
  private eventQueue: SynchronizationEvent[] = [];
  private currentSegmentIndex: number = 0;

  /**
   * Execute a synchronized teaching sequence
   * CRITICAL: TTS must always play, lip sync must be audio-driven
   */
  public async executeTeachingSequence(
    segments: TeachingSegment[],
    fullText: string,
    images: string[]
  ): Promise<void> {
    if (this.isExecuting) {
      console.log('[SyncCoordinator] Queueing teaching sequence');
      this.eventQueue.push({ segments, fullText, images });
      return;
    }

    this.isExecuting = true;
    this.currentSegmentIndex = 0;

    const store = useAppStore.getState();

    try {
      console.log('[SyncCoordinator] 🎬 Starting teaching sequence');
      const syncStart = performance.now();

      // 1. Update text content immediately
      store.setLeftPanelContent(fullText);

      // 2. Ensure images are displayed (they should already be in store from AIService)
      // Only update if images were passed and not already in store
      if (images && images.length > 0) {
        const currentImages = store.generatedImages;
        if (currentImages.length === 0) {
          console.log(`[SyncCoordinator] 🖼️ Storing ${images.length} generated images`);
          images.forEach(img => store.addGeneratedImage(img));
        } else {
          console.log(`[SyncCoordinator] 🖼️ Images already in store (${currentImages.length} images)`);
        }
      }

      // 3. Pre-fetch TTS audio for each segment to ensure perfect synchronization
      console.log('[SyncCoordinator] 🔊 Generating TTS audio segment by segment...');
      const segmentAudios: string[] = [];
      
      for (const segment of segments) {
        try {
          const url = await speechController.textToSpeech(segment.content);
          segmentAudios.push(url);
        } catch (error) {
          console.error('[SyncCoordinator] ❌ TTS generation failed for segment:', segment.content);
          // Retry once strictly for this segment
          const retryUrl = await speechController.textToSpeech(segment.content);
          segmentAudios.push(retryUrl);
        }
      }

      const syncEnd = performance.now();
      console.log(`[SyncCoordinator] ⚡ Audio preparation completed in ${syncEnd - syncStart}ms`);

      // 4. Play speech and gesture concurrently with strict sentence-by-sentence synchronization (CRITICAL)
      console.log('[SyncCoordinator] 🎤 Starting synchronized teaching playback');
      store.setSpeaking(true);
      idleAnimator.setSpeaking(true);

      for (let i = 0; i < segments.length; i++) {
        if (!this.isExecuting) {
          console.log('[SyncCoordinator] Execution interrupted mid-playback.');
          break; // Stop going through segments if interrupted
        }

        const segment = segments[i];
        this.currentSegmentIndex = i;
        // Tell the rest of the app which paragraph is being spoken right now.
        // VisualPanel listens to this to highlight the matching visual aid.
        store.setCurrentSegmentIndex(i);

        // Drive facial expression from segment text — curious/smile/thoughtful/etc.
        const expr = ExpressionController.inferFromText(segment.content);
        expressionController.setExpression(expr);

        // Trigger Gesture & Eye Contact
        if (segment.gesture) {
          console.log(`[SyncCoordinator] Playing segment ${i} gesture: ${segment.gesture}, expr: ${expr}`);
          motionManager.requestGesture(segment.gesture);

          // Direct eyes mapping to UI layout strictly
          if (segment.gesture === 'pointLeft') {
            eyeController.lookLeft(4000); // look at assigned right panel (images left logically)
          } else if (segment.gesture === 'pointRight') {
            eyeController.lookRight(4000); // look at assigned left panel (text right logically)
          } else if (segment.gesture === 'idle') {
            eyeController.lookCenter();
          }
        }

        // Wait strictly for the duration of this segment's audio to finish before moving to the next segment
        // This ensures lip-sync naturally flows identically with the assigned localized gesture loop.
        await speechController.playAudio(segmentAudios[i]);
      }

      console.log('[SyncCoordinator] ✅ Playback loop finished');
      store.setSpeaking(false);
      idleAnimator.setSpeaking(false);

      // 5. Return to idle
      if (this.isExecuting) {
        await motionManager.returnToIdle();
        eyeController.lookCenter();
        expressionController.setExpression('neutral', 600);
        console.log('[SyncCoordinator] 🎉 Teaching sequence naturally completed');
      }

    } catch (error) {
      console.error('[SyncCoordinator] ❌ Error in teaching sequence:', error);
      store.setSpeaking(false);
      idleAnimator.setSpeaking(false);
      await motionManager.returnToIdle();
      eyeController.lookCenter();
      expressionController.setExpression('neutral', 600);

      // Show error to user
      store.setLeftPanelContent('Sorry, I encountered an error with speech synchronization. Please try again.');
    } finally {
      this.isExecuting = false;
      store.setIsTeaching(false);

      // Process queued events
      if (this.eventQueue.length > 0) {
        const nextEvent = this.eventQueue.shift();
        if (nextEvent) {
          await this.executeTeachingSequence(
            nextEvent.segments,
            nextEvent.fullText,
            nextEvent.images
          );
        }
      }
    }
  }

  /**
   * Handle interruption (e.g., microphone activation)
   */
  public interrupt(): void {
    console.log('[SyncCoordinator] Interruption detected - stopping all modalities');

    // Stop speech
    speechController.stopAudio();

    // Stop motion
    motionManager.stop();

    // Return eyes + face to center neutral
    eyeController.lookCenter();
    expressionController.setExpression('neutral', 250);
    idleAnimator.setSpeaking(false);

    // Clear queue
    this.eventQueue = [];
    this.isExecuting = false;

    // Update state
    const store = useAppStore.getState();
    store.setSpeaking(false);
    store.setIsTeaching(false);
  }

  /**
   * Check if coordinator is currently executing
   */
  public isActive(): boolean {
    return this.isExecuting;
  }

  /**
   * Get current segment index
   */
  public getCurrentSegmentIndex(): number {
    return this.currentSegmentIndex;
  }
}

interface SynchronizationEvent {
  segments: TeachingSegment[];
  fullText: string;
  images: string[];
}

// Singleton instance
export const synchronizationCoordinator = new SynchronizationCoordinator();
