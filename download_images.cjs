const https = require('https');
const fs = require('fs');
const sharp = require('./server/node_modules/sharp');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest);
      reject(err);
    });
  });
};

async function main() {
  await download('https://puneauthorsassociation.com/uploads/1787383615967-172421379.webp', 'dino.webp');
  await download('https://puneauthorsassociation.com/uploads/1787376767756-350424526.webp', 'ink.webp');
  
  const dinoMeta = await sharp('dino.webp').metadata();
  console.log('Dino metadata:', dinoMeta);
  
  const inkMeta = await sharp('ink.webp').metadata();
  console.log('Ink metadata:', inkMeta);
}

main().catch(console.error);
