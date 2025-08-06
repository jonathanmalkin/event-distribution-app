
import { WordPressService } from './services/platforms/WordPressService';

async function testImageUpload() {
  console.log('Starting image upload test...');
  const wordpressService = new WordPressService();
  const imagePath = 'src/assets/default-banner.jpg';
  const title = 'Temporary Test Image';

  try {
    const mediaId = await wordpressService.uploadImage(imagePath, title);
    console.log('Test Succeeded! WordPress Media ID:', mediaId);
  } catch (error) {
    console.error('Test Failed! Error:', error);
  }
}

testImageUpload();
