const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Searching references in App.jsx...');
lines.forEach((line, index) => {
  if (line.includes('seller_wallet') || line.includes('sellerWallet') || line.includes('walletAddress')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
