/**
 * Right Panel Component
 * Displays generated images with real-time loading states
 */

import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import './RightPanel.css';

export const RightPanel: React.FC = () => {
  const { generatedImages, isGeneratingImages } = useAppStore();
  const [loadingImages, setLoadingImages] = useState<boolean[]>([]);

  // Debug logging
  useEffect(() => {
    console.log('🖼️ RightPanel: generatedImages changed:', generatedImages);
    console.log('🖼️ RightPanel: isGeneratingImages:', isGeneratingImages);
  }, [generatedImages, isGeneratingImages]);

  // Track loading state for each image
  useEffect(() => {
    if (isGeneratingImages) {
      // Initialize loading states
      setLoadingImages([true, true, true]); // Assume max 3 images
    } else {
      setLoadingImages([]);
    }
  }, [isGeneratingImages]);

  // Update loading states as images arrive
  useEffect(() => {
    if (generatedImages.length > 0 && loadingImages.length > 0) {
      const newLoadingStates = [...loadingImages];
      for (let i = 0; i < generatedImages.length; i++) {
        newLoadingStates[i] = false;
      }
      setLoadingImages(newLoadingStates);
    }
  }, [generatedImages.length]);

  return (
    <div className="right-panel">
      <div className="panel-header">
        <h2>Generated Images</h2>
        {isGeneratingImages && (
          <span className="generating-badge">Generating...</span>
        )}
      </div>
      <div className="panel-content">
        {generatedImages && generatedImages.length > 0 ? (
          <div className="image-grid">
            {generatedImages.map((imageUrl, index) => (
              <div key={index} className="image-container fade-in">
                <img
                  src={imageUrl}
                  alt={`Generated ${index + 1}`}
                  className="reference-image"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
                  }}
                />
              </div>
            ))}
            {/* Show loading placeholders for remaining images */}
            {isGeneratingImages && loadingImages.slice(generatedImages.length).map((_, index) => (
              <div key={`loading-${index}`} className="image-container loading">
                <div className="image-loading-spinner"></div>
              </div>
            ))}
          </div>
        ) : isGeneratingImages ? (
          <div className="placeholder">
            <div className="loading-spinner"></div>
            <p>🎨 Generating images...</p>
            <p className="placeholder-hint">This will take just a few seconds!</p>
          </div>
        ) : (
          <div className="placeholder">
            <p>🎨 Generated images will appear here</p>
            <p className="placeholder-hint">Ask me to create or explain something visual!</p>
          </div>
        )}
      </div>
    </div>
  );
};
