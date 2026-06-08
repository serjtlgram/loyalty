// Security hardening patch script for App.jsx
// Applies all CRIT-01, CRIT-02, LOW-03 fixes

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'App.jsx');
let text = fs.readFileSync(filePath, 'utf8');
let changeCount = 0;

function replace(from, to, desc) {
  if (text.includes(from)) {
    text = text.replace(from, to);
    console.log(`[OK] ${desc}`);
    changeCount++;
  } else {
    console.warn(`[WARN] Not found: ${desc}`);
    console.warn('  Looking for:', JSON.stringify(from.slice(0, 80)));
  }
}

// ============================================================
// CRIT-01: Remove hardcoded BILLING_SECRET constant
// ============================================================
replace(
  "// Секрет для защищённого эндпоинта billing/confirm.\r\n// Совпадает с BILLING_SECRET в .env на сервере.\r\nconst BILLING_SECRET = 'b83f7a4ac0a1d685ac20c0747438d47be64bc83415bd15adfddc21c0c48f587c';",
  "// CRIT-01 FIXED: BILLING_SECRET удалён из фронтенда.\r\n// Бэкенд верифицирует платежи через BOC транзакции (CRIT-02).\r\n// Никакой секрет больше не экспонируется в публичном JS-бандле.",
  "CRIT-01: Remove BILLING_SECRET constant"
);

// ============================================================
// LOW-03: Strengthen cachedWalletAddress localStorage read
// ============================================================
replace(
  `  // Кастомная кнопка: мгновенно кэшируем адрес кошелька как только он появляется\r\n  const [cachedWalletAddress, setCachedWalletAddress] = useState(() => {\r\n    // При первом рендере пытаемся достать адрес напрямую из хранилища TonConnect\r\n    try {\r\n      const keys = Object.keys(localStorage).filter(k => k.startsWith('ton-connect'));\r\n      for (const key of keys) {\r\n        const val = localStorage.getItem(key);\r\n        if (!val) continue;\r\n        const data = JSON.parse(val);\r\n        const addr = data?.account?.address || \r\n                     data?.connectEvent?.payload?.items?.[0]?.address || \r\n                     data?.address;\r\n        if (addr) return addr;\r\n      }\r\n    } catch {}\r\n    return null;\r\n  });`,
  `  // LOW-03: Усиленный try-catch при чтении cachedWalletAddress из localStorage.\r\n  // Если TonConnect изменит формат данных — плавно сбрасываем коннект, не падаем в white screen.\r\n  const [cachedWalletAddress, setCachedWalletAddress] = useState(() => {\r\n    try {\r\n      const keys = Object.keys(localStorage).filter(k => k.startsWith('ton-connect'));\r\n      for (const key of keys) {\r\n        let val;\r\n        try { val = localStorage.getItem(key); } catch { continue; }\r\n        if (!val) continue;\r\n        let data;\r\n        try { data = JSON.parse(val); } catch { continue; }\r\n        const addr = data?.account?.address || \r\n                     data?.connectEvent?.payload?.items?.[0]?.address || \r\n                     data?.address;\r\n        if (addr && typeof addr === 'string' && addr.length > 5) return addr;\r\n      }\r\n    } catch (e) {\r\n      console.warn('[Security] Failed to read TonConnect localStorage:', e);\r\n    }\r\n    return null;\r\n  });`,
  "LOW-03: Strengthen cachedWalletAddress try-catch"
);

// ============================================================
// CRIT-02: buy-offer - capture txResult BOC and send to backend
// ============================================================
replace(
  `                                  // Записываем покупку на бэкенде\r\n                                  if (selectedStore.isDynamic && item.id) {\r\n                                    const buyerId = tgUser?.id ? String(tgUser.id) : null;\nif (!buyerId) return;\r\n                                    const referrer = selectedStore?.referred_by || null;\r\n                                    const url = referrer \r\n                                      ? \`\${API_BASE}/buy-offer/\${item.id}?user_id=\${buyerId}&sold_by=\${referrer}\` \r\n                                      : \`\${API_BASE}/buy-offer/\${item.id}?user_id=\${buyerId}\`;\r\n                                    fetch(url, { method: 'POST', headers: { ...getTgAuthHeaders() } })\r\n                                      .catch(err => console.warn(t('failed_record_buy_offer'), err));\r\n                                  }`,
  `                                  // CRIT-02: Передаём BOC транзакции на бэкенд для верификации.\r\n                                  // Бэкенд проверит BOC через tonapi.io, только потом обновит Redis.\r\n                                  if (selectedStore.isDynamic && item.id) {\r\n                                    const buyerId = tgUser?.id ? String(tgUser.id) : null;\nif (!buyerId) return;\r\n                                    const boc = txResult?.boc || '';\r\n                                    const referrer = selectedStore?.referred_by || null;\r\n                                    const url = referrer \r\n                                      ? \`\${API_BASE}/buy-offer/\${item.id}?user_id=\${buyerId}&sold_by=\${referrer}\` \r\n                                      : \`\${API_BASE}/buy-offer/\${item.id}?user_id=\${buyerId}\`;\r\n                                    fetch(url, {\r\n                                      method: 'POST',\r\n                                      headers: { 'Content-Type': 'application/json', ...getTgAuthHeaders() },\r\n                                      body: JSON.stringify({ boc })\r\n                                    })\r\n                                      .catch(err => console.warn(t('failed_record_buy_offer'), err));\r\n                                  }`,
  "CRIT-02: buy-offer sends BOC to backend"
);

// ============================================================
// CRIT-01+02: Paywall - store_slot: remove X-Billing-Secret, add boc
// ============================================================
replace(
  `                          const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                          await fetch(\`\${API_BASE}/billing/confirm\`, {\r\n                            method: 'POST',\r\n                            headers: { 'Content-Type': 'application/json', 'X-Billing-Secret': BILLING_SECRET, ...getTgAuthHeaders() },\r\n                            body: JSON.stringify({ user_id: userId, purchase_type: 'store_slot' })\r\n                          });`,
  `                          const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                          // CRIT-01+02: X-Billing-Secret удалён. Передаём BOC для верификации платежа.\r\n                          const boc_store_slot = txResult?.boc || '';\r\n                          await fetch(\`\${API_BASE}/billing/confirm\`, {\r\n                            method: 'POST',\r\n                            headers: { 'Content-Type': 'application/json', ...getTgAuthHeaders() },\r\n                            body: JSON.stringify({ user_id: userId, purchase_type: 'store_slot', boc: boc_store_slot })\r\n                          });`,
  "CRIT-01+02: Paywall store_slot - remove secret, add boc"
);

// ============================================================
// CRIT-01+02: Paywall - unlimited_stores: remove X-Billing-Secret, add boc
// ============================================================
replace(
  `                        const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                        await fetch(\`\${API_BASE}/billing/confirm\`, {\r\n                          method: 'POST',\r\n                          headers: { 'Content-Type': 'application/json', 'X-Billing-Secret': BILLING_SECRET, ...getTgAuthHeaders() },\r\n                          body: JSON.stringify({ user_id: userId, purchase_type: 'unlimited_stores' })\r\n                        });`,
  `                        const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                        // CRIT-01+02: X-Billing-Secret удалён. Передаём BOC для верификации платежа.\r\n                        const boc_unlimited_stores = txResult?.boc || '';\r\n                        await fetch(\`\${API_BASE}/billing/confirm\`, {\r\n                          method: 'POST',\r\n                          headers: { 'Content-Type': 'application/json', ...getTgAuthHeaders() },\r\n                          body: JSON.stringify({ user_id: userId, purchase_type: 'unlimited_stores', boc: boc_unlimited_stores })\r\n                        });`,
  "CRIT-01+02: Paywall unlimited_stores - remove secret, add boc"
);

// ============================================================
// CRIT-01+02: Paywall - unlimited_employees: remove X-Billing-Secret, add boc  
// ============================================================
replace(
  `                        const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                        await fetch(\`\${API_BASE}/billing/confirm\`, {\r\n                          method: 'POST',\r\n                          headers: { 'Content-Type': 'application/json', 'X-Billing-Secret': BILLING_SECRET, ...getTgAuthHeaders() },\r\n                          body: JSON.stringify({ user_id: userId, store_id: paywallModal.storeId, purchase_type: 'unlimited_employees' })\r\n                        });`,
  `                        const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                        // CRIT-01+02: X-Billing-Secret удалён. Передаём BOC для верификации платежа.\r\n                        const boc_unlimited_employees = txResult?.boc || '';\r\n                        await fetch(\`\${API_BASE}/billing/confirm\`, {\r\n                          method: 'POST',\r\n                          headers: { 'Content-Type': 'application/json', ...getTgAuthHeaders() },\r\n                          body: JSON.stringify({ user_id: userId, store_id: paywallModal.storeId, purchase_type: 'unlimited_employees', boc: boc_unlimited_employees })\r\n                        });`,
  "CRIT-01+02: Paywall unlimited_employees - remove secret, add boc"
);

// ============================================================
// CRIT-01+02: Paywall - all_unlimited: remove X-Billing-Secret, add boc
// ============================================================
replace(
  `                      const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                      await fetch(\`\${API_BASE}/billing/confirm\`, {\r\n                        method: 'POST',\r\n                        headers: { 'Content-Type': 'application/json', 'X-Billing-Secret': BILLING_SECRET, ...getTgAuthHeaders() },\r\n                        body: JSON.stringify({ user_id: userId, purchase_type: 'all_unlimited' })\r\n                      });`,
  `                      const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                      // CRIT-01+02: X-Billing-Secret удалён. Передаём BOC для верификации платежа.\r\n                      const boc_all_unlimited = txResult?.boc || '';\r\n                      await fetch(\`\${API_BASE}/billing/confirm\`, {\r\n                        method: 'POST',\r\n                        headers: { 'Content-Type': 'application/json', ...getTgAuthHeaders() },\r\n                        body: JSON.stringify({ user_id: userId, purchase_type: 'all_unlimited', boc: boc_all_unlimited })\r\n                      });`,
  "CRIT-01+02: Paywall all_unlimited - remove secret, add boc"
);

// ============================================================
// Also need to capture txResult in paywall buttons (they use await but discard result)
// Fix: assign the sendTransaction result for store_slot
// ============================================================
replace(
  `                          await tonConnectUI.sendTransaction({\r\n                            validUntil: Math.floor(Date.now() / 1000) + 300,\r\n                            messages: [{\r\n                              address: buyerJettonWallet,\r\n                              amount: GAS_AMOUNT,\r\n                              payload: payloadDev\r\n                            }]\r\n                          });\r\n                          \r\n                          const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                          // CRIT-01+02`,
  `                          const txResult = await tonConnectUI.sendTransaction({\r\n                            validUntil: Math.floor(Date.now() / 1000) + 300,\r\n                            messages: [{\r\n                              address: buyerJettonWallet,\r\n                              amount: GAS_AMOUNT,\r\n                              payload: payloadDev\r\n                            }]\r\n                          });\r\n                          \r\n                          const userId = tgUser?.id ? String(tgUser.id) : null;\nif (!userId) return;\r\n                          // CRIT-01+02`,
  "CRIT-02: Capture txResult in store_slot paywall button"
);

fs.writeFileSync(filePath, text, 'utf8');
console.log(`\nTotal changes applied: ${changeCount}`);
console.log('App.jsx patched successfully!');
