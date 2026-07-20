const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, 'uploads');

async function compressExistingImages() {
  console.log('Starting massive image compression... This may take a few minutes!');
  
  if (!fs.existsSync(uploadDir)) {
      console.error('Uploads directory not found!');
      return;
  }

  const files = fs.readdirSync(uploadDir);
  
  let compressedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalBytesSaved = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const filePath = path.join(uploadDir, file);
    
    // Only compress raw image files
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      try {
        const originalSize = fs.statSync(filePath).size;
        const tempPath = path.join(uploadDir, 'temp-' + file);
        
        let pipeline = sharp(filePath).resize({ width: 1920, withoutEnlargement: true });
        
        // Compress keeping the exact same format!
        if (ext === '.jpg' || ext === '.jpeg') {
            pipeline = pipeline.jpeg({ quality: 75 });
        } else if (ext === '.png') {
            pipeline = pipeline.png({ quality: 75, compressionLevel: 8 });
        }
        
        // Write to temp file first to be 100% safe
        await pipeline.toFile(tempPath);
        
        const newSize = fs.statSync(tempPath).size;
        
        // Overwrite the original file with the compressed version
        fs.renameSync(tempPath, filePath);
        
        totalBytesSaved += (originalSize - newSize);
        compressedCount++;
        
        if (compressedCount % 100 === 0) {
            console.log(`Compressed ${compressedCount} images so far...`);
        }
      } catch (err) {
        console.error(`Error compressing ${file}:`, err.message);
        errorCount++;
      }
    } else {
      skippedCount++;
    }
  }

  const mbSaved = (totalBytesSaved / (1024 * 1024)).toFixed(2);
  console.log('\n--- 🎉 COMPRESSION COMPLETE 🎉 ---');
  console.log(`Successfully shrunk: ${compressedCount} images`);
  console.log(`Skipped (not jpg/png): ${skippedCount} files`);
  console.log(`Errors: ${errorCount} files`);
  console.log(`\nTotal Space Saved: ${mbSaved} MB!`);
}

compressExistingImages();
