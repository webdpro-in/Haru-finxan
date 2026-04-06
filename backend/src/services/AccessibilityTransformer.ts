/**
 * Accessibility Transformer
 * Provides accessibility accommodations for students with various needs
 * 
 * Task Group 30: Accessibility Transformer
 * REQ-7.2.1: Screen reader mode with ARIA labels
 * REQ-7.2.2: High contrast mode
 * REQ-7.2.3: Large text mode (16-32px)
 * REQ-7.2.4: Keyboard navigation
 * REQ-7.2.5: Reduced motion option
 * REQ-7.2.6: Transform content based on accessibility settings
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization to avoid errors when env vars are not set
let supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'placeholder_key';
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

export interface ScreenReaderSettings {
  enabled: boolean;
  ariaLabels: boolean;
  semanticHTML: boolean;
  skipLinks: boolean;
  altTextGeneration: boolean;
  headingStructure: boolean;
}

export interface HighContrastSettings {
  enabled: boolean;
  colorScheme: 'light' | 'dark' | 'custom';
  contrastRatio: number; // WCAG AA: 4.5:1, AAA: 7:1
  backgroundColor: string;
  foregroundColor: string;
  linkColor: string;
}

export interface LargeTextSettings {
  enabled: boolean;
  fontSize: number; // 16-32px
  lineHeight: number; // 1.5-2.0
  letterSpacing: number; // 0.12-0.24em
  wordSpacing: number; // 0.16-0.32em
}

export interface AccessibilitySettings {
  screenReader?: ScreenReaderSettings;
  highContrast?: HighContrastSettings;
  largeText?: LargeTextSettings;
  keyboardNavigation: boolean;
  reducedMotion: boolean;
  focusIndicators: boolean;
}

export class AccessibilityTransformer {
  /**
   * 30.1: Implement screen reader mode
   * Enable screen reader accommodations with ARIA labels
   * REQ-7.2.1: System SHALL provide screen reader mode with ARIA labels
   */
  static async enableScreenReaderMode(studentId: string): Promise<void> {
    const settings: ScreenReaderSettings = {
      enabled: true,
      ariaLabels: true,
      semanticHTML: true,
      skipLinks: true,
      altTextGeneration: true,
      headingStructure: true
    };

    const supabase = getSupabase();
    const { error } = await supabase
      .from('students')
      .update({
        accessibility_settings: {
          screenReader: settings,
          keyboardNavigation: true,
          focusIndicators: true
        }
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to enable screen reader mode: ${error.message}`);
    }
  }

  /**
   * 30.2: Implement high contrast mode
   * Enable high contrast mode with color adjustments
   * REQ-7.2.2: System SHALL provide high contrast mode
   */
  static async enableHighContrastMode(
    studentId: string,
    colorScheme: 'light' | 'dark' | 'custom' = 'dark'
  ): Promise<void> {
    const settings: HighContrastSettings = {
      enabled: true,
      colorScheme,
      contrastRatio: 7.0, // WCAG AAA
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#FFFFFF',
      foregroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      linkColor: colorScheme === 'dark' ? '#00FFFF' : '#0000FF'
    };

    const supabase = getSupabase();
    const { error } = await supabase
      .from('students')
      .update({
        accessibility_settings: {
          highContrast: settings,
          reducedMotion: true
        }
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to enable high contrast mode: ${error.message}`);
    }
  }

  /**
   * 30.3: Implement large text mode
   * Enable large text mode with configurable font sizes (16-32px)
   * REQ-7.2.3: System SHALL provide large text mode (16-32px)
   */
  static async enableLargeTextMode(
    studentId: string,
    fontSize: number = 20
  ): Promise<void> {
    // Validate font size range
    if (fontSize < 16 || fontSize > 32) {
      throw new Error('Font size must be between 16 and 32 pixels');
    }

    const settings: LargeTextSettings = {
      enabled: true,
      fontSize,
      lineHeight: 1.5,
      letterSpacing: 0.12,
      wordSpacing: 0.16
    };

    const supabase = getSupabase();
    const { error } = await supabase
      .from('students')
      .update({
        accessibility_settings: {
          largeText: settings
        }
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to enable large text mode: ${error.message}`);
    }
  }

  /**
   * 30.4: Implement content transformation
   * Transform content based on accessibility settings
   * REQ-7.2.6: System SHALL transform content based on accessibility settings
   */
  static transformContent(
    content: string,
    settings: AccessibilitySettings
  ): string {
    let transformed = content;

    // Apply screen reader transformations
    if (settings.screenReader?.enabled) {
      transformed = this.addAriaLabels(transformed);
      transformed = this.addSemanticHTML(transformed);
      transformed = this.addSkipLinks(transformed);
    }

    // Apply high contrast transformations
    if (settings.highContrast?.enabled) {
      transformed = this.enforceHighContrast(transformed, settings.highContrast);
    }

    // Apply large text transformations
    if (settings.largeText?.enabled) {
      transformed = this.applyLargeText(transformed, settings.largeText);
    }

    // Apply reduced motion
    if (settings.reducedMotion) {
      transformed = this.removeAnimations(transformed);
    }

    // Apply keyboard navigation enhancements
    if (settings.keyboardNavigation) {
      transformed = this.enhanceKeyboardNavigation(transformed);
    }

    // Apply focus indicators
    if (settings.focusIndicators) {
      transformed = this.addFocusIndicators(transformed);
    }

    return transformed;
  }

  /**
   * Add ARIA labels to interactive elements
   * REQ-7.2.1: ARIA labels for screen readers
   */
  static addAriaLabels(html: string): string {
    // Add aria-label to buttons without labels
    html = html.replace(
      /<button(?![^>]*aria-label)([^>]*)>/gi,
      '<button aria-label="Button"$1>'
    );

    // Add aria-label to inputs without labels
    html = html.replace(
      /<input(?![^>]*aria-label)([^>]*type="([^"]*)"[^>]*)>/gi,
      (match, attrs, type) => {
        const label = type ? `${type} field` : 'Input field';
        return `<input aria-label="${label}"${attrs}>`;
      }
    );

    // Add alt text to images without alt
    html = html.replace(
      /<img(?![^>]*alt)([^>]*)>/gi,
      '<img alt="Image"$1>'
    );

    // Add aria-label to links without text
    html = html.replace(
      /<a(?![^>]*aria-label)([^>]*)><\/a>/gi,
      '<a aria-label="Link"$1></a>'
    );

    return html;
  }

  /**
   * Add semantic HTML structure
   * REQ-7.2.1: Semantic HTML for screen readers
   */
  static addSemanticHTML(html: string): string {
    // Wrap main content in <main> if not present
    if (!html.includes('<main')) {
      html = `<main role="main">${html}</main>`;
    }

    // Add role attributes to common elements
    html = html.replace(/<nav(?![^>]*role)/gi, '<nav role="navigation"');
    html = html.replace(/<header(?![^>]*role)/gi, '<header role="banner"');
    html = html.replace(/<footer(?![^>]*role)/gi, '<footer role="contentinfo"');
    html = html.replace(/<aside(?![^>]*role)/gi, '<aside role="complementary"');

    return html;
  }

  /**
   * Add skip links for keyboard navigation
   * REQ-7.2.4: Keyboard navigation support
   */
  static addSkipLinks(html: string): string {
    const skipLinks = `
      <div class="skip-links">
        <a href="#main-content" class="skip-link">Skip to main content</a>
        <a href="#navigation" class="skip-link">Skip to navigation</a>
      </div>
    `;

    // Add skip links at the beginning
    return skipLinks + html;
  }

  /**
   * Enforce high contrast colors
   * REQ-7.2.2: High contrast mode
   */
  static enforceHighContrast(html: string, settings: HighContrastSettings): string {
    const { backgroundColor, foregroundColor, linkColor } = settings;

    // Replace inline color styles
    html = html.replace(
      /color:\s*#[a-fA-F0-9]{3,6}/gi,
      `color: ${foregroundColor}`
    );

    html = html.replace(
      /background-color:\s*#[a-fA-F0-9]{3,6}/gi,
      `background-color: ${backgroundColor}`
    );

    // Add high contrast class
    html = html.replace(
      /<body/gi,
      `<body class="high-contrast-${settings.colorScheme}"`
    );

    // Ensure link colors are visible
    html = html.replace(
      /<a /gi,
      `<a style="color: ${linkColor}; text-decoration: underline;" `
    );

    return html;
  }

  /**
   * Apply large text settings
   * REQ-7.2.3: Large text mode (16-32px)
   */
  static applyLargeText(html: string, settings: LargeTextSettings): string {
    const { fontSize, lineHeight, letterSpacing, wordSpacing } = settings;

    // Add inline styles for text sizing
    const textStyles = `
      font-size: ${fontSize}px;
      line-height: ${lineHeight};
      letter-spacing: ${letterSpacing}em;
      word-spacing: ${wordSpacing}em;
    `;

    // Apply to body or main container
    html = html.replace(
      /<body/gi,
      `<body style="${textStyles}"`
    );

    return html;
  }

  /**
   * Remove animations and transitions
   * REQ-7.2.5: Reduced motion option
   */
  static removeAnimations(html: string): string {
    // Remove CSS animations
    html = html.replace(/animation:\s*[^;]+;/gi, '');
    html = html.replace(/animation-[^:]+:\s*[^;]+;/gi, '');

    // Remove CSS transitions
    html = html.replace(/transition:\s*[^;]+;/gi, '');
    html = html.replace(/transition-[^:]+:\s*[^;]+;/gi, '');

    // Remove transform animations
    html = html.replace(/transform:\s*[^;]+;/gi, '');

    // Add prefers-reduced-motion class
    html = html.replace(
      /<body/gi,
      '<body class="prefers-reduced-motion"'
    );

    return html;
  }

  /**
   * Enhance keyboard navigation
   * REQ-7.2.4: Keyboard navigation support
   */
  static enhanceKeyboardNavigation(html: string): string {
    // Add tabindex to interactive elements without it
    html = html.replace(
      /<button(?![^>]*tabindex)/gi,
      '<button tabindex="0"'
    );

    html = html.replace(
      /<a(?![^>]*tabindex)/gi,
      '<a tabindex="0"'
    );

    // Add keyboard event handlers hint
    html = html.replace(
      /<button/gi,
      '<button data-keyboard-accessible="true"'
    );

    return html;
  }

  /**
   * Add visible focus indicators
   * REQ-7.2.4: Keyboard navigation support
   */
  static addFocusIndicators(html: string): string {
    // Add focus indicator styles
    const focusStyles = `
      <style>
        *:focus {
          outline: 3px solid #4A90E2;
          outline-offset: 2px;
        }
        .skip-link:focus {
          position: absolute;
          top: 0;
          left: 0;
          background: #000;
          color: #fff;
          padding: 8px;
          z-index: 9999;
        }
      </style>
    `;

    // Add styles to head or beginning
    if (html.includes('<head>')) {
      html = html.replace('</head>', `${focusStyles}</head>`);
    } else {
      html = focusStyles + html;
    }

    return html;
  }

  /**
   * Get accessibility settings for a student
   */
  static async getAccessibilitySettings(studentId: string): Promise<AccessibilitySettings | null> {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('students')
      .select('accessibility_settings')
      .eq('student_id', studentId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.accessibility_settings as AccessibilitySettings;
  }

  /**
   * Update accessibility settings for a student
   */
  static async updateAccessibilitySettings(
    studentId: string,
    settings: Partial<AccessibilitySettings>
  ): Promise<void> {
    const supabase = getSupabase();

    // Get current settings
    const currentSettings = await this.getAccessibilitySettings(studentId) || {};

    // Merge with new settings
    const updatedSettings = {
      ...currentSettings,
      ...settings
    };

    const { error } = await supabase
      .from('students')
      .update({
        accessibility_settings: updatedSettings
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to update accessibility settings: ${error.message}`);
    }
  }

  /**
   * Disable all accessibility modes
   */
  static async disableAllModes(studentId: string): Promise<void> {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('students')
      .update({
        accessibility_settings: {
          keyboardNavigation: false,
          reducedMotion: false,
          focusIndicators: false
        }
      })
      .eq('student_id', studentId);

    if (error) {
      throw new Error(`Failed to disable accessibility modes: ${error.message}`);
    }
  }
}
