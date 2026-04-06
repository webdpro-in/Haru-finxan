/**
 * Test Pollinations.ai Image Generation
 * Run: npx tsx test-pollinations.ts
 */

import { config } from 'dotenv';
config();

// Set Pollinations as the image provider
process.env.IMAGE_PROVIDER = 'pollinations';

import { ProviderRegistry } from './src/providers/registry.js';

async function testPollinations() {
  console.log('🎨 Testing Pollinations.ai Image Generation\n');
  console.log('='.repeat(70));

  try {
    // Get the Pollinations image provider
    const imageProvider = await ProviderRegistry.getImageProvider();
    console.log('✅ Pollinations image provider loaded\n');

    // Test prompts
    const testPrompts = [
      'A peaceful mountain landscape at sunset',
      'Solar system diagram showing all planets orbiting the sun',
      'Water cycle diagram with labels showing evaporation and rain',
    ];

    console.log(`📸 Generating ${testPrompts.length} images...\n`);

    for (let i = 0; i < testPrompts.length; i++) {
      const prompt = testPrompts[i];
      console.log(`${i + 1}. Prompt: "${prompt}"`);
      
      const startTime = Date.now();
      const imageUrl = await imageProvider.generate(prompt);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Generated in ${duration}ms`);
      console.log(`   📍 URL: ${imageUrl}`);
      console.log('');
    }

    console.log('='.repeat(70));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(70));
    console.log('\n💡 These URLs can be used directly in <img> tags');
    console.log('💡 Images generate on-demand when the URL is accessed');
    console.log('💡 No API keys required - completely free!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testPollinations();
