import { generateAndStoreImage, listStoredImages, deleteImage } from '../src/imageService';

async function test() {
  try {
    console.log('Starting image service tests...');

    // Test 1: Generate new image
    console.log('\n1. Testing image generation...');
    const prompt =
      'Create a detailed image of a futuristic cryptocurrency token with glowing blue energy and floating geometric shapes';
    const generatedImage = await generateAndStoreImage(prompt, 'TEST');
    console.log('✓ Image generated successfully!');
    console.log('Generated image URL:', generatedImage);

    // Test 2: List all stored images
    console.log('\n2. Testing image listing (all images)...');
    const allImages = await listStoredImages();
    console.log('✓ Successfully retrieved all images!');
    console.log(`Total images found: ${allImages.length}`);
    console.log('First few images:', allImages.slice(0, 3));

    // Test 3: List images with specific prefix
    console.log('\n3. Testing image listing with prefix...');
    const testImages = await listStoredImages('TEST');
    console.log('✓ Successfully retrieved TEST images!');
    console.log(`Total TEST images found: ${testImages.length}`);
    console.log('TEST images:', testImages);

    // Test 4: Delete an image (if any test images exist)
    if (testImages.length > 0) {
      console.log('\n4. Testing image deletion...');
      const imageToDelete = testImages[0];
      const deleteResult = await deleteImage(imageToDelete.key);
      if (deleteResult) {
        console.log(`✓ Successfully deleted image: ${imageToDelete.key}`);
      } else {
        console.log(`❌ Failed to delete image: ${imageToDelete.key}`);
      }

      // Verify deletion
      const imagesAfterDelete = await listStoredImages('TEST');
      console.log(`Images remaining after deletion: ${imagesAfterDelete.length}`);
    }

    console.log('\nAll tests completed successfully! ✨');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the tests
console.log('🚀 Starting tests...');
test()
  .then(() => {
    console.log('Tests finished!');
  })
  .catch((error) => {
    console.error('Error during test execution:', error);
    process.exit(1);
  });
