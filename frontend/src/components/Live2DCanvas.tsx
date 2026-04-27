/**
 * Live2DCanvas — renders the active character via PixiJS + pixi-live2d-display.
 *
 * Why PIXI owns the canvas (and React owns only the container div):
 *   We previously passed `view: canvas` with the canvas rendered by React.
 *   In React 18 StrictMode dev, that canvas survives the mount → cleanup →
 *   remount cycle, but PIXI's `destroy(false)` leaves a bound WebGL context
 *   on it.  The next `new PIXI.Application({ view: canvas })` call then
 *   throws "Invalid value" because the canvas already has a context.
 *
 *   The fix: PIXI creates its own <canvas> via `app.view` and we mount it
 *   into a React-owned <div ref>.  React only manages the div; PIXI fully
 *   controls the canvas and is free to destroy(true) it cleanly on cleanup
 *   without fighting React's reconciler.
 *
 * Why loading/error states are overlays, not replacements:
 *   The container div MUST stay in the DOM the entire time, otherwise the
 *   useEffect can't find it on first run.  We render the loading + error
 *   UIs as absolute-positioned overlays on top of the container.
 */

import '../live2d-setup';
import React, { useEffect, useRef, useState } from 'react';
import * as PIXI from 'pixi.js';
import { Live2DModel } from 'pixi-live2d-display-lipsyncpatch';
import { motionManager } from '../services/MotionManager';
import { lipSyncService } from '../services/LipSyncService';
import { eyeController } from '../services/EyeController';
import { expressionController } from '../services/ExpressionController';
import { idleAnimator } from '../services/IdleAnimator';
import { useAppStore } from '../store/useAppStore';
import { getCharacter } from '../config/characters';

interface Live2DCanvasProps {
  /** Optional override; otherwise the active character from the store wins. */
  modelPath?: string;
}

export const Live2DCanvas: React.FC<Live2DCanvasProps> = ({ modelPath }) => {
  // The container div is the *only* DOM element React manages here.  PIXI
  // mounts its own <canvas> child inside.
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const modelRef = useRef<Live2DModel | null>(null);
  const resizeRef = useRef<(() => void) | null>(null);
  const [loadFailed, setLoadFailed] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setHaruState = useAppStore((s) => s.setHaruState);
  const characterId = useAppStore((s) => s.character);
  const character = getCharacter(characterId);
  const path = modelPath || character.modelPath;

  useEffect(() => {
    let cancelled = false;
    setLoadFailed(null);
    setIsLoading(true);

    const init = async () => {
      // Wait one frame so the container has measured layout.
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const container = containerRef.current;
      if (!container || cancelled) return;

      // Compute canvas size from the container.  Floor + clamp because PIXI
      // throws "Invalid value" on non-positive integer dimensions.
      const rect = container.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width || 600));
      const height = Math.max(1, Math.floor(rect.height || 600));
      console.log(`[Live2DCanvas] init → ${character.id} | container ${width}×${height}`);

      // Create PIXI with its own canvas (no `view` arg → PIXI allocates one).
      let app: PIXI.Application;
      try {
        app = new PIXI.Application({
          width,
          height,
          backgroundColor: 0xffffff,
          backgroundAlpha: 0,
          antialias: true,
          resolution: Math.max(1, Math.min(2, window.devicePixelRatio || 1)),
          autoDensity: true,
        });
      } catch (err) {
        const msg = (err as Error)?.message || String(err);
        console.error(`[Live2DCanvas] PIXI init failed (${width}×${height}):`, err);
        if (!cancelled) {
          setLoadFailed(`PIXI init failed: ${msg}`);
          setIsLoading(false);
        }
        return;
      }

      if (cancelled) {
        try { app.destroy(true); } catch {}
        return;
      }

      // Mount PIXI's canvas into the container.  React doesn't ref this node,
      // so PIXI is free to destroy(true) it later without conflict.
      const canvas = app.view as HTMLCanvasElement;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      container.appendChild(canvas);
      appRef.current = app;

      // Load Live2D model
      try {
        console.log(`[Live2DCanvas] loading model: ${window.location.origin}${path}`);
        const model = await Live2DModel.from(path, { autoInteract: false });
        if (cancelled) {
          try { model.destroy({ children: true }); } catch {}
          try { app.destroy(true); } catch {}
          return;
        }
        modelRef.current = model;

        // Auto-fit: pick a scale that fits the model into `fitFraction` of
        // the canvas height.  model.height is reliable post-load.
        const intrinsicHeight = (model as any).internalModel?.originalHeight
          || model.height
          || app.screen.height;
        const fitScale = (app.screen.height * character.framing.fitFraction) / intrinsicHeight;
        const scale = Math.max(0.05, Math.min(3, fitScale));

        model.anchor.set(0.5, character.framing.anchorY);
        model.scale.set(scale);
        model.x = app.screen.width / 2;
        model.y = app.screen.height * character.framing.yOffsetFraction;
        model.interactive = false;
        app.stage.addChild(model);

        console.log(
          `[Live2DCanvas] ${character.id} ready — intrinsic=${intrinsicHeight}, ` +
          `canvas=${app.screen.width}×${app.screen.height}, scale=${scale.toFixed(3)}`
        );

        // Wire singletons.
        motionManager.setModel(model, character);
        lipSyncService.setModel(model);
        eyeController.setModel(model);
        expressionController.setModel(model);
        idleAnimator.setModel(model);

        setHaruState('idle');
        if (!cancelled) setIsLoading(false);
      } catch (err) {
        const msg = (err as Error)?.message || String(err);
        console.error(`[Live2DCanvas] model load failed for "${path}":`, err);
        if (!cancelled) {
          setLoadFailed(msg);
          setHaruState('idle');
          setIsLoading(false);
        }
      }

      // Resize → rescale + recenter the model so it stays correctly framed.
      const handleResize = () => {
        const app = appRef.current;
        const c = containerRef.current;
        if (!app || !c) return;
        const r = c.getBoundingClientRect();
        const w = Math.max(1, Math.floor(r.width || 600));
        const h = Math.max(1, Math.floor(r.height || 600));
        try { app.renderer.resize(w, h); } catch {}
        if (modelRef.current) {
          const m = modelRef.current;
          const ih = (m as any).internalModel?.originalHeight || m.height || h;
          const s = Math.max(0.05, Math.min(3, (h * character.framing.fitFraction) / ih));
          m.scale.set(s);
          m.x = w / 2;
          m.y = h * character.framing.yOffsetFraction;
        }
      };
      resizeRef.current = handleResize;
      window.addEventListener('resize', handleResize);
    };

    void init();

    return () => {
      cancelled = true;
      if (resizeRef.current) {
        window.removeEventListener('resize', resizeRef.current);
        resizeRef.current = null;
      }
      try { idleAnimator.destroy(); } catch {}
      try { motionManager.destroy(); } catch {}
      try {
        if (modelRef.current) {
          modelRef.current.destroy({ children: true });
          modelRef.current = null;
        }
      } catch (err) {
        console.warn('[Live2DCanvas] model destroy warning (non-fatal):', err);
      }
      try {
        if (appRef.current) {
          // destroy(true) → PIXI removes its own canvas from the container.
          // Safe because React doesn't have a ref on the canvas itself.
          appRef.current.destroy(true, { children: true, texture: true, baseTexture: true });
          appRef.current = null;
        }
      } catch (err) {
        console.warn('[Live2DCanvas] app destroy warning (non-fatal):', err);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 480,
      }}
    >
      {/* Loading overlay — absolute-positioned so the container stays mounted
          and PIXI's canvas can attach underneath. */}
      {isLoading && !loadFailed && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, color: '#475569', textAlign: 'center', padding: 24,
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: 56 }}>{character.emoji}</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>
            Loading {character.label}…
          </div>
          <div
            style={{
              width: 32, height: 32,
              border: '3px solid #e2e8f0',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'haru-spin 0.9s linear infinite',
            }}
          />
          <style>{`@keyframes haru-spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* Error overlay — only when load truly failed.  Container stays in DOM
          so a subsequent retry (path change) re-runs init cleanly. */}
      {loadFailed && (
        <div
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 12, color: '#475569', textAlign: 'center', padding: 24,
          }}
        >
          <div style={{ fontSize: 56 }}>{character.emoji}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#0f172a' }}>
            {character.label} is here in spirit
          </div>
          <div style={{ fontSize: 12, maxWidth: 320, color: '#64748b' }}>
            The 3D character couldn&apos;t load — the chat below still works.
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', maxWidth: 360, fontFamily: 'monospace' }}>
            {loadFailed}
          </div>
        </div>
      )}
    </div>
  );
};
