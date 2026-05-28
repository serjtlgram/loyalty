const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'App.jsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

console.log('Searching store creation/updates in App.jsx...');
lines.forEach((line, index) => {
  if (line.includes('createStore') || line.includes('saveStore') || line.includes('.set(') || line.includes('.update(') || line.includes('addDoc(') || line.includes('setDoc(')) {
    if (line.includes('store') || line.includes('Store') || line.includes('wallet')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
