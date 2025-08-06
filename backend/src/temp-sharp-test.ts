
const sharp = require('sharp');
import * as fs from 'fs';

async function testSharpLocalFile() {
  const imagePath = './src/assets/default-banner.jpg';
  console.log(`Attempting to process local image: ${imagePath}`);

  try {
    // Read the image file into a buffer
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`Read image buffer of size: ${imageBuffer.length} bytes`);

    // Attempt to process with sharp
    const optimized = await sharp(imageBuffer)
      .resize(100, 100) // Small resize to quickly test processing
      .jpeg({ quality: 80 })
      .toBuffer();

    console.log(`Sharp processing successful! Optimized size: ${optimized.length} bytes`);
    console.log('Test Succeeded: Sharp can process the local image.');
  } catch (error) {
    console.error('Test Failed: Sharp could not process the local image.');
    console.error('Error details:', error);
  }
}

testSharpLocalFile();
