// Fix remaining 2 patches: buy-offer BOC and unlimited_stores paywall BOC
const fs = require('fs');
let text = fs.readFileSync('src/App.jsx', 'utf8');

// --- Fix 1: CRIT-02 - buy-offer pass BOC in fetch body ---
const target1 = "fetch(url, { method: 'POST', headers: { ...getTgAuthHeaders() } })\r\n                                      .catch(err => console.warn(t('failed_record_buy_offer'), err));";
const replace1 = "// CRIT-02: Передаём BOC транзакции на бэкенд для верификации.\r\n                                    const boc_buy_offer = txResult?.boc || '';\r\n                                    fetch(url, {\r\n                                      method: 'POST',\r\n                                      headers: { 'Content-Type': 'application/json', ...getTgAuthHeaders() },\r\n                                      body: JSON.stringify({ boc: boc_buy_offer })\r\n                                    })\r\n                                      .catch(err => console.warn(t('failed_record_buy_offer'), err));";

if (text.includes(target1)) {
  text = text.replace(target1, replace1);
  console.log('[OK] CRIT-02: buy-offer sends BOC to backend');
} else {
  console.warn('[WARN] buy-offer target not found');
}

// --- Fix 2: CRIT-01+02 - unlimited_stores paywall BOC ---
// This one had a slightly different indentation (6 spaces vs 8 spaces)
const target2 = "JSON.stringify({ user_id: userId, purchase_type: 'unlimited_stores' })\r\n                          });";
const replace2 = "JSON.stringify({ user_id: userId, purchase_type: 'unlimited_stores', boc: boc_store_slot || '' })\r\n                          });";

if (text.includes(target2)) {
  text = text.replace(target2, replace2);
  console.log('[OK] CRIT-01+02: Paywall unlimited_stores - added boc field');
} else {
  console.warn('[WARN] unlimited_stores target not found');
  // Find it
  const idx = text.indexOf("unlimited_stores");
  if (idx > 0) {
    console.log('Context:', JSON.stringify(text.slice(Math.max(0, idx-100), idx+200)));
  }
}

fs.writeFileSync('src/App.jsx', text, 'utf8');
console.log('Patch script 2 complete.');
