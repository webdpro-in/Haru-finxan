/**
 * Test OpenRouter Image Generation
 * Run: npx tsx test-openrouter.ts
 */

import { config } from 'dotenv';
config();

// Set OpenRouter as the image provider
process.env.IMAGE_PROVIDER = 'openrouter';

import { ProviderRegistry } from './src/providers/registry.js';

async function testOpenRouter() {
  console.log('🎨 Testing OpenRouter Image Generation\n');
  console.log('='.repeat(70));

  const apiKey = process.env.OPENROUTER_API_KEY;
  console.log(`API Key configured: ${apiKey ? '✅ Yes' : '❌ No'}`);
  
  if (apiKey) {
    console.log(`API Key: ${apiKey.substring(0, 20)}...${apiKey.substring(apiKey.length - 10)}`);
  }
  console.log('');

  try {
    // Get the OpenRouter image provider
    const imageProvider = await ProviderRegistry.getImageProvider();
    console.log('✅ OpenRouter image provider loaded\n');

    // Test prompts
    const testPrompts = [
      'A peaceful mountain landscape at sunset',
      'Solar system diagram showing all planets orbiting the sun',
      'Water cycle diagram with evaporation, condensation, and precipitation',
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
      console.log(`   📍 URL: ${imageUrl.substring(0, 80)}...`);
      console.log('');
    }

    console.log('='.repeat(70));
    console.log('✅ ALL TESTS PASSED!');
    console.log('='.repeat(70));
    console.log('\n💡 Image URLs are ready to use in the frontend');
    console.log('💡 Images will display on the LEFT side of the screen\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testOpenRouter();
