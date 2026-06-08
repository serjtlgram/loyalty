// Fix last remaining X-Billing-Secret and BILLING_SECRET on line 5100
const fs = require('fs');
let text = fs.readFileSync('src/App.jsx', 'utf8');

const target = "                            headers: { 'Content-Type': 'application/json', 'X-Billing-Secret': BILLING_SECRET, ...getTgAuthHeaders() },\r\n                            body: JSON.stringify({ user_id: userId, purchase_type: 'unlimited_stores', boc: boc_store_slot || '' })";
const replace = "                            headers: { 'Content-Type': 'application/json', ...getTgAuthHeaders() },\r\n                            body: JSON.stringify({ user_id: userId, purchase_type: 'unlimited_stores', boc: boc_store_slot || '' })";

if (text.includes(target)) {
  text = text.replace(target, replace);
  console.log('[OK] CRIT-01: Removed last X-Billing-Secret from unlimited_stores');
} else {
  console.warn('[WARN] Not found');
  // Debug: find the line
  const lines = text.split('\n');
  lines.forEach((l, i) => {
    if (l.includes('X-Billing-Secret')) {
      console.log('Line', i+1, ':', l.trim());
    }
  });
}

fs.writeFileSync('src/App.jsx', text, 'utf8');
console.log('Done.');
