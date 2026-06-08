const fs = require('fs');

let content = fs.readFileSync('src/App.jsx', 'utf8');

// Replace fetch(url, { method: 'POST' }) with fetch(url, { method: 'POST', headers: { ...getTgAuthHeaders() } })
content = content.replace(/fetch\(url, \{ method: 'POST' \}\)/g, "fetch(url, { method: 'POST', headers: { ...getTgAuthHeaders() } })");

// Replace fetch(`${API_BASE}/billing/confirm` to add getTgAuthHeaders()
// It currently looks like: headers: { 'Content-Type': 'application/json', 'X-Billing-Secret': BILLING_SECRET }
content = content.replace(/headers: \{ 'Content-Type': 'application\/json', 'X-Billing-Secret': BILLING_SECRET \}/g, "headers: { 'Content-Type': 'application/json', 'X-Billing-Secret': BILLING_SECRET, ...getTgAuthHeaders() }");

fs.writeFileSync('src/App.jsx', content, 'utf8');
console.log('App.jsx fixed!');
