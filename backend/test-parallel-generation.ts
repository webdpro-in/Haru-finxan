/**
 * Test script for parallel image generation
 * 
 * Run this to test the image detection and parallel generation:
 * npx tsx test-parallel-generation.ts
 */

import { config } from 'dotenv';
config();

// Set Puter as the image provider
process.env.IMAGE_PROVIDER = 'puter';

import { ImageDetector } from './src/utils/imageDetector.js';
import { ProviderRegistry } from './src/providers/registry.js';

async function testParallelGeneration() {
  console.log('🧪 Testing Parallel Image Generation\n');

  // Test cases
  const testCases = [
    {
      userMessage: 'Show me the solar system',
      aiResponse: 'The solar system consists of the Sun and eight planets. Look at the diagram showing the planets orbiting the Sun. Each planet has unique characteristics.',
    },
    {
      userMessage: 'Explain photosynthesis',
      aiResponse: 'Photosynthesis is the process where plants convert sunlight into energy. The diagram shows how chloroplasts capture light energy. Water and carbon dioxide are converted into glucose and oxygen.',
    },
    {
      userMessage: 'What is a mountain?',
      aiResponse: 'A mountain is a large natural elevation of the earth\'s surface. Mountains form through tectonic forces or volcanism. They typically have steep slopes and significant height.',
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`User: "${testCase.userMessage}"`);
    console.log(`AI: "${testCase.aiResponse.substring(0, 100)}..."`);
    console.log(`${'='.repeat(80)}\n`);

    // 1. Detect if images are needed
    const needsImages = ImageDetector.needsImages(testCase.aiResponse);
    console.log(`Needs images: ${needsImages ? '✓ YES' : '✗ NO'}`);

    if (needsImages) {
      // 2. Extract prompts
      const prompts = ImageDetector.extractPrompts(testCase.aiResponse, testCase.userMessage);
      console.log(`\nExtracted ${prompts.length} prompts:`);
      prompts.forEach((p, i) => {
        console.log(`  ${i + 1}. [Priority ${p.priority}] "${p.prompt}"`);
      });

      // 3. Generate images in parallel
      if (prompts.length > 0) {
        console.log(`\n🎨 Generating ${prompts.length} images in parallel...`);
        const startTime = Date.now();

        const imageProvider = await ProviderRegistry.getImageProvider();
        
        const imagePromises = prompts.map(({ prompt }, index) => 
          imageProvider.generate(prompt)
            .then(url => {
              const duration = Date.now() - startTime;
              console.log(`  ✓ Image ${index + 1} generated in ${duration}ms`);
              return url;
            })
            .catch(error => {
              console.error(`  ✗ Image ${index + 1} failed:`, error.message);
              return null;
            })
        );

        const results = await Promise.all(imagePromises);
        const successCount = results.filter(r => r !== null).length;
        const totalDuration = Date.now() - startTime;

        console.log(`\n✅ Parallel generation complete:`);
        console.log(`   - Total time: ${totalDuration}ms`);
        console.log(`   - Success: ${successCount}/${prompts.length}`);
        console.log(`   - Average: ${Math.round(totalDuration / prompts.length)}ms per image`);
      }
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('🎉 All tests complete!');
  console.log(`${'='.repeat(80)}\n`);
}

testParallelGeneration().catch(console.error);
