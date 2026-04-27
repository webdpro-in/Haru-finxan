/**
 * VisualPanel — hero image + thumbnail strip, synced with the explanation.
 *
 * Layout:
 *   ┌──────────────────────┐
 *   │       HERO IMAGE     │   ← currently-discussed image, full-bleed
 *   │  (active topic shot) │
 *   ├────┬────┬────────────┤
 *   │  ▢ │ ▣  │  ▢         │   ← thumbnail strip, active one ringed
 *   └────┴────┴────────────┘
 *
 * The active image follows `currentSegmentIndex` from the store while Haru is
 * speaking — `images[segmentIndex % images.length]`.  Clicking a thumbnail
 * pins it as the manual override until the next segment auto-advances.
 *
 * Crossfade: hero + previous-hero render in two stacked layers; the new layer
 * fades up over 600ms so the swap never flickers.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import './VisualPanel.css';

export const VisualPanel: React.FC = () => {
  const generatedImages = useAppStore((s) => s.generatedImages);
  const isGeneratingImages = useAppStore((s) => s.isGeneratingImages);
  const currentSegmentIndex = useAppStore((s) => s.currentSegmentIndex);
  const isTeaching = useAppStore((s) => s.isTeaching);

  // Active index: segment-driven by default, manual on click.  Manual lock
  // resets to follow the segment again whenever a new teaching turn begins.
  const [manualIndex, setManualIndex] = useState<number | null>(null);
  useEffect(() => {
    if (!isTeaching) setManualIndex(null);
  }, [isTeaching]);

  const total = generatedImages.length;
  const segmentDriven = total > 0 ? currentSegmentIndex % total : 0;
  const activeIndex = manualIndex ?? segmentDriven;
  const activeUrl = generatedImages[activeIndex] || null;

  // Track the previous hero url to crossfade when activeUrl changes.
  const [previousUrl, setPreviousUrl] = useState<string | null>(null);
  const lastUrlRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeUrl && activeUrl !== lastUrlRef.current) {
      setPreviousUrl(lastUrlRef.current);
      lastUrlRef.current = activeUrl;
    }
    if (!activeUrl) {
      lastUrlRef.current = null;
      setPreviousUrl(null);
    }
  }, [activeUrl]);

  const hasImage = !!activeUrl;

  return (
    <div className="visual-panel">
      <div className="panel-header">
        <h2>Visual Aids</h2>
        {isGeneratingImages && <span className="generating-badge">Loading…</span>}
      </div>

      <div className="panel-content visual-panel-content">
        {/* Hero stage — single full-bleed image with crossfade. */}
        <div className="visual-stage">
          {previousUrl && (
            <img
              key={`prev-${previousUrl}`}
              src={previousUrl}
              alt=""
              className="visual-image visual-image-out"
              aria-hidden
            />
          )}

          {hasImage && (
            <img
              key={activeUrl}
              src={activeUrl!}
              alt={`Visual aid ${activeIndex + 1} of ${total}`}
              className="visual-image visual-image-in"
              onLoad={() => setPreviousUrl(null)}
              onError={() => setPreviousUrl(null)}
            />
          )}

          {!hasImage && !isGeneratingImages && (
            <div className="visual-empty">
              <div className="visual-empty-icon" aria-hidden>🎨</div>
              <p className="visual-empty-title">Visual aids appear here</p>
              <p className="visual-empty-hint">
                Diagrams and photos will surface as Haru explains a topic.
              </p>
            </div>
          )}

          {!hasImage && isGeneratingImages && (
            <div className="visual-empty">
              <div className="loading-spinner" aria-hidden />
              <p className="visual-empty-title">Finding the right visuals…</p>
            </div>
          )}
        </div>

        {/* Thumbnail strip — only render when we actually have ≥2 images.
            Each thumb is clickable; the active one gets a ring + lift. */}
        {total >= 2 && (
          <div className="visual-thumbs" role="tablist" aria-label="Visual aids">
            {generatedImages.slice(0, 3).map((url, i) => {
              const isActive = i === activeIndex;
              return (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  className={`visual-thumb ${isActive ? 'active' : ''}`}
                  onClick={() => setManualIndex(i)}
                  title={`Visual ${i + 1}`}
                >
                  <img src={url} alt="" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
