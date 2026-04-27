/**
 * Text Cleaner Utility
 * Cleans text for TTS by removing special characters while preserving math symbols
 * Supports multiple languages including English and Indian languages
 */

/**
 * Cleans text for TTS by removing special characters
 * Preserves mathematical symbols when they appear in math context
 * Handles Unicode characters for Indian languages (Devanagari, Tamil, Telugu, etc.)
 */
export function cleanTextForTTS(text: string): string {
  // First, identify and protect math expressions
  const mathPatterns = [
    /\d+\s*[\+\-\*\/\=\<\>]\s*\d+/g, // Basic math: 5 + 3, 10 - 2, etc.
    /\d+\s*[\+\-\*\/]\s*\d+\s*[\+\-\*\/]\s*\d+/g, // Complex math: 5 + 3 - 2
    /[\+\-\*\/\=\<\>]\s*\d+/g, // Operators with numbers: + 5, - 3
    /\d+\s*%/g, // Percentages: 50%
    /\$\s*\d+/g, // Currency: $10
    /₹\s*\d+/g, // Indian Rupee: ₹100
  ];

  // Store math expressions temporarily
  const mathExpressions: string[] = [];
  let protectedText = text;

  mathPatterns.forEach(pattern => {
    protectedText = protectedText.replace(pattern, (match) => {
      const index = mathExpressions.length;
      mathExpressions.push(match);
      return `__MATH_${index}__`;
    });
  });

  // Remove special characters that are NOT in math context
  // Keep: letters (including Unicode for Indian languages), numbers, spaces, basic punctuation
  // Remove: @#$^&*()[]{}|\/~` and other special symbols
  // Preserve: Devanagari (U+0900-U+097F), Tamil (U+0B80-U+0BFF), Telugu (U+0C00-U+0C7F),
  //           Kannada (U+0C80-U+0CFF), Bengali (U+0980-U+09FF), Malayalam (U+0D00-U+0D7F)
  protectedText = protectedText.replace(/[!@#$%^&*()_+=\[\]{};:'"|\\<>,~`]/g, ' ');

  // Restore math expressions
  mathExpressions.forEach((expr, index) => {
    protectedText = protectedText.replace(`__MATH_${index}__`, expr);
  });

  // Clean up multiple spaces
  protectedText = protectedText.replace(/\s+/g, ' ').trim();

  return protectedText;
}

/**
 * Converts math symbols to spoken words for TTS
 */
export function mathSymbolsToWords(text: string): string {
  const replacements: Record<string, string> = {
    '+': ' plus ',
    '-': ' minus ',
    '*': ' times ',
    '×': ' times ',
    '/': ' divided by ',
    '÷': ' divided by ',
    '=': ' equals ',
    '<': ' less than ',
    '>': ' greater than ',
    '≤': ' less than or equal to ',
    '≥': ' greater than or equal to ',
    '%': ' percent ',
    '^': ' to the power of ',
  };

  let result = text;
  Object.entries(replacements).forEach(([symbol, word]) => {
    result = result.replace(new RegExp(`\\${symbol}`, 'g'), word);
  });

  return result;
}
