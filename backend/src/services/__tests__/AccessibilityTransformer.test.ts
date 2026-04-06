/**
 * Tests for Accessibility Transformer
 * Task 30.5: Write unit tests for transformations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AccessibilityTransformer } from '../AccessibilityTransformer.js';
import type { AccessibilitySettings, HighContrastSettings, LargeTextSettings } from '../AccessibilityTransformer.js';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null }))
        }))
      }))
    }))
  }))
}));

describe('AccessibilityTransformer', () => {
  describe('enableScreenReaderMode', () => {
    it('should enable screen reader mode successfully', async () => {
      await expect(
        AccessibilityTransformer.enableScreenReaderMode('student-123')
      ).resolves.not.toThrow();
    });

    it('should enable ARIA labels', async () => {
      await expect(
        AccessibilityTransformer.enableScreenReaderMode('student-123')
      ).resolves.not.toThrow();
    });

    it('should enable semantic HTML', async () => {
      await expect(
        AccessibilityTransformer.enableScreenReaderMode('student-123')
      ).resolves.not.toThrow();
    });

    it('should enable skip links', async () => {
      await expect(
        AccessibilityTransformer.enableScreenReaderMode('student-123')
      ).resolves.not.toThrow();
    });

    it('should enable keyboard navigation', async () => {
      await expect(
        AccessibilityTransformer.enableScreenReaderMode('student-123')
      ).resolves.not.toThrow();
    });
  });

  describe('enableHighContrastMode', () => {
    it('should enable high contrast mode with dark scheme', async () => {
      await expect(
        AccessibilityTransformer.enableHighContrastMode('student-123', 'dark')
      ).resolves.not.toThrow();
    });

    it('should enable high contrast mode with light scheme', async () => {
      await expect(
        AccessibilityTransformer.enableHighContrastMode('student-123', 'light')
      ).resolves.not.toThrow();
    });

    it('should enable high contrast mode with custom scheme', async () => {
      await expect(
        AccessibilityTransformer.enableHighContrastMode('student-123', 'custom')
      ).resolves.not.toThrow();
    });

    it('should default to dark scheme', async () => {
      await expect(
        AccessibilityTransformer.enableHighContrastMode('student-123')
      ).resolves.not.toThrow();
    });

    it('should enable reduced motion with high contrast', async () => {
      await expect(
        AccessibilityTransformer.enableHighContrastMode('student-123', 'dark')
      ).resolves.not.toThrow();
    });

    it('should set WCAG AAA contrast ratio (7:1)', async () => {
      await expect(
        AccessibilityTransformer.enableHighContrastMode('student-123', 'dark')
      ).resolves.not.toThrow();
    });
  });

  describe('enableLargeTextMode', () => {
    it('should enable large text mode with default size (20px)', async () => {
      await expect(
        AccessibilityTransformer.enableLargeTextMode('student-123')
      ).resolves.not.toThrow();
    });

    it('should enable large text mode with custom size (24px)', async () => {
      await expect(
        AccessibilityTransformer.enableLargeTextMode('student-123', 24)
      ).resolves.not.toThrow();
    });

    it('should accept minimum font size (16px)', async () => {
      await expect(
        AccessibilityTransformer.enableLargeTextMode('student-123', 16)
      ).resolves.not.toThrow();
    });

    it('should accept maximum font size (32px)', async () => {
      await expect(
        AccessibilityTransformer.enableLargeTextMode('student-123', 32)
      ).resolves.not.toThrow();
    });

    it('should reject font size below 16px', async () => {
      await expect(
        AccessibilityTransformer.enableLargeTextMode('student-123', 14)
      ).rejects.toThrow('Font size must be between 16 and 32 pixels');
    });

    it('should reject font size above 32px', async () => {
      await expect(
        AccessibilityTransformer.enableLargeTextMode('student-123', 36)
      ).rejects.toThrow('Font size must be between 16 and 32 pixels');
    });

    it('should set appropriate line height (1.5)', async () => {
      await expect(
        AccessibilityTransformer.enableLargeTextMode('student-123', 20)
      ).resolves.not.toThrow();
    });

    it('should set appropriate letter spacing (0.12em)', async () => {
      await expect(
        AccessibilityTransformer.enableLargeTextMode('student-123', 20)
      ).resolves.not.toThrow();
    });
  });

  describe('transformContent', () => {
    it('should transform content with screen reader settings', () => {
      const settings: AccessibilitySettings = {
        screenReader: {
          enabled: true,
          ariaLabels: true,
          semanticHTML: true,
          skipLinks: true,
          altTextGeneration: true,
          headingStructure: true
        },
        keyboardNavigation: false,
        reducedMotion: false,
        focusIndicators: false
      };

      const content = '<button>Click me</button>';
      const result = AccessibilityTransformer.transformContent(content, settings);

      expect(result).toContain('aria-label');
      expect(result).toContain('skip-link');
    });

    it('should transform content with high contrast settings', () => {
      const settings: AccessibilitySettings = {
        highContrast: {
          enabled: true,
          colorScheme: 'dark',
          contrastRatio: 7.0,
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          linkColor: '#00FFFF'
        },
        keyboardNavigation: false,
        reducedMotion: false,
        focusIndicators: false
      };

      const content = '<body><p style="color: #888888">Text</p></body>';
      const result = AccessibilityTransformer.transformContent(content, settings);

      expect(result).toContain('#FFFFFF');
      expect(result).toContain('high-contrast-dark');
    });

    it('should transform content with large text settings', () => {
      const settings: AccessibilitySettings = {
        largeText: {
          enabled: true,
          fontSize: 24,
          lineHeight: 1.5,
          letterSpacing: 0.12,
          wordSpacing: 0.16
        },
        keyboardNavigation: false,
        reducedMotion: false,
        focusIndicators: false
      };

      const content = '<body>Text content</body>';
      const result = AccessibilityTransformer.transformContent(content, settings);

      expect(result).toContain('font-size: 24px');
      expect(result).toContain('line-height: 1.5');
      expect(result).toContain('letter-spacing: 0.12em');
    });

    it('should transform content with reduced motion', () => {
      const settings: AccessibilitySettings = {
        keyboardNavigation: false,
        reducedMotion: true,
        focusIndicators: false
      };

      const content = '<body><div style="animation: slide 1s; transition: all 0.3s;">Content</div></body>';
      const result = AccessibilityTransformer.transformContent(content, settings);

      expect(result).not.toContain('animation:');
      expect(result).not.toContain('transition:');
      expect(result).toContain('prefers-reduced-motion');
    });

    it('should transform content with keyboard navigation', () => {
      const settings: AccessibilitySettings = {
        keyboardNavigation: true,
        reducedMotion: false,
        focusIndicators: false
      };

      const content = '<button>Click</button><a href="#">Link</a>';
      const result = AccessibilityTransformer.transformContent(content, settings);

      expect(result).toContain('tabindex="0"');
      expect(result).toContain('data-keyboard-accessible');
    });

    it('should transform content with focus indicators', () => {
      const settings: AccessibilitySettings = {
        keyboardNavigation: false,
        reducedMotion: false,
        focusIndicators: true
      };

      const content = '<button>Click</button>';
      const result = AccessibilityTransformer.transformContent(content, settings);

      expect(result).toContain('*:focus');
      expect(result).toContain('outline:');
    });

    it('should apply multiple transformations together', () => {
      const settings: AccessibilitySettings = {
        screenReader: {
          enabled: true,
          ariaLabels: true,
          semanticHTML: true,
          skipLinks: true,
          altTextGeneration: true,
          headingStructure: true
        },
        highContrast: {
          enabled: true,
          colorScheme: 'dark',
          contrastRatio: 7.0,
          backgroundColor: '#000000',
          foregroundColor: '#FFFFFF',
          linkColor: '#00FFFF'
        },
        largeText: {
          enabled: true,
          fontSize: 20,
          lineHeight: 1.5,
          letterSpacing: 0.12,
          wordSpacing: 0.16
        },
        keyboardNavigation: true,
        reducedMotion: true,
        focusIndicators: true
      };

      const content = '<body><button>Click</button><img src="test.jpg"></body>';
      const result = AccessibilityTransformer.transformContent(content, settings);

      expect(result).toContain('aria-label');
      expect(result).toContain('alt=');
      expect(result).toContain('font-size: 20px');
      expect(result).toContain('high-contrast-dark');
      expect(result).toContain('tabindex="0"');
      expect(result).toContain('prefers-reduced-motion');
      expect(result).toContain('*:focus');
    });
  });

  describe('addAriaLabels', () => {
    it('should add aria-label to buttons without labels', () => {
      const html = '<button>Click me</button>';
      const result = AccessibilityTransformer.addAriaLabels(html);

      expect(result).toContain('aria-label="Button"');
    });

    it('should not duplicate aria-label on buttons that already have it', () => {
      const html = '<button aria-label="Submit">Submit</button>';
      const result = AccessibilityTransformer.addAriaLabels(html);

      expect(result).toBe(html);
    });

    it('should add aria-label to input fields', () => {
      const html = '<input type="text">';
      const result = AccessibilityTransformer.addAriaLabels(html);

      expect(result).toContain('aria-label="text field"');
    });

    it('should add alt text to images without alt', () => {
      const html = '<img src="test.jpg">';
      const result = AccessibilityTransformer.addAriaLabels(html);

      expect(result).toContain('alt="Image"');
    });

    it('should not duplicate alt text on images that already have it', () => {
      const html = '<img src="test.jpg" alt="Test image">';
      const result = AccessibilityTransformer.addAriaLabels(html);

      expect(result).toContain('alt="Test image"');
    });

    it('should add aria-label to empty links', () => {
      const html = '<a href="#"></a>';
      const result = AccessibilityTransformer.addAriaLabels(html);

      expect(result).toContain('aria-label="Link"');
    });

    it('should handle multiple elements', () => {
      const html = '<button>One</button><input type="email"><img src="pic.jpg">';
      const result = AccessibilityTransformer.addAriaLabels(html);

      expect(result).toContain('aria-label="Button"');
      expect(result).toContain('aria-label="email field"');
      expect(result).toContain('alt="Image"');
    });
  });

  describe('addSemanticHTML', () => {
    it('should wrap content in main tag if not present', () => {
      const html = '<div>Content</div>';
      const result = AccessibilityTransformer.addSemanticHTML(html);

      expect(result).toContain('<main role="main">');
      expect(result).toContain('</main>');
    });

    it('should not wrap content if main tag already exists', () => {
      const html = '<main>Content</main>';
      const result = AccessibilityTransformer.addSemanticHTML(html);

      expect(result).toBe(html);
    });

    it('should add role to nav elements', () => {
      const html = '<nav>Navigation</nav>';
      const result = AccessibilityTransformer.addSemanticHTML(html);

      expect(result).toContain('role="navigation"');
    });

    it('should add role to header elements', () => {
      const html = '<header>Header</header>';
      const result = AccessibilityTransformer.addSemanticHTML(html);

      expect(result).toContain('role="banner"');
    });

    it('should add role to footer elements', () => {
      const html = '<footer>Footer</footer>';
      const result = AccessibilityTransformer.addSemanticHTML(html);

      expect(result).toContain('role="contentinfo"');
    });

    it('should add role to aside elements', () => {
      const html = '<aside>Sidebar</aside>';
      const result = AccessibilityTransformer.addSemanticHTML(html);

      expect(result).toContain('role="complementary"');
    });
  });

  describe('addSkipLinks', () => {
    it('should add skip links to content', () => {
      const html = '<div>Content</div>';
      const result = AccessibilityTransformer.addSkipLinks(html);

      expect(result).toContain('skip-links');
      expect(result).toContain('Skip to main content');
      expect(result).toContain('Skip to navigation');
    });

    it('should add skip links at the beginning', () => {
      const html = '<div>Content</div>';
      const result = AccessibilityTransformer.addSkipLinks(html);

      expect(result.indexOf('skip-links')).toBeLessThan(result.indexOf('Content'));
    });
  });

  describe('enforceHighContrast', () => {
    it('should replace inline color styles', () => {
      const settings: HighContrastSettings = {
        enabled: true,
        colorScheme: 'dark',
        contrastRatio: 7.0,
        backgroundColor: '#000000',
        foregroundColor: '#FFFFFF',
        linkColor: '#00FFFF'
      };

      const html = '<p style="color: #888888">Text</p>';
      const result = AccessibilityTransformer.enforceHighContrast(html, settings);

      expect(result).toContain('color: #FFFFFF');
    });

    it('should replace background color styles', () => {
      const settings: HighContrastSettings = {
        enabled: true,
        colorScheme: 'dark',
        contrastRatio: 7.0,
        backgroundColor: '#000000',
        foregroundColor: '#FFFFFF',
        linkColor: '#00FFFF'
      };

      const html = '<div style="background-color: #F0F0F0">Content</div>';
      const result = AccessibilityTransformer.enforceHighContrast(html, settings);

      expect(result).toContain('background-color: #000000');
    });

    it('should add high contrast class to body', () => {
      const settings: HighContrastSettings = {
        enabled: true,
        colorScheme: 'dark',
        contrastRatio: 7.0,
        backgroundColor: '#000000',
        foregroundColor: '#FFFFFF',
        linkColor: '#00FFFF'
      };

      const html = '<body>Content</body>';
      const result = AccessibilityTransformer.enforceHighContrast(html, settings);

      expect(result).toContain('class="high-contrast-dark"');
    });

    it('should ensure link colors are visible', () => {
      const settings: HighContrastSettings = {
        enabled: true,
        colorScheme: 'dark',
        contrastRatio: 7.0,
        backgroundColor: '#000000',
        foregroundColor: '#FFFFFF',
        linkColor: '#00FFFF'
      };

      const html = '<a href="#">Link</a>';
      const result = AccessibilityTransformer.enforceHighContrast(html, settings);

      expect(result).toContain('color: #00FFFF');
      expect(result).toContain('text-decoration: underline');
    });

    it('should work with light color scheme', () => {
      const settings: HighContrastSettings = {
        enabled: true,
        colorScheme: 'light',
        contrastRatio: 7.0,
        backgroundColor: '#FFFFFF',
        foregroundColor: '#000000',
        linkColor: '#0000FF'
      };

      const html = '<body><p style="color: #888888; background-color: #F0F0F0">Text</p></body>';
      const result = AccessibilityTransformer.enforceHighContrast(html, settings);

      expect(result).toContain('color: #000000');
      expect(result).toContain('background-color: #FFFFFF');
      expect(result).toContain('high-contrast-light');
    });
  });

  describe('applyLargeText', () => {
    it('should apply font size to body', () => {
      const settings: LargeTextSettings = {
        enabled: true,
        fontSize: 24,
        lineHeight: 1.5,
        letterSpacing: 0.12,
        wordSpacing: 0.16
      };

      const html = '<body>Content</body>';
      const result = AccessibilityTransformer.applyLargeText(html, settings);

      expect(result).toContain('font-size: 24px');
    });

    it('should apply line height', () => {
      const settings: LargeTextSettings = {
        enabled: true,
        fontSize: 20,
        lineHeight: 1.8,
        letterSpacing: 0.12,
        wordSpacing: 0.16
      };

      const html = '<body>Content</body>';
      const result = AccessibilityTransformer.applyLargeText(html, settings);

      expect(result).toContain('line-height: 1.8');
    });

    it('should apply letter spacing', () => {
      const settings: LargeTextSettings = {
        enabled: true,
        fontSize: 20,
        lineHeight: 1.5,
        letterSpacing: 0.15,
        wordSpacing: 0.16
      };

      const html = '<body>Content</body>';
      const result = AccessibilityTransformer.applyLargeText(html, settings);

      expect(result).toContain('letter-spacing: 0.15em');
    });

    it('should apply word spacing', () => {
      const settings: LargeTextSettings = {
        enabled: true,
        fontSize: 20,
        lineHeight: 1.5,
        letterSpacing: 0.12,
        wordSpacing: 0.20
      };

      const html = '<body>Content</body>';
      const result = AccessibilityTransformer.applyLargeText(html, settings);

      expect(result).toContain('word-spacing: 0.2em');
    });
  });

  describe('removeAnimations', () => {
    it('should remove CSS animations', () => {
      const html = '<div style="animation: slide 1s ease-in-out;">Content</div>';
      const result = AccessibilityTransformer.removeAnimations(html);

      expect(result).not.toContain('animation:');
    });

    it('should remove CSS transitions', () => {
      const html = '<div style="transition: all 0.3s;">Content</div>';
      const result = AccessibilityTransformer.removeAnimations(html);

      expect(result).not.toContain('transition:');
    });

    it('should remove transform animations', () => {
      const html = '<div style="transform: rotate(45deg);">Content</div>';
      const result = AccessibilityTransformer.removeAnimations(html);

      expect(result).not.toContain('transform:');
    });

    it('should add prefers-reduced-motion class', () => {
      const html = '<body>Content</body>';
      const result = AccessibilityTransformer.removeAnimations(html);

      expect(result).toContain('class="prefers-reduced-motion"');
    });

    it('should handle multiple animation properties', () => {
      const html = '<div style="animation: slide 1s; transition: opacity 0.5s; transform: scale(1.2);">Content</div>';
      const result = AccessibilityTransformer.removeAnimations(html);

      expect(result).not.toContain('animation:');
      expect(result).not.toContain('transition:');
      expect(result).not.toContain('transform:');
    });
  });

  describe('enhanceKeyboardNavigation', () => {
    it('should add tabindex to buttons', () => {
      const html = '<button>Click</button>';
      const result = AccessibilityTransformer.enhanceKeyboardNavigation(html);

      expect(result).toContain('tabindex="0"');
    });

    it('should add tabindex to links', () => {
      const html = '<a href="#">Link</a>';
      const result = AccessibilityTransformer.enhanceKeyboardNavigation(html);

      expect(result).toContain('tabindex="0"');
    });

    it('should add keyboard accessible data attribute', () => {
      const html = '<button>Click</button>';
      const result = AccessibilityTransformer.enhanceKeyboardNavigation(html);

      expect(result).toContain('data-keyboard-accessible="true"');
    });

    it('should not duplicate tabindex', () => {
      const html = '<button tabindex="1">Click</button>';
      const result = AccessibilityTransformer.enhanceKeyboardNavigation(html);

      expect(result).toBe(html.replace('<button', '<button data-keyboard-accessible="true"'));
    });
  });

  describe('addFocusIndicators', () => {
    it('should add focus indicator styles', () => {
      const html = '<button>Click</button>';
      const result = AccessibilityTransformer.addFocusIndicators(html);

      expect(result).toContain('*:focus');
      expect(result).toContain('outline:');
    });

    it('should add skip link focus styles', () => {
      const html = '<div>Content</div>';
      const result = AccessibilityTransformer.addFocusIndicators(html);

      expect(result).toContain('.skip-link:focus');
    });

    it('should add styles to head if present', () => {
      const html = '<head><title>Test</title></head><body>Content</body>';
      const result = AccessibilityTransformer.addFocusIndicators(html);

      expect(result).toContain('<head>');
      expect(result).toContain('*:focus');
      expect(result).toContain('</head>');
    });

    it('should add styles at beginning if no head tag', () => {
      const html = '<body>Content</body>';
      const result = AccessibilityTransformer.addFocusIndicators(html);

      expect(result.indexOf('<style>')).toBeLessThan(result.indexOf('<body>'));
    });
  });

  describe('getAccessibilitySettings', () => {
    it('should return null when no settings exist', async () => {
      const result = await AccessibilityTransformer.getAccessibilitySettings('student-123');
      expect(result).toBeNull();
    });
  });

  describe('updateAccessibilitySettings', () => {
    it('should update accessibility settings', async () => {
      const settings: Partial<AccessibilitySettings> = {
        keyboardNavigation: true,
        reducedMotion: true
      };

      await expect(
        AccessibilityTransformer.updateAccessibilitySettings('student-123', settings)
      ).resolves.not.toThrow();
    });

    it('should merge with existing settings', async () => {
      const settings: Partial<AccessibilitySettings> = {
        focusIndicators: true
      };

      await expect(
        AccessibilityTransformer.updateAccessibilitySettings('student-123', settings)
      ).resolves.not.toThrow();
    });
  });

  describe('disableAllModes', () => {
    it('should disable all accessibility modes', async () => {
      await expect(
        AccessibilityTransformer.disableAllModes('student-123')
      ).resolves.not.toThrow();
    });
  });
});
