import React from 'react';
import { Coffee } from 'lucide-react';

export const MY_PASSES = [
  {
    id: 1, vendor: 'Cofix', nameKey: 'pass_cap', icon: <Coffee size={20} />,
    current: 6, total: 10, unitKey: 'cups',
    colors: 'from-amber-800 to-amber-950', btnColor: 'text-amber-900', theme: 'amber'
  },
  {
    id: 2, vendor: 'El Chapo', nameKey: 'pass_taco', icon: <span className="text-xl">🌮</span>,
    current: 2, total: 5, unitKey: 'pcs',
    colors: 'from-rose-500 to-red-600', btnColor: 'text-rose-600', theme: 'rose'
  },
  {
    id: 3, vendor: 'Boba Lab', nameKey: 'pass_boba', icon: <span className="text-xl">🧋</span>,
    current: 1, total: 3, unitKey: 'pcs',
    colors: 'from-indigo-500 to-purple-600', btnColor: 'text-indigo-600', theme: 'indigo'
  }
];

export const MARKETPLACE_ITEMS = [
  { id: 1, icon: '🌯', nameKey: 'pass_shawarma', desc: '5 (-10%)', price: '12.50 ₮', bg: 'bg-orange-50 dark:bg-orange-500/10', orders: 150 },
  { id: 2, icon: '🍦', nameKey: 'item_icecream', desc: '3 (-5%)', price: '4.20 ₮', bg: 'bg-pink-50 dark:bg-pink-500/10', orders: 85 },
  { id: 3, icon: '🌭', nameKey: 'item_hotdog', desc: '10 (-15%)', price: '18.00 ₮', bg: 'bg-yellow-50 dark:bg-yellow-500/10', orders: 42 },
  { id: 4, icon: '🥐', nameKey: 'item_croissant', desc: '5 (-8%)', price: '7.50 ₮', bg: 'bg-amber-50 dark:bg-amber-500/10', hit: true, orders: 320 }
];

export const HISTORY_TRANSACTIONS = [
  {
    id: 1, type: 'purchase', titleKey: 'pass_shawarma', vendor: 'El Chapo',
    amount: '-12.50 ₮', items: '+5', unitKey: 'pcs', date: '19.05.2026, 14:30'
  },
  {
    id: 2, type: 'redeem', titleKey: 'pass_cap', vendor: 'Cofix',
    amount: null, items: '-1', unitKey: 'cups', date: '18.05.2026, 09:15'
  },
  {
    id: 3, type: 'redeem', titleKey: 'pass_taco', vendor: 'El Chapo',
    amount: null, items: '-2', unitKey: 'pcs', date: '15.05.2026, 19:40'
  },
  {
    id: 4, type: 'purchase', titleKey: 'pass_cap', vendor: 'Cofix',
    amount: '-15.00 ₮', items: '+10', unitKey: 'cups', date: '10.05.2026, 08:30'
  }
];

export const SELLER_OFFERS = [
  {
    id: 101, icon: '☕️', name: 'Капучино 4+1',
    price: '10.00 ₮', total: 5, sold: 14, revenue: '140.00 ₮',
    bg: 'bg-amber-50 dark:bg-amber-500/10'
  },
  {
    id: 102, icon: '🥐', name: 'Круассаны 7+3',
    price: '15.00 ₮', total: 10, sold: 3, revenue: '45.00 ₮',
    bg: 'bg-orange-50 dark:bg-orange-500/10'
  }
];