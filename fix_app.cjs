const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Replace dev_seller_1 and dev_buyer_1
content = content.replace(/const (\w+) = tgUser\?\.id \? String\(tgUser\.id\) : 'dev_(seller|buyer)_1';/g, 
  "const $1 = tgUser?.id ? String(tgUser.id) : null;\nif (!$1) return;");

content = content.replace(/String\(tgUser\?\.id \|\| 'dev_seller_1'\)/g, "String(tgUser?.id || '')");

// Add headers to GET requests
content = content.replace(/fetch\((`\$\{API_BASE\}[^`]+`)\)/g, "fetch($1, { headers: { ...getTgAuthHeaders() } })");

// Write back
fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('Done!');
