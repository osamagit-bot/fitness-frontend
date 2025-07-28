// Simple script to download Poppins fonts for offline use
// Run with: node download-fonts.js

const https = require('https');
const fs = require('fs');
const path = require('path');

const fonts = [
  {
    url: 'https://fonts.gstatic.com/s/poppins/v20/pxiEyp8kv8JHgFVrJJfecnFHGPc.woff2',
    filename: 'Poppins-Regular.woff2'
  },
  {
    url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLGT9Z1xlFd2JQEk.woff2',
    filename: 'Poppins-Medium.woff2'
  },
  {
    url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLEj6Z1xlFd2JQEk.woff2',
    filename: 'Poppins-SemiBold.woff2'
  },
  {
    url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLCz7Z1xlFd2JQEk.woff2',
    filename: 'Poppins-Bold.woff2'
  },
  {
    url: 'https://fonts.gstatic.com/s/poppins/v20/pxiByp8kv8JHgFVrLDz8Z1xlFd2JQEk.woff2',
    filename: 'Poppins-Light.woff2'
  }
];

const fontsDir = path.join(__dirname, 'public', 'fonts');

// Create fonts directory if it doesn't exist
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

console.log('Downloading Poppins fonts for offline use...');

fonts.forEach(font => {
  const filePath = path.join(fontsDir, font.filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`✓ ${font.filename} already exists`);
    return;
  }
  
  const file = fs.createWriteStream(filePath);
  
  https.get(font.url, (response) => {
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log(`✓ Downloaded ${font.filename}`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {}); // Delete the file on error
    console.error(`✗ Error downloading ${font.filename}:`, err.message);
  });
});

console.log('Font download initiated. Check the public/fonts/ directory.');