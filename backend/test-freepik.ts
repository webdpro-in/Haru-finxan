/**
 * Test Freepik Image Generation
 * Run: npx tsx test-freepik.ts
 */

import { config } from 'dotenv';
config();

// Set Freepik as the image provider
process.env.IMAGE_PROVIDER = 'freepik';

import { ProviderRegistry } from './src/providers/registry.js';

async function testFreepik() {
  console.log('\n🎨 Testing Freepik Image Generation\n');
  console.log('='.repeat(70));

  const apiKey = process.env.FREEPIK_API_KEY;
  console.log(`API Key configured: ${apiKey ? '✅ Yes' : '❌ No'}`);
  
  if (apiKey) {
    console.log(`API Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
  }
  console.log('');

  try {
    // Get the Freepik image provider
    const imageProvider = await ProviderRegistry.getImageProvider();
    console.log('✅ Freepik image provider loaded\n');

    // Test prompts
    const testPrompts = [
      'A peaceful mountain landscape at sunset',
      'Solar system diagram showing all planets',
      'Water cycle with evaporation and rain',
    ];

    console.log(`📸 Generating ${testPrompts.length} images...\n`);

    for (let i = 0; i < testPrompts.length; i++) {
      const prompt = testPrompts[i];
      console.log(`${i + 1}. Prompt: "${prompt}"`);
      console.log('   ⏳ Generating...');
      
      const startTime = Date.now();
      const imageUrl = await imageProvider.generate(prompt);
      const duration = Date.now() - startTime;
      
      console.log(`   ✅ Generated in ${duration}ms`);
      console.log(`   📍 URL: ${imageUrl.substring(0, 100)}...`);
      console.log('');
    }

    console.log('='.repeat(70));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(70));
    console.log('\n💡 Freepik API working with Pollinations.ai fallback');
    console.log('💡 Images will display on the LEFT side of the screen\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testFreepik();
