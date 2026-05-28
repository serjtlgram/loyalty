/**
 * usdtPayment.js — Модуль для реальных USDT платежей через TON блокчейн (Mainnet).
 *
 * Содержит:
 * 1. Константы (USDT мастер-контракт, кошелёк разработчика, газ)
 * 2. getJettonWalletAddress() — запрос адреса Jetton-кошелька покупателя через tonapi.io
 * 3. buildJettonTransferPayload() — сборка TEP-74 payload для перевода жетонов
 */

import { beginCell, Address, toNano } from '@ton/core';

// ============================================================================
// КОНСТАНТЫ (Mainnet)
// ============================================================================

/** USDT Jetton мастер-контракт в сети TON Mainnet */
export const USDT_MASTER = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

/** Кошелёк создателя приложения — получает 1% комиссию от каждой покупки */
export const DEVELOPER_WALLET = 'UQDqhaywpMKK-pj3oNmbNuKsp0GZ12iGWl6P11SQiA9fmgfM';

/** Количество десятичных знаков USDT в TON (decimals = 6) */
export const USDT_DECIMALS = 6;

/** Сумма TON (в nanoTON строкой), прикладываемая к КАЖДОМУ сообщению для оплаты газа */
export const GAS_AMOUNT = '50000000'; // 0.05 TON

// ============================================================================
// ПОЛУЧЕНИЕ АДРЕСА JETTON-КОШЕЛЬКА ПОКУПАТЕЛЯ
// ============================================================================

/**
 * Получает адрес персонального USDT Jetton кошелька пользователя,
 * вызывая GET-метод `get_wallet_address` на мастер-контракте USDT через tonapi.io.
 *
 * @param {string} ownerAddress — адрес TON-кошелька пользователя (raw или user-friendly)
 * @returns {Promise<string>} — адрес Jetton-кошелька в user-friendly формате
 * @throws {Error} — если запрос не удался или адрес не найден
 */
export async function getJettonWalletAddress(ownerAddress) {
  // tonapi.io ожидает адрес в любом формате
  const url = `https://tonapi.io/v2/blockchain/accounts/${USDT_MASTER}/methods/get_wallet_address?args=${encodeURIComponent(ownerAddress)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`tonapi.io get_wallet_address failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  // Ответ содержит decoded.stack — массив значений, возвращённых GET-методом.
  // get_wallet_address возвращает 1 значение: cell со slice, содержащий адрес.
  // tonapi декодирует его в объект с type:"cell" -> объект с адресом внутри.
  const stack = data?.decoded?.stack || data?.stack;
  
  if (!stack || stack.length === 0) {
    throw new Error('Empty stack returned from get_wallet_address');
  }

  // tonapi v2 возвращает первый элемент стека как объект с type и value
  const firstItem = stack[0];
  
  // Вариант 1: tonapi возвращает напрямую адрес в decoded
  if (typeof firstItem === 'string') {
    return firstItem;
  }

  // Вариант 2: tonapi возвращает cell/slice объект
  if (firstItem?.type === 'cell' || firstItem?.type === 'slice') {
    // В decoded контексте tonapi может вернуть адрес в cell.value
    // или в специальном поле address
    const cellValue = firstItem?.value;
    if (typeof cellValue === 'string' && cellValue.length > 0) {
      return cellValue;
    }
  }
  
  // Вариант 3: tonapi v2 может вернуть адрес через decoded
  if (data?.decoded?.jetton_wallet_address) {
    return data.decoded.jetton_wallet_address;
  }

  throw new Error('Could not extract Jetton wallet address from tonapi response');
}


// ============================================================================
// СБОРКА TEP-74 PAYLOAD ДЛЯ ПЕРЕВОДА JETTON
// ============================================================================

/**
 * Собирает бинарный payload для перевода Jetton токенов по стандарту TEP-74.
 *
 * Структура сообщения (transfer):
 *   op:                   0xf8a7ea5 (uint32) — op-код "transfer"
 *   query_id:             0         (uint64) — произвольный ID запроса
 *   amount:               BigInt    (Coins)  — количество жетонов для перевода
 *   destination:          Address   — адрес получателя (продавец / разработчик)
 *   response_destination: Address   — адрес для возврата излишков газа (покупатель)
 *   custom_payload:       null      (1 бит = 0)
 *   forward_ton_amount:   1n        (Coins)  — минимальное уведомление о получении
 *   forward_payload:      empty     (1 бит = 0)
 *
 * @param {bigint} amount — сумма перевода в микро-USDT (BigInt, уже с учётом decimals)
 * @param {string} recipientAddress — TON-адрес получателя (user-friendly формат)
 * @param {string} responseAddress — TON-адрес покупателя для возврата газа (user-friendly формат)
 * @returns {string} — Base64-кодированная Cell (payload) для TonConnect
 */
export function buildJettonTransferPayload(amount, recipientAddress, responseAddress) {
  const body = beginCell()
    .storeUint(0xf8a7ea5, 32)                           // op: transfer
    .storeUint(0, 64)                                     // query_id
    .storeCoins(amount)                                   // amount (BigInt)
    .storeAddress(Address.parse(recipientAddress))         // destination
    .storeAddress(Address.parse(responseAddress))          // response_destination
    .storeBit(0)                                          // custom_payload = null
    .storeCoins(1n)                                       // forward_ton_amount (1 nanoTON)
    .storeBit(0)                                          // forward_payload = empty
    .endCell();

  return body.toBoc().toString('base64');
}
