const sharp = require('sharp');
const fs = require('fs');

async function main() {
  await sharp('public/logo.png')
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile('public/icon-512.png');
  console.log('512 done');

  await sharp('public/logo.png')
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile('public/icon-192.png');
  console.log('192 done');

  await sharp('public/logo.png')
    .resize(64, 64, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFormat('png')
    .toFile('src/app/favicon.ico');
  console.log('favicon done');
}

main().catch(console.error);
