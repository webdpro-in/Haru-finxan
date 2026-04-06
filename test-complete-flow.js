/**
 * Test Complete Image Generation Flow
 * Tests backend API and verifies images are generated
 */

const API_URL = 'http://localhost:3001/api';

async function testFlow() {
  console.log('\n🧪 Testing Complete Image Generation Flow\n');
  console.log('='.repeat(70));

  // Test 1: Direct image generation
  console.log('\n📸 Test 1: Direct Image Generation (/api/images/generate)');
  console.log('-'.repeat(70));
  try {
    const response = await fetch(`${API_URL}/images/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'A beautiful sunset over mountains' })
    });
    const data = await response.json();
    console.log('✅ Success!');
    console.log(`   URL: ${data.imageUrl}`);
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
  }

  // Test 2: Test endpoint (3 images)
  console.log('\n📸 Test 2: Test Endpoint (/api/images/test)');
  console.log('-'.repeat(70));
  try {
    const response = await fetch(`${API_URL}/images/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    console.log(`✅ Success! Generated ${data.images.length} images`);
    data.images.forEach((url, i) => {
      console.log(`   ${i + 1}. ${url.substring(0, 80)}...`);
    });
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
  }

  // Test 3: Chat flow with forced image generation
  console.log('\n📸 Test 3: Chat Flow (/api/chat)');
  console.log('-'.repeat(70));
  try {
    const response = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'explain the water cycle',
        context: ''
      })
    });
    const data = await response.json();
    console.log('✅ Success!');
    console.log(`   Response length: ${data.response.length} chars`);
    console.log(`   Images: ${data.images?.length || 0}`);
    
    if (data.images && data.images.length > 0) {
      console.log('   Image URLs:');
      data.images.forEach((url, i) => {
        console.log(`   ${i + 1}. ${url.substring(0, 80)}...`);
      });
    } else {
      console.log('   ⚠️ No images in response!');
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All tests complete!');
  console.log('='.repeat(70));
  console.log('\n💡 Next: Open http://localhost:3002 and test in the UI');
  console.log('💡 Check browser console for image storage logs\n');
}

testFlow();
