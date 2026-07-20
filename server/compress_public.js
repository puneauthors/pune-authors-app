const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '../public');
const imgExtensions = ['.png', '.jpg', '.jpeg'];

async function compressPublicImages() {
  const files = fs.readdirSync(publicDir);
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (imgExtensions.includes(ext)) {
      const oldPath = path.join(publicDir, file);
      const newFileName = file.replace(new RegExp(`\\${ext}$`, 'i'), '.webp');
      const newPath = path.join(publicDir, newFileName);
      
      console.log(`Processing ${file}...`);
      
      try {
        await sharp(oldPath)
          .webp({ quality: 80 })
          .toFile(newPath);
          
        console.log(`✅ Converted ${file} -> ${newFileName}`);
        fs.unlinkSync(oldPath);
        console.log(`🗑️ Deleted original ${file}`);
      } catch (err) {
        console.error(`❌ Error processing ${file}:`, err);
      }
    }
  }
}

compressPublicImages().then(() => console.log('Done!'));
