
export const MY_PASSES = [
  {
    id: 1, vendor: 'Cofix', nameKey: 'pass_cap', icon: 'coffee',
    current: 6, total: 10, unitKey: 'cups',
    colors: 'from-amber-800 to-amber-950', btnColor: 'text-amber-900', theme: 'amber'
  },
  {
    id: 2, vendor: 'El Chapo', nameKey: 'pass_taco', icon: '🌮',
    current: 2, total: 5, unitKey: 'pcs',
    colors: 'from-rose-500 to-red-600', btnColor: 'text-rose-600', theme: 'rose'
  },
  {
    id: 3, vendor: 'Boba Lab', nameKey: 'pass_boba', icon: '🧋',
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

export const STORES_DATA = [
  {
    id: 'cofix',
    name: 'Cofix',
    icon: '☕️',
    bg: 'bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300',
    accentColor: '#B45309',
    items: [
      {
        id: 201,
        icon: '☕️',
        nameKey: 'pass_cap',
        price: '10.00 ₮',
        priceVal: 10.00,
        total: 10,
        unitKey: 'cups',
        colors: 'from-amber-800 to-amber-950',
        btnColor: 'text-amber-900',
        theme: 'amber',
        desc: '4+1'
      },
      {
        id: 202,
        icon: '🥐',
        nameKey: 'item_croissant',
        price: '7.50 ₮',
        priceVal: 7.50,
        total: 6,
        unitKey: 'pcs',
        colors: 'from-amber-600 to-amber-800',
        btnColor: 'text-amber-700',
        theme: 'amber',
        desc: '5+1'
      }
    ]
  },
  {
    id: 'el_chapo',
    name: 'El Chapo',
    icon: '🌮',
    bg: 'bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300',
    accentColor: '#E11D48',
    items: [
      {
        id: 203,
        icon: '🌮',
        nameKey: 'pass_taco',
        price: '12.50 ₮',
        priceVal: 12.50,
        total: 6,
        unitKey: 'pcs',
        colors: 'from-rose-500 to-red-600',
        btnColor: 'text-rose-600',
        theme: 'rose',
        desc: '5+1'
      },
      {
        id: 204,
        icon: '🌯',
        nameKey: 'pass_shawarma',
        price: '12.50 ₮',
        priceVal: 12.50,
        total: 6,
        unitKey: 'pcs',
        colors: 'from-orange-500 to-red-600',
        btnColor: 'text-orange-600',
        theme: 'orange',
        desc: '5+1'
      }
    ]
  },
  {
    id: 'boba_lab',
    name: 'Boba Lab',
    icon: '🧋',
    bg: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300',
    accentColor: '#4F46E5',
    items: [
      {
        id: 205,
        icon: '🧋',
        nameKey: 'pass_boba',
        price: '15.00 ₮',
        priceVal: 15.00,
        total: 4,
        unitKey: 'pcs',
        colors: 'from-indigo-500 to-purple-600',
        btnColor: 'text-indigo-600',
        theme: 'indigo',
        desc: '3+1'
      },
      {
        id: 206,
        icon: '🍦',
        nameKey: 'item_icecream',
        price: '4.20 ₮',
        priceVal: 4.20,
        total: 4,
        unitKey: 'pcs',
        colors: 'from-pink-500 to-rose-600',
        btnColor: 'text-pink-600',
        theme: 'pink',
        desc: '3+1'
      }
    ]
  }
];