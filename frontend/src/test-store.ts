/**
 * Test script to verify store is working correctly
 * Run in browser console after app loads
 */

// Test adding images to store
export function testStoreImages() {
  // @ts-ignore - accessing from window for debugging
  const store = window.__ZUSTAND_STORE__?.getState?.();
  
  if (!store) {
    console.error('❌ Store not found on window');
    return;
  }

  console.log('🧪 Testing image store...');
  
  // Clear existing images
  console.log('1. Clearing images...');
  store.clearGeneratedImages();
  console.log('   Current images:', store.generatedImages);
  
  // Add test images
  console.log('2. Adding test images...');
  const testImages = [
    'https://via.placeholder.com/400x300/FF6B6B/ffffff?text=Test+Image+1',
    'https://via.placeholder.com/400x300/4ECDC4/ffffff?text=Test+Image+2',
    'https://via.placeholder.com/400x300/45B7D1/ffffff?text=Test+Image+3',
  ];
  
  testImages.forEach((img, index) => {
    console.log(`   Adding image ${index + 1}:`, img);
    store.addGeneratedImage(img);
  });
  
  // Check final state
  console.log('3. Final state:');
  console.log('   Images count:', store.generatedImages.length);
  console.log('   Images:', store.generatedImages);
  
  if (store.generatedImages.length === 3) {
    console.log('✅ Store is working correctly!');
    console.log('   Images should now be visible in the left panel');
  } else {
    console.error('❌ Store not updating correctly');
  }
}

// Make it available globally
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.testStoreImages = testStoreImages;
  console.log('💡 Run testStoreImages() in console to test image storage');
}
