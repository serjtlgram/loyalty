import {
  useState, useEffect, useRef } from 'react';
import { 
  Moon, Sun, QrCode, Layers, 
  Store, ScanLine, History, Settings,
  Plus, Minus, Share2, PlusCircle, Coffee, Trash2, Pencil, X, Check, RefreshCw, CheckCircle2, AlertCircle, Info,
  ChevronLeft, ChevronRight, Eye, EyeOff, UserPlus, Copy, MessageSquare
} from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet, toUserFriendlyAddress, useIsConnectionRestored } from '@tonconnect/ui-react';
import { Wallet } from 'lucide-react';


// Импортируем наши разделенные файлы
import './index.css';
import { LANGUAGES, TRANSLATIONS } from '../content/locales/translations';
import { MY_PASSES, MARKETPLACE_ITEMS, HISTORY_TRANSACTIONS, STORES_DATA } from '../content/data/mockData';
import { getJettonWalletAddress, buildJettonTransferPayload, DEVELOPER_WALLET, GAS_AMOUNT } from './usdtPayment';



// Базовый URL бэкенда
const API_BASE = 'https://pdrua.duckdns.org/fintech/api';

// Telegram Bot username for sharing links
const BOT_USERNAME = 'diploybot';

// Build the correct Telegram Mini App URL
// - No startapp param: opens the app at root
// - With Store_ID: opens the app deep-linked to that store
const buildAppUrl = (storeId, referrerId = null) => {
  if (storeId) {
    if (referrerId) {
      return `https://t.me/${BOT_USERNAME}?startapp=Store_${storeId}_${referrerId}`;
    }
    return `https://t.me/${BOT_USERNAME}?startapp=Store_${storeId}`;
  }
  return `https://t.me/${BOT_USERNAME}?startapp`;
};

// Native Telegram share helper – uses t.me/share/url so Telegram
// opens a contact/channel picker natively inside the app
const shareTelegram = (text, url) => {
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
  const tg = window.Telegram?.WebApp;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
};

// Clickable link parser utility for usernames & web links
const linkify = (text) => {
  if (!text) return '';
  // Regex to match URLs (starting with http/https/t.me) and Telegram handles (starting with @)
  const regex = /(https?:\/\/[^\s]+|t\.me\/[^\s]+|@[a-zA-Z0-9_]+)/g;
  const parts = text.split(regex);
  return parts.map((part, idx) => {
    if (part.match(/^https?:\/\//)) {
      return (
        <a 
          key={idx} 
          href={part} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#26A17B] hover:text-[#208a69] underline font-bold break-all cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    } else if (part.startsWith('t.me/')) {
      return (
        <a 
          key={idx} 
          href={`https://${part}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#26A17B] hover:text-[#208a69] underline font-bold break-all cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    } else if (part.startsWith('@')) {
      const username = part.substring(1);
      return (
        <a 
          key={idx} 
          href={`https://t.me/${username}`} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-[#26A17B] hover:text-[#208a69] underline font-bold cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });
};

// Rich palette of card color themes for variety
const PASS_COLOR_PALETTE = [
  { colors: 'from-[#26A17B] to-[#1e7c5e]',   btnColor: 'text-[#26A17B]',   theme: 'teal'    },
  { colors: 'from-indigo-500 to-purple-700',  btnColor: 'text-indigo-600',  theme: 'indigo'  },
  { colors: 'from-rose-500 to-pink-700',      btnColor: 'text-rose-600',    theme: 'rose'    },
  { colors: 'from-amber-600 to-orange-700',   btnColor: 'text-amber-700',   theme: 'amber'   },
  { colors: 'from-sky-500 to-blue-700',       btnColor: 'text-sky-600',     theme: 'sky'     },
  { colors: 'from-violet-500 to-purple-800',  btnColor: 'text-violet-600',  theme: 'violet'  },
  { colors: 'from-emerald-500 to-teal-700',   btnColor: 'text-emerald-600', theme: 'emerald' },
  { colors: 'from-red-500 to-rose-800',       btnColor: 'text-red-600',     theme: 'red'     },
  { colors: 'from-fuchsia-500 to-pink-800',   btnColor: 'text-fuchsia-600', theme: 'fuchsia' },
  { colors: 'from-cyan-500 to-teal-700',      btnColor: 'text-cyan-600',    theme: 'cyan'    },
];

const CATEGORY_OFFER_ICONS = {
  '🍽': {
    food: ['🍴', '🌮', '🥢', '🌯', '🫓', '🍜', '🍚', '🍢', '🍤', '🥟', '🍔', '🍟', '🌭', '🍕', '🥐', '🍩', '🍰', '🍦'],
    drinks: ['☕️', '🥤', '🥛', '🍺', '🍷', '🍸', '🧉']
  },
  '✂️': ['✂️', '💅', '💄', '💆🏻', '🖋', '👁', '🤨', '💆‍♀️', '💇‍♀️', '🧴', '💈', '✨'],
  '🚘': ['💦', '🅿️', '🚘', '🔧', '⛽', '🔋', '🧼', '🚗', '🛠️'],
  '🏋️': ['🏋️', '🧘', '🤸', '🥊', '🏊', '🛼', '🚴', '🏃', '🏆', '🥇', '⚽', '🏀'],
  '🐾': ['✂️', '🛁', '🏥', '🦴', '🐕', '🐈', '🐶', '🐾', '🐕‍🦺', '🐱'],
  '🛠': ['💱', '👞', '⌚', '📱', '🛠', '🪣', '🧺', '🔑', '📦', '🖨', '📸', '🌐', '📡', '📚', '🗣', '🎼', '⭐️'],
  '🏪': ['🏪', '⭐️', '🎟️', '🎁', '🛍️', '📦', '☕️', '🍔', '💇', '🚘', '🦴', '🛠️', '💅', '🏋️', '🍿', '🎬']
};

const getCategoryIconList = (categoryIcon) => {
  const data = CATEGORY_OFFER_ICONS[categoryIcon] || CATEGORY_OFFER_ICONS['🏪'];
  if (Array.isArray(data)) {
    return data;
  }
  return [...(data.food || []), ...(data.drinks || [])];
};

const getPassColorByIndex = (passId) => {
  const seed = typeof passId === 'number' ? passId : String(passId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PASS_COLOR_PALETTE[Math.abs(seed) % PASS_COLOR_PALETTE.length];
};

const getThemeByIcon = (icon) => {
  const normalized = String(icon || '').toLowerCase();
  if (normalized.includes('☕️') || normalized.includes('coffee') || normalized.includes('капучино') || normalized.includes('кофе')) {
    return { colors: 'from-amber-700 to-amber-900', btnColor: 'text-amber-800', theme: 'amber' };
  }
  if (normalized.includes('🌮') || normalized.includes('🌯') || normalized.includes('shawarma') || normalized.includes('тако') || normalized.includes('шаурма')) {
    return { colors: 'from-rose-500 to-red-700', btnColor: 'text-rose-600', theme: 'rose' };
  }
  if (normalized.includes('🧋') || normalized.includes('bubble') || normalized.includes('boba') || normalized.includes('чай')) {
    return { colors: 'from-indigo-500 to-purple-700', btnColor: 'text-indigo-600', theme: 'indigo' };
  }
  if (normalized.includes('🥐') || normalized.includes('croissant') || normalized.includes('круассан')) {
    return { colors: 'from-orange-600 to-amber-800', btnColor: 'text-orange-700', theme: 'orange' };
  }
  if (normalized.includes('🍕') || normalized.includes('pizza') || normalized.includes('пицца')) {
    return { colors: 'from-red-500 to-rose-800', btnColor: 'text-red-600', theme: 'red' };
  }
  if (normalized.includes('🍣') || normalized.includes('sushi') || normalized.includes('суши')) {
    return { colors: 'from-sky-500 to-blue-700', btnColor: 'text-sky-600', theme: 'sky' };
  }
  if (normalized.includes('🍦') || normalized.includes('ice') || normalized.includes('мороженое')) {
    return { colors: 'from-fuchsia-500 to-pink-700', btnColor: 'text-fuchsia-600', theme: 'fuchsia' };
  }
  if (normalized.includes('🥤') || normalized.includes('juice') || normalized.includes('смузи')) {
    return { colors: 'from-cyan-500 to-teal-700', btnColor: 'text-cyan-600', theme: 'cyan' };
  }
  return {
    colors: 'from-[#26A17B] to-[#1e7c5e]',
    btnColor: 'text-[#26A17B]',
    theme: 'teal'
  };
};

export default function App() {

  const [customAlert, setCustomAlert] = useState({ isOpen: false, message: '', type: 'info', title: '' });
  const [customConfirm, setCustomConfirm] = useState({ isOpen: false, message: '', onConfirm: null, onCancel: null });

  const showCustomConfirmAsync = (message) => {
    return new Promise((resolve) => {
      setCustomConfirm({
        isOpen: true,
        message,
        onConfirm: () => {
          setCustomConfirm(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setCustomConfirm(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    });
  };

  const showCustomAlert = (message, type = 'info', title = '') => {
    setCustomAlert({ isOpen: true, message, type, title });
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
      else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
      else tg.HapticFeedback.notificationOccurred('warning');
    }
  };

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  const userAvatar = tgUser?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${tgUser?.first_name || 'Alexey'}&backgroundColor=f4f5f9`;

  const [isDark, setIsDark] = useState(() => {
    try {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme !== null) {
        return savedTheme === 'dark';
      }
    } catch (e) {
      console.warn('localStorage read failed, falling back to Telegram/default theme:', e);
    }
    
    try {
      const tg = window.Telegram?.WebApp;
      if (tg?.colorScheme) {
        return tg.colorScheme === 'dark';
      }
    } catch (e) {
      console.warn('Telegram colorScheme read failed:', e);
    }
    
    return true; // Default fallback
  });
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'settings'
  const [lang, setLang] = useState(() => {
    try {
      const tg = window.Telegram?.WebApp;
      const tgLang = tg?.initDataUnsafe?.user?.language_code;
      if (tgLang && TRANSLATIONS[tgLang]) {
        return tgLang;
      }
    } catch (e) {
      console.warn('Failed to read language from Telegram WebApp:', e);
    }
    return 'en'; // Default language is English
  });
  const [role, setRole] = useState(() => {
    try {
      const savedRole = localStorage.getItem('role');
      if (savedRole === 'buyer' || savedRole === 'seller') {
        return savedRole;
      }
    } catch (e) {
      console.warn('Failed to read role from localStorage:', e);
    }
    return 'buyer'; // Default fallback
  });
  const [myPasses, setMyPasses] = useState(() => {
    try {
      const savedPasses = localStorage.getItem('my_passes');
      if (savedPasses) {
        const parsed = JSON.parse(savedPasses);
        if (Array.isArray(parsed)) {
          return parsed.map(p => ({
            ...p,
            icon: (typeof p.icon === 'string' && p.icon.trim() !== '')
              ? p.icon
              : (p.nameKey === 'pass_cap' ? 'coffee' : (p.nameKey === 'pass_taco' ? '🌮' : (p.nameKey === 'pass_boba' ? '🧋' : '🎟️')))
          }));
        }
      }
      // Check first-time boot
      const initialized = localStorage.getItem('my_passes_initialized') === 'true';
      if (!initialized) {
        localStorage.setItem('my_passes_initialized', 'true');
        const demoPasses = [
          { id: 'demo_1', vendor: 'Cofix', nameKey: 'pass_cap', icon: 'coffee', current: 6, total: 10, unitKey: 'cups', colors: 'from-amber-700 to-amber-900', btnColor: 'text-amber-800', theme: 'amber', isDemo: true, storeId: 'demo_store', price: '10.00 USDT', payCount: 8 },
          { id: 'demo_2', vendor: 'El Chapo', nameKey: 'pass_taco', icon: '🌮', current: 2, total: 5, unitKey: 'pcs', colors: 'from-rose-600 to-red-800', btnColor: 'text-rose-800', theme: 'rose', isDemo: true, storeId: 'demo_store', price: '12.50 USDT', payCount: 4 }
        ];
        localStorage.setItem('my_passes', JSON.stringify(demoPasses));
        return demoPasses;
      }
    } catch (e) {
      console.warn('Failed to parse my_passes:', e);
    }
    return [];
  });
  const [addedStores, setAddedStores] = useState(() => {
    try {
      const savedStoresV2 = localStorage.getItem('added_stores_v2');
      if (savedStoresV2) {
        return JSON.parse(savedStoresV2);
      }
      const savedStores = localStorage.getItem('added_stores');
      if (savedStores) {
        const ids = JSON.parse(savedStores);
        return ids.map(id => STORES_DATA.find(s => s.id === id)).filter(Boolean);
      }
      // Check first-time boot
      const initialized = localStorage.getItem('added_stores_initialized') === 'true';
      if (!initialized) {
        localStorage.setItem('added_stores_initialized', 'true');
        const demoStore = {
          id: 'demo_store',
          name: 'Demo Marketplace 🛍️',
          icon: '🛍️',
          bg: 'bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300',
          accentColor: '#6366f1',
          isDemo: true,
          items: [
            { id: 'demo_offer_1', icon: '☕️', nameKey: 'pass_cap', price: '10.00 USDT', priceVal: 10.00, total: 10, unitKey: 'cups', colors: 'from-amber-700 to-amber-900', btnColor: 'text-amber-800', theme: 'amber', desc: '8+2 FREE', isDemo: true },
            { id: 'demo_offer_2', icon: '🌮', nameKey: 'pass_taco', price: '12.50 USDT', priceVal: 12.50, total: 5, unitKey: 'pcs', colors: 'from-rose-600 to-red-800', btnColor: 'text-rose-800', theme: 'rose', desc: '4+1 FREE', isDemo: true }
          ]
        };
        localStorage.setItem('added_stores_v2', JSON.stringify([demoStore]));
        return [demoStore];
      }
    } catch (e) {
      console.warn('Failed to load added_stores:', e);
    }
    return [];
  });
  const [isSyncInitialized, setIsSyncInitialized] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);
  const [flippedCardId, setFlippedCardId] = useState(null);
  const [shareStoreModalOpen, setShareStoreModalOpen] = useState(false);
  const [shareStoreModalClosing, setShareStoreModalClosing] = useState(false);
  const [isStoreOffersLoading, setIsStoreOffersLoading] = useState(false);
  const [qrModalState, setQrModalState] = useState({ isOpen: false, isClosing: false, pass: null });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const videoRef = useRef(null);
  const hasRefreshedStoresRef = useRef(false);
  const [cameraStream, setCameraStream] = useState(null);

  // Стейты для продавца
  const [sellerOffers, setSellerOffers] = useState([]);
  const [isManagingSingleStore, setIsManagingSingleStore] = useState(false);
  const [storeId, setStoreId] = useState(null);       // ID магазина продавца в Redis
  const [lastActiveStoreId, setLastActiveStoreId] = useState(null); // ID последнего активного/редактируемого магазина
  const [isOfferSaving, setIsOfferSaving] = useState(false); // Лоадер кнопки сохранения
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);
  const [isAddOfferClosing, setIsAddOfferClosing] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);

  // Стейты для названия и иконки магазина
  const [storeName, setStoreName] = useState('');
  const [storeIcon, setStoreIcon] = useState('🏪');
  const [isEditingStoreName, setIsEditingStoreName] = useState(false);
  const [storeNameDraft, setStoreNameDraft] = useState('');
  const [storeIconDraft, setStoreIconDraft] = useState('🏪');
  const [isUpdatingStoreName, setIsUpdatingStoreName] = useState(false);
  const [isDeletingStore, setIsDeletingStore] = useState(false);

  // TonConnect UI хуки и стейты авторизации
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const isConnectionRestored = useIsConnectionRestored();
  
  // Динамическая история транзакций покупателя и продавца
  const [historyTransactions, setHistoryTransactions] = useState(() => {
    try {
      const saved = localStorage.getItem('real_history_transactions');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
    // Если истории нет, загружаем дефолтные демонстрационные карточки с пометкой ДЕМО
    return (HISTORY_TRANSACTIONS || []).map(tx => ({ ...tx, isDemo: true }));
  });

  // Эффект автосохранения истории при её обновлении
  useEffect(() => {
    try {
      localStorage.setItem('real_history_transactions', JSON.stringify(historyTransactions));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [historyTransactions]);

  const [walletVerified, setWalletVerified] = useState(() => {
    try { return localStorage.getItem('wallet_verified') === 'true'; } catch { return false; }
  });
  const [isVerifying, setIsVerifying] = useState(false);

  // Фоновые/ленивые рефы для TonConnect Proof
  const proofPayloadReadyRef = useRef(false);
  const proofPayloadDataRef = useRef(null);
  const isFetchingPayloadRef = useRef(false);

  // Стейт и рефы для аватара и кошелька
  const lastWalletAddressRef = useRef(null);
  const [isWalletMenuOpen, setIsWalletMenuOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const longPressTimerRef = useRef(null);
  const isLongPressActiveRef = useRef(false);

  const handleCopyAddress = () => {
    if (!cachedWalletAddress) return;
    let addressToCopy = cachedWalletAddress;
    if (cachedWalletAddress.includes(':')) {
      try {
        addressToCopy = toUserFriendlyAddress(cachedWalletAddress, false); // false for UQ
      } catch (e) {
        console.warn('Failed to convert address for copying:', e);
      }
    }
    navigator.clipboard.writeText(addressToCopy)
      .then(() => {
        setIsCopied(true);
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        setTimeout(() => {
          setIsCopied(false);
          setIsWalletMenuOpen(false);
        }, 1200);
      })
      .catch((err) => console.error('Failed to copy address:', err));
  };

  const startLongPress = (e) => {
    isLongPressActiveRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setRole((prevRole) => {
        const nextRole = prevRole === 'buyer' ? 'seller' : 'buyer';
        setIsManagingSingleStore(false);
        const tg = window.Telegram?.WebApp;
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        return nextRole;
      });
    }, 600);
  };

  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Кастомная кнопка: мгновенно кэшируем адрес кошелька как только он появляется
  const [cachedWalletAddress, setCachedWalletAddress] = useState(() => {
    // При первом рендере пытаемся достать адрес напрямую из хранилища TonConnect
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('ton-connect'));
      for (const key of keys) {
        const val = localStorage.getItem(key);
        if (!val) continue;
        const data = JSON.parse(val);
        const addr = data?.account?.address || 
                     data?.connectEvent?.payload?.items?.[0]?.address || 
                     data?.address;
        if (addr) return addr;
      }
    } catch {}
    return null;
  });

  // Форматирование адреса TON в короткий вид: UQabc...xyz
  const formatWalletAddress = (addr) => {
    if (!addr) return '';
    let friendly = addr;
    if (addr.includes(':')) {
      try {
        friendly = toUserFriendlyAddress(addr, false); // false for non-bounceable UQ
      } catch (e) {
        console.warn('Failed to convert raw address to user friendly:', e);
        friendly = addr.replace(/^0:/, 'UQ').replace(/-/g, '');
      }
    }
    if (friendly.length <= 12) return friendly;
    return `${friendly.slice(0, 6)}...${friendly.slice(-4)}`;
  };
  
  // Стейты для свайп-жестов и перетаскивания (создание предложения)
  const [offerDragStartY, setOfferDragStartY] = useState(0);
  const [offerDragOffset, setOfferDragOffset] = useState(0);
  const [isOfferDragging, setIsOfferDragging] = useState(false);
  const [isOfferSnapping, setIsOfferSnapping] = useState(false);

  // Стейты для свайп-жестов и перетаскивания (QR-код)
  const [qrDragStartY, setQrDragStartY] = useState(0);
  const [qrDragOffset, setQrDragOffset] = useState(0);
  const [isQrDragging, setIsQrDragging] = useState(false);
  const [isQrSnapping, setIsQrSnapping] = useState(false);
  
  // Стейты для динамических одноразовых QR-кодов (OTP)
  const [qrOtpToken, setQrOtpToken] = useState(null);
  const [qrOtpLoading, setQrOtpLoading] = useState(false);
  const [qrOtpTimeLeft, setQrOtpTimeLeft] = useState(100);
  const [qrOtpStatus, setQrOtpStatus] = useState('active'); // 'active' | 'scanned' | 'expired' | 'error'
  
  // Стейты для новой формы добавления
  const [formIcon, setFormIcon] = useState('☕️');
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formPriceInstead, setFormPriceInstead] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPay, setFormPay] = useState('');
  const [formGet, setFormGet] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [sellerStores, setSellerStores] = useState([]);
  const [isSellerStoresLoading, setIsSellerStoresLoading] = useState(false);

  // Стейты для системы сотрудников (Staff)
  const [isStaff, setIsStaff] = useState(() => {
    try { return localStorage.getItem('is_staff') === 'true'; } catch { return false; }
  });
  const [associatedStoreId, setAssociatedStoreId] = useState(() => {
    try { return localStorage.getItem('associated_store_id') || null; } catch { return null; }
  });
  const [staffMembers, setStaffMembers] = useState({});
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [isStaffLoading, setIsStaffLoading] = useState(false);

  // Легкая кастомная функция перевода (t)
  const t = (key, params = {}) => {
    let text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
    Object.keys(params).forEach(k => {
      text = text.replace(`{${k}}`, params[k]);
    });
    return text;
  };  // Функция проверки, является ли магазин партнерским (где юзер — сотрудник)
  const isStaffStore = (storeIdToCheck) => {
    if (!storeIdToCheck || !sellerStores) return false;
    const store = sellerStores.find(s => String(s.id) === String(storeIdToCheck));
    if (!store) return false;
    const currentUserId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
    return String(store.owner_id) !== currentUserId;
  };


  // Функция определения высоты безопасной зоны (Safe Area)
  const getTopInset = () => {
    try {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        const sdkInset = tg.contentSafeAreaInset?.top ?? tg.safeAreaInset?.top ?? 0;
        if (sdkInset > 0) return sdkInset;

        const isReallyFullscreen = tg.isFullscreen || (window.innerHeight >= window.screen.height - 120);
        if (isReallyFullscreen) {
          const platform = String(tg.platform || '').toLowerCase();
          if (platform === 'android') {
            return 32; // Средняя высота статус-бара на Android + запас
          } else if (platform === 'ios') {
            return 48; // Средняя высота статус-бара/челки на iOS + запас
          }
        }
      }
    } catch (e) {
      console.warn('Failed to calculate safe area inset:', e);
    }
    return 0;
  };

  const [safeAreaTop, setSafeAreaTop] = useState(() => getTopInset());

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.expand();
      tg.ready();

      const handleSafeAreaChange = () => {
        setSafeAreaTop(getTopInset());
      };

      // Слушаем изменения безопасных зон
      tg.onEvent('safeAreaChanged', handleSafeAreaChange);
      tg.onEvent('contentSafeAreaChanged', handleSafeAreaChange);

      return () => {
        tg.offEvent('safeAreaChanged', handleSafeAreaChange);
        tg.offEvent('contentSafeAreaChanged', handleSafeAreaChange);
      };
    }
  }, []);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      const isAnyModalOpen = qrModalState.isOpen || isAddOfferOpen || isScannerOpen;
      if (isAnyModalOpen) {
        if (typeof tg.disableVerticalSwipes === 'function') {
          tg.disableVerticalSwipes();
        }
      } else {
        if (typeof tg.enableVerticalSwipes === 'function') {
          tg.enableVerticalSwipes();
        }
      }
    }
  }, [qrModalState.isOpen, isAddOfferOpen, isScannerOpen]);

  useEffect(() => {
    let activeStream = null;

    if (isScannerOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(s => {
          activeStream = s;
          setCameraStream(s);
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch(err => {
          console.warn("Failed to access camera:", err);
        });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      setCameraStream(null);
    };
  }, [isScannerOpen]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // Синхронизируем тему и цвета кнопки TON Connect с нашей цветовой палитрой
  useEffect(() => {
    if (tonConnectUI) {
      tonConnectUI.uiOptions = {
        uiPreferences: {
          theme: isDark ? 'DARK' : 'LIGHT',
          colorsSet: {
            DARK: {
              connectButton: {
                background: '#1E1E22',  // Мягкий цвет карточки в темной теме вместо черного
                foreground: '#FFFFFF',  // Белый текст
              },
              accent: '#26A17B',        // Фирменный зеленый цвет вместо синего TON
              background: {
                primary: '#1E1E22',
                secondary: '#121214',
              }
            },
            LIGHT: {
              connectButton: {
                background: '#FFFFFF',  // Мягкий белый фон в светлой теме вместо резкого черного
                foreground: '#374151',  // Темно-серый текст для хорошей читаемости
              },
              accent: '#26A17B',        // Фирменный зеленый цвет для акцентов
              background: {
                primary: '#FFFFFF',
                secondary: '#F4F5F9',
              }
            }
          }
        }
      };
    }
  }, [isDark, tonConnectUI]);

  // Reset management sub-view when tab or role switches
  useEffect(() => {
    setIsManagingSingleStore(false);
  }, [activeTab, role]);

  // Reset flipped card ID when tab, role or selected store changes to ensure card flips back to front side
  useEffect(() => {
    setFlippedCardId(null);
  }, [activeTab, selectedStore, role]);

  useEffect(() => {
    try {
      localStorage.setItem('role', role);
    } catch (e) {
      console.warn('Failed to save role to localStorage:', e);
    }
  }, [role]);

  useEffect(() => {
    try {
      localStorage.setItem('my_passes', JSON.stringify(myPasses));
    } catch (e) {
      console.warn('Failed to save my_passes to localStorage:', e);
    }
  }, [myPasses]);

  useEffect(() => {
    try {
      localStorage.setItem('added_stores_v2', JSON.stringify(addedStores));
      const ids = addedStores.map(s => s.id);
      localStorage.setItem('added_stores', JSON.stringify(ids));
    } catch (e) {
      console.warn('Failed to save added_stores to localStorage:', e);
    }
  }, [addedStores]);

  // --- Загрузка синхронизированных данных покупателя с бэкенда при запуске ---
  useEffect(() => {
    const buyerId = tgUser?.id ? String(tgUser.id) : 'dev_buyer_1';
    let isMounted = true;
    
    setIsSyncInitialized(false); // Сбрасываем флаг перед загрузкой для нового пользователя!

    const loadBuyerData = async () => {
      try {
        const res = await fetch(`${API_BASE}/buyer/sync/${buyerId}`);
        if (!res.ok) throw new Error('sync fetch failed');
        const data = await res.json();
        if (isMounted && data.status === 'ok') {
          // Если на бэкенде есть сохраненные данные, загружаем их
          if (data.my_passes && data.my_passes.length > 0) {
            setMyPasses(data.my_passes);
          }
          if (data.added_stores && data.added_stores.length > 0) {
            setAddedStores(data.added_stores);
          }
        }
      } catch (err) {
        console.warn('Failed to load synced buyer data:', err);
      } finally {
        if (isMounted) {
          setIsSyncInitialized(true);
        }
      }
    };

    loadBuyerData();

    return () => {
      isMounted = false;
    };
  }, [tgUser]);

  // --- Вызов /api/init-user при запуске для синхронизации профиля и обработки инвайтов ---
  useEffect(() => {
    const initUser = async () => {
      const tg = window.Telegram?.WebApp;
      const userId = tgUser?.id;
      if (!userId) return;

      const startParam = tg?.initDataUnsafe?.start_param || null;
      const username = tgUser?.username || tgUser?.first_name || '';

      try {
        const res = await fetch(`${API_BASE}/init-user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            username,
            role: localStorage.getItem('role') || 'buyer',
            start_param: startParam
          })
        });
        if (!res.ok) return;
        const data = await res.json();

        // Сохраняем статус сотрудника если изменился
        if (data.is_staff !== undefined) {
          const newIsStaff = data.is_staff === true;
          const newStoreId = data.associated_store_id || null;
          setIsStaff(newIsStaff);
          setAssociatedStoreId(newStoreId);
          try {
            localStorage.setItem('is_staff', newIsStaff ? 'true' : 'false');
            localStorage.setItem('associated_store_id', newStoreId || '');
          } catch {}

          // Если только что стали сотрудником — переключаемся в режим продавца чтобы сразу видеть магазин
          if (newIsStaff && newStoreId && startParam?.startsWith('inv_')) {
            setRole('seller');
            setActiveTab('home');
            setIsManagingSingleStore(false);
            if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
            showCustomAlert(t('staff_joined'), 'success');
          }
        }
      } catch (err) {
        console.warn('Failed to init-user:', err);
      }
    };

    initUser();
  }, [tgUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Обработка deep-link (start_param) при первом запуске ---
  useEffect(() => {
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (!startParam) return;

    if (startParam.startsWith('Store_')) {
      const remainder = startParam.slice(6); // Strip 'Store_' prefix
      const parts = remainder.split('_');
      let storeId = remainder;
      let referrerId = null;
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
          referrerId = lastPart;
          storeId = parts.slice(0, -1).join('_');
        }
      }
      
      setRole('buyer');
      setActiveTab('home');

      const fetchAndOpenStore = async () => {
        try {
          const res = await fetch(`${API_BASE}/store/${storeId}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.status === 'ok' && data.store) {
            const store = data.store;
            const storeObj = {
              id: store.id,
              name: store.name,
              icon: store.icon || '🏪',
              bg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
              accentColor: '#26A17B',
              isDynamic: true,
              sellerWallet: store.seller_wallet || store.sellerWallet || '',
              items: [],
              referred_by: referrerId
            };
            setAddedStores(prev => {
              const alreadyAdded = prev.find(s => String(s.id) === String(store.id));
              if (alreadyAdded) {
                const remaining = prev.filter(s => String(s.id) !== String(store.id));
                const updatedStore = { ...alreadyAdded, referred_by: referrerId };
                return [updatedStore, ...remaining];
              }
              return [storeObj, ...prev];
            });
            setSelectedStore(storeObj);
          }
        } catch (e) {
          console.warn('Failed to handle start_param deep link:', e);
        }
      };

      fetchAndOpenStore();
    }
    // inv_ токены обрабатываются сервером в /api/init-user, не нужно делать ничего дополнительно на фронте
  }, []); // Run only once on mount

  // --- Синхронизация данных покупателя на бэкенд при изменениях ---
  useEffect(() => {
    if (!isSyncInitialized) return;

    const buyerId = tgUser?.id ? String(tgUser.id) : 'dev_buyer_1';
    const syncData = async () => {
      try {
        await fetch(`${API_BASE}/buyer/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            user_id: buyerId,
            my_passes: myPasses,
            added_stores: addedStores
          })
        });
      } catch (err) {
        console.warn('Failed to sync buyer data to backend:', err);
      }
    };

    // Делаем небольшую задержку (дебаунс) для предотвращения спама запросами
    const timer = setTimeout(syncData, 500);
    return () => clearTimeout(timer);
  }, [myPasses, addedStores, isSyncInitialized, tgUser]);



  // --- Фоновое обновление названий и иконок добавленных магазинов для покупателя ---
  useEffect(() => {
    if (role !== 'buyer') {
      hasRefreshedStoresRef.current = false; // Сбрасываем флаг при смене роли, чтобы обновить заново
      return;
    }

    if (addedStores.length === 0 || hasRefreshedStoresRef.current) return;

    hasRefreshedStoresRef.current = true;
    let isMounted = true;

    const refreshStoresMetadata = async () => {
      try {
        let hasChanges = false;
        const refreshedStoresResults = await Promise.all(
          addedStores.map(async (store) => {
            // Если ID не является одним из статических моков, значит это динамический бэкенд-магазин
            const isStatic = ['cofix', 'el_chapo', 'boba_lab'].includes(String(store.id).toLowerCase());
            if (isStatic) return store;
            
            try {
              const res = await fetch(`${API_BASE}/store/${store.id}`);
              if (res.status === 404) {
                hasChanges = true; // Магазин был удален продавцом!
                return null;
              }
              if (!res.ok) return store;
              const data = await res.json();
              if (data.status === 'ok' && data.store) {
                const latestName = data.store.name;
                const latestIcon = data.store.icon;
                const latestWallet = data.store.seller_wallet || data.store.sellerWallet || '';
                if (
                  (latestName && latestName !== store.name) ||
                  (latestIcon && latestIcon !== store.icon) ||
                  (latestWallet !== store.sellerWallet)
                ) {
                  hasChanges = true;
                  return {
                    ...store,
                    name: latestName || store.name,
                    icon: latestIcon || store.icon,
                    sellerWallet: latestWallet
                  };
                }
              }
            } catch (err) {
              console.warn(`Failed to refresh store ${store.id} metadata:`, err);
            }
            return store;
          })
        );

        const refreshedStores = refreshedStoresResults.filter(Boolean);
        if (refreshedStores.length !== addedStores.length) {
          hasChanges = true;
        }

        if (isMounted && hasChanges) {
          setAddedStores(refreshedStores);

          // Также обновляем имена и иконки в купленных пассах
          setMyPasses(prevPasses => prevPasses.map(pass => {
            const matchingStore = refreshedStores.find(s => s.id === pass.storeId);
            if (matchingStore) {
              return {
                ...pass,
                vendor: matchingStore.name,
                icon: pass.icon === 'coffee' ? 'coffee' : matchingStore.icon
              };
            }
            return pass;
          }));
        }
      } catch (err) {
        console.warn('Failed to refresh dynamic stores metadata:', err);
      }
    };

    refreshStoresMetadata();

    return () => {
      isMounted = false;
    };
  }, [role, addedStores]);


  // --- Инициализация и загрузка ВСЕХ магазинов продавца из Redis ---
  const loadSellerStores = async (userId, activeId = null) => {
    setIsSellerStoresLoading(true);
    try {
      let stores = [];
      const res = await fetch(`${API_BASE}/my-stores/${userId}`);
      
      if (res.status === 404) {
        // Бэкенд старой версии — используем резервный вариант с одним магазином
        const storeRes = await fetch(`${API_BASE}/my-store/${userId}`);
        if (storeRes.ok) {
          const json = await storeRes.json();
          if (json.store) stores = [json.store];
        }
      } else if (res.ok) {
        const json = await res.json();
        stores = json.stores || [];
      }
      
      // Параллельно загружаем все офферы/пасы для каждого магазина с их статистикой продаж!
      const storesWithOffers = await Promise.all(stores.map(async (store) => {
        try {
          const offersRes = await fetch(`${API_BASE}/store/${store.id}/offers?role=seller&user_id=${userId}`);
          if (offersRes.ok) {
            const offersJson = await offersRes.json();
            return { ...store, offers: offersJson.offers || [] };
          }
        } catch (e) {
          console.warn(`Failed to load offers for store ${store.id}:`, e);
        }
        return { ...store, offers: [] };
      }));
      
      setSellerStores(storesWithOffers);

      // Сразу загружаем список сотрудников для каждого из магазинов!
      storesWithOffers.forEach(s => {
        loadStaffMembers(s.id);
      });
      
      // Синхронизируем текущий выбранный магазин
      if (storesWithOffers.length > 0) {
        // Используем String сравнение для полной безопасности от type-mismatch (string vs number)
        const targetId = activeId || storeId;
        const activeStore = storesWithOffers.find(s => String(s.id) === String(targetId));
        if (activeStore) {
          setStoreId(activeStore.id);
          setLastActiveStoreId(activeStore.id);
          setStoreName(activeStore.name || '');
          setStoreIcon(activeStore.icon || '🏪');
          setStoreIconDraft(activeStore.icon || '🏪');
          setSellerOffers(activeStore.offers || []);
        } else {
          // Если запрошенный ID не найден, выбираем первый доступный магазин чтобы не ломать UI
          const fallbackStore = storesWithOffers[0];
          setStoreId(fallbackStore.id);
          setLastActiveStoreId(fallbackStore.id);
          setStoreName(fallbackStore.name || '');
          setStoreIcon(fallbackStore.icon || '🏪');
          setStoreIconDraft(fallbackStore.icon || '🏪');
          setSellerOffers(fallbackStore.offers || []);
        }
      } else {
        // Если магазинов нет, сбрасываем состояние
        setStoreId(null);
        setLastActiveStoreId(null);
        setStoreName('');
        setStoreIcon('🏪');
        setSellerOffers([]);
      }
    } catch (err) {
      console.warn('Failed to load seller stores:', err);
    } finally {
      setIsSellerStoresLoading(false);
    }
  };

  useEffect(() => {
    if (role !== 'seller') return;
    const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
    loadSellerStores(userId);
  }, [role]);

  const handleSelectActiveStore = (store) => {
    setStoreId(store.id);
    setLastActiveStoreId(store.id);
    setStoreName(store.name || '');
    setStoreIcon(store.icon || '🏪');
    setStoreIconDraft(store.icon || '🏪');
    setSellerOffers(store.offers || []);
  };

  // --- Загрузка магазина для сотрудника (staff) ---
  const loadStaffStoreData = async (storeIdToLoad) => {
    setIsSellerStoresLoading(true);
    try {
      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
      const offersRes = await fetch(`${API_BASE}/store/${storeIdToLoad}/offers?role=seller&user_id=${userId}`);
      if (offersRes.ok) {
        const offersJson = await offersRes.json();
        const storeRes = await fetch(`${API_BASE}/store/${storeIdToLoad}`);
        let storeInfo = { id: storeIdToLoad, name: 'Магазин', icon: '🏪' };
        if (storeRes.ok) {
          const storeJson = await storeRes.json();
          if (storeJson.status === 'ok' && storeJson.store) {
            storeInfo = storeJson.store;
          }
        }
        setStoreId(storeIdToLoad);
        setStoreName(storeInfo.name || '');
        setStoreIcon(storeInfo.icon || '🏪');
        setStoreIconDraft(storeInfo.icon || '🏪');
        setSellerOffers(offersJson.offers || []);
        setSellerStores([{ ...storeInfo, offers: offersJson.offers || [] }]);
        
        // Загружаем личную статистику сотрудника (продажи/списания)
        loadStaffMembers(storeIdToLoad);
        
        // Сразу открываем управление магазином (read-only для сотрудника)
        setIsManagingSingleStore(true);
      }
    } catch (err) {
      console.warn('Failed to load staff store data:', err);
    } finally {
      setIsSellerStoresLoading(false);
    }
  };

  // --- Генерация одноразового инвайт-линка для сотрудника ---
  const handleGenerateInvite = async (storeIdTarget) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    setIsGeneratingInvite(true);
    try {
      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
      const res = await fetch(`${API_BASE}/store/${storeIdTarget}/generate-invite?owner_id=${userId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Failed to generate invite');
      const data = await res.json();
      if (data.status === 'ok' && data.invite_link) {
        shareTelegram(t('invite_share_text'), data.invite_link);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      }
    } catch (err) {
      console.warn('Failed to generate invite link:', err);
      showCustomAlert(t('save_failed'), 'error');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  // --- Удаление сотрудника (увольнение) ---
  const handleFireStaff = async (storeIdTarget, staffUserId) => {
    const tg = window.Telegram?.WebApp;
    const confirmed = await showCustomConfirmAsync(t('fire_staff_confirm'));
    if (!confirmed) return;
    try {
      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
      const res = await fetch(`${API_BASE}/store/${storeIdTarget}/fire-staff/${staffUserId}?owner_id=${userId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Fire staff failed');
      setStaffMembers(prev => ({
        ...prev,
        [storeIdTarget]: (prev[storeIdTarget] || []).filter(m => m.user_id !== staffUserId)
      }));
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch (err) {
      console.warn('Failed to fire staff:', err);
      showCustomAlert(t('delete_failed'), 'error');
    }
  };

  // --- Загрузка списка сотрудников магазина ---
  const loadStaffMembers = async (storeIdTarget) => {
    setIsStaffLoading(true);
    try {
      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
      const res = await fetch(`${API_BASE}/store/${storeIdTarget}/staff?user_id=${userId}`);
      if (!res.ok) throw new Error('Failed to load staff');
      const data = await res.json();
      setStaffMembers(prev => ({
        ...prev,
        [storeIdTarget]: data.staff || []
      }));
    } catch (err) {
      console.warn('Failed to load staff members:', err);
    } finally {
      setIsStaffLoading(false);
    }
  };

  // --- Синхронизируем cachedWalletAddress из wallet-объекта как только он появляется ---
  useEffect(() => {
    if (wallet?.account?.address) {
      const rawAddr = wallet.account.address;
      setCachedWalletAddress(rawAddr);
      
      // Гарантированно синхронизируем адрес кошелька с бэкендом (для новых подключений и восстановлений сессии)
      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
      fetch(`${API_BASE}/auth/save-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, wallet_address: rawAddr })
      })
      .catch(err => console.warn('Failed to auto-save wallet on backend:', err));
    } else if (isConnectionRestored && wallet === null) {
      // Сбрасываем кэш только если восстановление соединения завершено и кошелёк действительно отключён
      setCachedWalletAddress(null);
    }
  }, [wallet, isConnectionRestored, tgUser]);

  // --- Отслеживаем перепривязку кошелька продавцом ---
  useEffect(() => {
    const currentAddr = wallet?.account?.address || null;
    
    // Если сессия восстановлена, роль — продавец, кошелек сменился с null на адрес
    if (isConnectionRestored && role === 'seller' && !lastWalletAddressRef.current && currentAddr) {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
      showCustomAlert(t('seller_reconnect_warning'), 'warning');
    }
    
    // Обновляем реф
    lastWalletAddressRef.current = currentAddr;
  }, [wallet, isConnectionRestored, role]);

  // --- TonConnect Proof: загружаем payload до открытия шторки ---
  useEffect(() => {
    if (!tonConnectUI) return;

    // Если кошелек уже подключен, сбрасываем параметры и не запрашиваем payload
    if (wallet) {
      tonConnectUI.setConnectRequestParameters(null);
      proofPayloadReadyRef.current = false;
      proofPayloadDataRef.current = null;
      isFetchingPayloadRef.current = false;
      return;
    }

    let isMounted = true;

    // Асинхронная фоновая загрузка payload (вызывается ТОЛЬКО лениво при открытии шторки)
    const loadProofPayloadAsync = async () => {
      // Если уже загружено или в процессе загрузки, ничего не делаем
      if (proofPayloadReadyRef.current || isFetchingPayloadRef.current) return;

      isFetchingPayloadRef.current = true;

      try {
        const res = await fetch(`${API_BASE}/auth/proof-payload`);
        if (!res.ok) throw new Error('proof-payload fetch failed');
        const { payload } = await res.json();

        if (isMounted) {
          proofPayloadDataRef.current = payload;
          proofPayloadReadyRef.current = true;
          isFetchingPayloadRef.current = false;

          // Устанавливаем параметры в ready. Поскольку шторка уже открыта (пользователь нажал кнопку Connect),
          // TonConnectUI мгновенно переключится с 'loading' на готовый список кошельков.
          tonConnectUI.setConnectRequestParameters({
            state: 'ready',
            value: { tonProof: payload }
          });
        }
      } catch (err) {
        console.warn('Failed to load proof payload:', err);
        if (isMounted) {
          isFetchingPayloadRef.current = false;
          proofPayloadReadyRef.current = false;
          proofPayloadDataRef.current = null;
          // В случае ошибки сбрасываем состояние загрузки, дабы дать пользователю возможность
          // подключиться без proof (деградация)
          tonConnectUI.setConnectRequestParameters(null);
        }
      }
    };

    // Слушатель состояния модального окна TonConnect
    const unsubscribeModal = tonConnectUI.onModalStateChange((state) => {
      if (!isMounted) return;

      if (state.status === 'opened') {
        // Загружаем payload ТОЛЬКО в момент физического открытия шторки пользователем
        if (!proofPayloadReadyRef.current) {
          // Включаем статус loading, чтобы внутри шторки крутился спиннер до загрузки payload
          tonConnectUI.setConnectRequestParameters({ state: 'loading' });
          loadProofPayloadAsync();
        }
      } else if (state.status === 'closed') {
        // Если модальное окно закрылось, а payload так и не готов, сбрасываем в null
        if (!proofPayloadReadyRef.current) {
          tonConnectUI.setConnectRequestParameters(null);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribeModal();
    };
  }, [tonConnectUI, wallet]);

  // --- TonConnect Proof: обрабатываем результат подключения и шлём proof на бэкенд ---
  useEffect(() => {
    if (!tonConnectUI) return;

    const unsubscribe = tonConnectUI.onStatusChange(async (walletInfo) => {
      // Кошелёк отключен — сбрасываем статус
      if (!walletInfo) {
        setWalletVerified(false);
        try { localStorage.removeItem('wallet_verified'); } catch {}
        
        // Оповещаем бэкенд о сбросе кошелька и деактивации предложений
        const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
        fetch(`${API_BASE}/auth/disconnect-wallet`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId })
        })
        .then((res) => {
          if (res.ok && role === 'seller') {
            // Мгновенно обновляем список предложений, чтобы показать их неактивными
            refreshSellerOffers();
          }
        })
        .catch((err) => console.warn('Failed to notify backend about disconnect:', err));

        return;
      }

      // Если проф уже прошёл — пропускаем
      if (walletVerified) return;

      // Проверяем, есть ли proof в ответе кошелька
      const tonProof = walletInfo.connectItems?.tonProof;
      if (!tonProof || !('proof' in tonProof)) return;

      setIsVerifying(true);
      try {
        const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
        const address = walletInfo.account.address;    // raw: "workchain:hash"
        const publicKey = walletInfo.account.publicKey; // hex string

        const res = await fetch(`${API_BASE}/auth/verify-proof`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            address,
            public_key: publicKey,
            proof: {
              timestamp: tonProof.proof.timestamp,
              domain: tonProof.proof.domain,
              signature: tonProof.proof.signature,
              payload: tonProof.proof.payload
            }
          })
        });

        const json = await res.json();
        if (res.ok && json.verified) {
          setWalletVerified(true);
          try { localStorage.setItem('wallet_verified', 'true'); } catch {}
          // Тактильный отклик подтверждения
          const tg = window.Telegram?.WebApp;
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
          console.warn('Proof verification failed:', json);
        }
      } catch (err) {
        console.error('Failed to verify proof:', err);
      } finally {
        setIsVerifying(false);
      }
    });

    return () => unsubscribe();
  }, [tonConnectUI, walletVerified, tgUser]);
  // --- Загрузка предложений динамического магазина для покупателя ---
  useEffect(() => {
    if (!selectedStore || !selectedStore.isDynamic) return;

    const loadDynamicStoreOffers = async () => {
      setIsStoreOffersLoading(true);
      try {
        const res = await fetch(`${API_BASE}/store/${selectedStore.id}/offers`);
        if (!res.ok) throw new Error('Failed to load store offers');
        const data = await res.json();
        
        const mappedItems = (data.offers || []).map(offer => {
          const payCount = (offer.pay_count !== undefined && offer.pay_count !== null && offer.pay_count !== '') ? parseInt(offer.pay_count) : null;
          const total = parseInt(offer.total_count || 0);
          const priceVal = parseFloat(offer.price_ton || 0);
          const priceInsteadVal = (offer.price_instead !== undefined && offer.price_instead !== null && offer.price_instead !== '') ? parseFloat(offer.price_instead) : null;
          
          let desc = `${total} шт`;
          if (payCount && payCount > 0) {
            desc = `${payCount}+${total - payCount}`;
          }

          return {
            id: offer.id,
            icon: offer.icon || '🎟️',
            nameKey: offer.name,
            name: offer.name,
            price: `${priceVal.toFixed(2)} ₮`,
            priceVal,
            priceInstead: priceInsteadVal ? `${priceInsteadVal.toFixed(2)} ₮` : null,
            priceInsteadVal,
            payCount,
            total,
            unitKey: 'pcs',
            desc,
            ...getThemeByIcon(offer.icon || '')
          };
        });

        // Update selected store with loaded items and seller wallet
        const sellerWalletFromApi = data.seller_wallet || '';
        setSelectedStore(prev => {
          if (!prev || prev.id !== selectedStore.id) return prev;
          return { ...prev, items: mappedItems, sellerWallet: sellerWalletFromApi };
        });

        // Also update the store in the addedStores list so it is preserved!
        setAddedStores(prevStores => prevStores.map(s => {
          if (s.id === selectedStore.id) {
            return { ...s, items: mappedItems, sellerWallet: sellerWalletFromApi };
          }
          return s;
        }));
      } catch (err) {
        console.warn('Failed to load dynamic store offers:', err);
      } finally {
        setIsStoreOffersLoading(false);
      }
    };

    loadDynamicStoreOffers();
  }, [selectedStore?.id]);


  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      localStorage.setItem('theme', nextDark ? 'dark' : 'light');
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  };

  const openQR = (pass) => {
    if (pass.isDemo) {
      showCustomAlert(t('demo_pass_description'), 'info', t(pass.nameKey) || pass.vendor);
      return;
    }
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    setQrModalState({ isOpen: true, isClosing: false, pass });
    generatePassOtp(pass);
  };

  const handleBuyMore = async (pass) => {
    if (pass.isDemo) {
      showCustomAlert(t('demo_pass_description'), 'info', t(pass.nameKey) || pass.vendor);
      return;
    }
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    let matchingStore = addedStores.find(s => s.name === pass.vendor || s.id === pass.storeId);
    
    if (!matchingStore) {
      // 1. Try static mock data
      matchingStore = STORES_DATA.find(s => s.name === pass.vendor || s.id === pass.storeId);
    }
    
    if (!matchingStore && sellerStores) {
      // 2. Try merchant's own stores
      matchingStore = sellerStores.find(s => s.name === pass.vendor || s.id === pass.storeId);
    }
    
    if (!matchingStore && pass.storeId) {
      // 3. Fetch dynamic store from backend by ID
      try {
        const res = await fetch(`${API_BASE}/store/${pass.storeId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok' && data.store) {
            const fetchedStore = data.store;
            matchingStore = {
              id: fetchedStore.id,
              name: fetchedStore.name,
              icon: fetchedStore.icon || '🏪',
              bg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
              accentColor: '#26A17B',
              isDynamic: true,
              items: []
            };
            setAddedStores(prev => {
              if (prev.some(s => s.id === matchingStore.id)) return prev;
              return [matchingStore, ...prev];
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch matching store in handleBuyMore:', err);
      }
    }
    
    if (matchingStore) {
      setSelectedStore(matchingStore);
      setActiveTab('home');
    } else {
      showCustomAlert(t('store_not_found_buy'), 'error');
    }
  };

  const handleDeletePass = async (pass) => {
    const tg = window.Telegram?.WebApp;
    if (pass.isDemo) {
      setMyPasses(prev => prev.filter(p => p.id !== pass.id));
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      return;
    }
    const isUnused = pass.current > 0;
    const confirmMessage = isUnused 
      ? t('delete_active_pass_warning') 
      : t('delete_pass_confirm');
    
    const performDelete = () => {
      setMyPasses(prev => prev.filter(p => p.id !== pass.id));
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    };

    const confirmed = await showCustomConfirmAsync(confirmMessage);
    if (confirmed) performDelete();
  };

  const handleUpdateStoreName = async () => {
    const trimmed = storeNameDraft.trim();
    if (!trimmed || isUpdatingStoreName) return;
    
    if (trimmed.length > 22) {
      showCustomAlert(t('validation_store_name_limit'), 'warning');
      return;
    }
    
    setIsUpdatingStoreName(true);
    const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
    try {
      let newSid = storeId;
      if (!storeId) {
        // Если ID магазина пустой (например, после удаления), создаем новый магазин
        const res = await fetch(`${API_BASE}/create-store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_id: userId, name: trimmed, icon: storeIconDraft })
        });
        
        if (res.status === 400) {
          const errJson = await res.json();
          if (errJson.detail === 'limit_reached') {
            throw new Error('LIMIT_REACHED');
          }
        }
        
        if (!res.ok) throw new Error('create-store failed');
        const json = await res.json();
        const sid = json.store?.id;
        if (!sid) throw new Error('No store_id returned');
        
        newSid = sid;
        setStoreId(sid);
        setLastActiveStoreId(sid);
        setStoreName(trimmed);
        setStoreIcon(storeIconDraft);
        setIsEditingStoreName(false);
      } else {
        // Если магазин уже существует, обновляем его имя и иконку
        const res = await fetch(`${API_BASE}/update-store/${storeId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed, icon: storeIconDraft })
        });
        if (!res.ok) throw new Error('update-store failed');
        setStoreName(trimmed);
        setStoreIcon(storeIconDraft);
        setIsEditingStoreName(false);
      }
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      
      // Перезагружаем список магазинов с новым activeId
      await loadSellerStores(userId, newSid);
    } catch (err) {
      console.error('Failed to save store name:', err);
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      
      if (err.message === 'LIMIT_REACHED') {
        showCustomAlert(t('limit_reached_msg'), 'warning');
      } else {
        showCustomAlert(t('save_failed'), 'error');
      }
    } finally {
      setIsUpdatingStoreName(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeId || isDeletingStore) return;
    const tg = window.Telegram?.WebApp;
    // Нативный диалог подтверждения
    const confirmed = await showCustomConfirmAsync(t('delete_store_confirm'));
    if (!confirmed) return;

    setIsDeletingStore(true);
    const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
    try {
      const res = await fetch(`${API_BASE}/delete-store/${storeId}`, { method: 'POST' });
      if (!res.ok) throw new Error('delete-store failed');
      // Сбрасываем всё состояние магазина
      setStoreId(null);
      setStoreName('');
      setStoreNameDraft('');
      setSellerOffers([]);
      setIsEditingStoreName(false);
      setIsManagingSingleStore(false); // Возвращаемся к списку магазинов!
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      
      // Перезагружаем список магазинов
      await loadSellerStores(userId);
    } catch (err) {
      console.error('Failed to delete store:', err);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      showCustomAlert(t('delete_store_failed'), 'error');
    } finally {
      setIsDeletingStore(false);
    }
  };

  const [isRefreshingOffers, setIsRefreshingOffers] = useState(false);

  const refreshSellerOffers = async () => {
    if (!storeId || isRefreshingOffers) return;
    setIsRefreshingOffers(true);
    try {
      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
      
      // Параллельно запрашиваем обновленные офферы и список сотрудников (или личную статистику)
      const [offersRes, staffRes] = await Promise.all([
        fetch(`${API_BASE}/store/${storeId}/offers?role=seller&user_id=${userId}`),
        fetch(`${API_BASE}/store/${storeId}/staff?user_id=${userId}`)
      ]);

      if (!offersRes.ok) throw new Error('Refresh offers failed');
      const offersJson = await offersRes.json();
      setSellerOffers(offersJson.offers || []);

      if (staffRes.ok) {
        const staffJson = await staffRes.json();
        setStaffMembers(prev => ({
          ...prev,
          [storeId]: staffJson.staff || []
        }));
      }

      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch (err) {
      console.warn('Failed to refresh seller offers:', err);
    } finally {
      setIsRefreshingOffers(false);
    }
  };

  const handleToggleVisibility = async (offerId) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    if (!cachedWalletAddress) {
      showCustomAlert(t('wallet_required_to_activate'), 'warning');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/toggle-offer-visibility/${offerId}`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error('Toggle visibility failed');
      const json = await res.json();
      
      // Обновляем состояние оффера прямо в списке
      setSellerOffers(prev => prev.map(o => o.id === offerId ? json.offer : o));
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
      
      // Синхронизируем также в общем списке магазинов
      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
      loadSellerStores(userId, storeId);
    } catch (err) {
      console.error('Failed to toggle visibility:', err);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      showCustomAlert(t('save_failed'), 'error');
    }
  };

  const handleEditOfferClick = (offer) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

    setEditingOffer(offer);
    setFormIcon(offer.icon || '☕️');

    // Parse base name by removing stamp pattern e.g. " X+Y" if present at the end
    let baseName = offer.name || '';
    const payCount = offer.pay_count ? parseInt(offer.pay_count) : 0;
    const totalCount = parseInt(offer.total_count);
    if (payCount > 0 && totalCount > payCount) {
      const suffix = ` ${payCount}+${totalCount - payCount}`;
      if (baseName.endsWith(suffix)) {
        baseName = baseName.substring(0, baseName.length - suffix.length);
      }
    }

    setFormName(baseName);
    setFormPrice(offer.price_ton != null ? String(offer.price_ton) : offer.price != null ? String(offer.price) : '');
    setFormPriceInstead(offer.price_instead != null ? String(offer.price_instead) : '');
    setFormPay(offer.pay_count != null ? String(offer.pay_count) : '');
    setFormGet(offer.total_count != null ? String(offer.total_count) : '');
    setFormDescription(offer.description || '');
    setFormContact(offer.contact || '');

    setIsAddOfferOpen(true);
    setIsAddOfferClosing(false);
  };

  const closeQR = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    setQrModalState(prev => ({ ...prev, isClosing: true }));
    setTimeout(() => {
      setQrModalState({ isOpen: false, isClosing: false, pass: null });
      setQrOtpToken(null);
      setQrOtpLoading(false);
      setQrOtpTimeLeft(100);
      setQrOtpStatus('active');
    }, 300);
  };

  const generatePassOtp = async (pass) => {
    if (!pass) return;
    setQrOtpLoading(true);
    setQrOtpToken(null);
    setQrOtpTimeLeft(100);
    setQrOtpStatus('active');
    
    // Resolve storeId with backward compatibility lookup
    const resolvedStoreId = pass.storeId || addedStores.find(s => s.name === pass.vendor)?.id;
    if (!resolvedStoreId) {
      console.warn("Could not resolve store ID for pass", pass);
      setQrOtpStatus('error');
      setQrOtpLoading(false);
      return;
    }

    try {
      const userId = tgUser?.id ? String(tgUser.id) : 'dev_buyer_1';
      const body = {
        user_id: userId,
        store_id: resolvedStoreId,
        pass_id: String(pass.id),
        current_balance: pass.current
      };
      
      const res = await fetch(`${API_BASE}/pass/generate-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!res.ok) throw new Error('Failed to generate OTP');
      const data = await res.json();
      if (data.status === 'ok' && data.token) {
        setQrOtpToken(data.token);
        setQrOtpTimeLeft(data.expires_in || 100);
      } else {
        throw new Error(data.detail || 'Failed to generate OTP token');
      }
    } catch (err) {
      console.error('OTP generation error:', err);
      setQrOtpStatus('error');
    } finally {
      setQrOtpLoading(false);
    }
  };

  // Countdown timer for active OTP QR Code
  useEffect(() => {
    if (qrOtpStatus !== 'active' || qrOtpTimeLeft <= 0) {
      if (qrOtpTimeLeft <= 0 && qrOtpStatus === 'active') {
        setQrOtpStatus('expired');
      }
      return;
    }

    const timer = setInterval(() => {
      setQrOtpTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setQrOtpStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [qrOtpStatus, qrOtpTimeLeft]);

  // Polling for redemption status of active OTP QR Code
  useEffect(() => {
    if (!qrOtpToken || qrOtpStatus !== 'active') return;

    let isSubscribed = true;
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/pass/check-otp/${qrOtpToken}`);
        if (!res.ok) throw new Error('Check OTP failed');
        const data = await res.json();
        
        if (!isSubscribed) return;
        
        if (data.status === 'scanned') {
          clearInterval(pollInterval);
          setQrOtpStatus('scanned');
          
          const newBalance = typeof data.new_balance === 'number' ? data.new_balance : 0;
          
          // Update the pass balance inside myPasses state
          setMyPasses(prevPasses => {
            return prevPasses.map(p => {
              if (qrModalState.pass && p.id === qrModalState.pass.id) {
                return { ...p, current: newBalance };
              }
              return p;
            });
          });

          // Рассчитываем количество списанных штампов
          const redeemedCount = (qrModalState.pass?.current - newBalance) > 0 ? (qrModalState.pass.current - newBalance) : 1;

          // Записываем списание в историю транзакций
          const newTx = {
            id: 'redeem_' + Date.now(),
            type: 'redeem',
            titleKey: qrModalState.pass?.nameKey || '',
            title: qrModalState.pass?.name || 'Pass',
            vendor: qrModalState.pass?.vendor || '',
            amount: null,
            items: `-${redeemedCount}`,
            unitKey: qrModalState.pass?.unitKey || 'pcs',
            date: new Date().toLocaleString(undefined, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp: Date.now(),
            isDemo: false
          };
          setHistoryTransactions(prev => [newTx, ...prev]);
          
          // Trigger success haptic
          const tg = window.Telegram?.WebApp;
          if (tg?.HapticFeedback) {
            tg.HapticFeedback.notificationOccurred('success');
          }
          
          // Auto close modal after 3 seconds
          setTimeout(() => {
            if (isSubscribed) {
              closeQR();
            }
          }, 3000);
          
        } else if (data.status === 'expired') {
          clearInterval(pollInterval);
          setQrOtpStatus('expired');
        }
      } catch (err) {
        console.warn('Error polling OTP status:', err);
      }
    }, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
    };
  }, [qrOtpToken, qrOtpStatus, qrModalState.pass?.id]);

  const handleOfferTouchStart = (e) => {
    const touch = e.touches[0];
    setOfferDragStartY(touch.clientY);
    setIsOfferDragging(true);
    setIsOfferSnapping(false);
  };

  const handleOfferTouchMove = (e) => {
    if (!isOfferDragging) return;
    const touch = e.touches[0];
    const diff = touch.clientY - offerDragStartY;
    if (diff > 0) {
      setOfferDragOffset(diff);
    } else {
      setOfferDragOffset(0);
    }
  };

  const handleOfferTouchEnd = () => {
    if (!isOfferDragging) return;
    setIsOfferDragging(false);
    if (offerDragOffset > 120) {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
      setIsAddOfferClosing(true);
      setTimeout(() => {
        setIsAddOfferOpen(false);
        setOfferDragOffset(0);
      }, 300);
    } else {
      setIsOfferSnapping(true);
      setOfferDragOffset(0);
      setTimeout(() => {
        setIsOfferSnapping(false);
      }, 300);
    }
  };

  const handleQrTouchStart = (e) => {
    const touch = e.touches[0];
    setQrDragStartY(touch.clientY);
    setIsQrDragging(true);
    setIsQrSnapping(false);
  };

  const handleQrTouchMove = (e) => {
    if (!isQrDragging) return;
    const touch = e.touches[0];
    const diff = touch.clientY - qrDragStartY;
    if (diff > 0) {
      setQrDragOffset(diff);
    } else {
      setQrDragOffset(0);
    }
  };

  const handleQrTouchEnd = () => {
    if (!isQrDragging) return;
    setIsQrDragging(false);
    if (qrDragOffset > 120) {
      closeQR();
      setTimeout(() => {
        setQrDragOffset(0);
      }, 300);
    } else {
      setIsQrSnapping(true);
      setQrDragOffset(0);
      setTimeout(() => {
        setIsQrSnapping(false);
      }, 300);
    }
  };

  const qrStyle = (isQrDragging || isQrSnapping) ? {
    transform: `translateY(${qrDragOffset}px)`,
    transition: isQrDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  } : {};

  const offerStyle = (isOfferDragging || isOfferSnapping) ? {
    transform: `translateY(${offerDragOffset}px)`,
    transition: isOfferDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
  } : {};

  const handleQrScanned = async (text) => {
    const tg = window.Telegram?.WebApp;
    
    // Check if the QR code represents a Single-Use dynamic pass OTP code
    if (text && text.startsWith('PASS_OTP_')) {
      if (role !== 'seller') {
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        showCustomAlert("Access denied: only merchants can scan customer cards.", "error");
        return;
      }
      
      if (!storeId) {
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        if (tg?.showAlert) {
          showCustomAlert(t('store_not_created'), 'error');
        } else {
          showCustomAlert(t('store_not_created'), 'error');
        }
        return;
      }
      
      try {
        const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
        const res = await fetch(`${API_BASE}/pass/redeem-otp?sold_by=${userId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_id: storeId,
            token: text
          })
        });
        
        const data = await res.json();
        
        if (res.ok && data.status === 'ok') {
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
          const successMsg = t('otp_scan_success', { balance: data.new_balance });
          showCustomAlert(successMsg, 'success');

          // Записываем списание в историю транзакций (для продавца)
          const newTx = {
            id: 'seller_redeem_' + Date.now(),
            type: 'seller_redeem',
            titleKey: 'redeem_stamp',
            title: 'Списание пасса',
            vendor: storeName || 'Мой магазин',
            amount: null,
            items: '-1',
            unitKey: 'pcs',
            date: new Date().toLocaleString(undefined, {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            }),
            timestamp: Date.now(),
            isDemo: false
          };
          setHistoryTransactions(prev => [newTx, ...prev]);
        } else {
          if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
          let errorMsg = t('otp_scan_expired');
          if (data.detail === 'wrong_store') {
            errorMsg = t('otp_scan_wrong_store');
          } else if (data.detail === 'expired_or_invalid') {
            errorMsg = t('otp_scan_expired');
          } else if (data.detail === 'already_scanned') {
            errorMsg = t('otp_scan_expired');
          } else if (data.detail === 'insufficient_balance') {
            errorMsg = t('otp_scan_insufficient_balance');
          }
          showCustomAlert(errorMsg, 'error');
        }
      } catch (err) {
        console.error('Failed to redeem OTP:', err);
        if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        const errorMsg = t('otp_scan_expired');
        showCustomAlert(errorMsg, 'error');
      }
      return;
    }

    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    
    // Check if the QR code represents a store to add (no role check to avoid stale closure issues)
    if (text && text.startsWith('Store_')) {
      const remainder = text.substring(6).trim();
      const parts = remainder.split('_');
      let storeId = remainder;
      let referrerId = null;
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        if (/^\d+$/.test(lastPart)) {
          referrerId = lastPart;
          storeId = parts.slice(0, -1).join('_');
        }
      }
      
      const storeToFind = STORES_DATA.find(s => s.id.toLowerCase() === storeId.toLowerCase() || s.name.toLowerCase() === storeId.toLowerCase());
      
      if (storeToFind) {
        setAddedStores(prevStores => {
          const alreadyAdded = prevStores.find(s => s.id === storeToFind.id);
          if (alreadyAdded) {
            const remainingStores = prevStores.filter(s => s.id !== storeToFind.id);
            showCustomAlert(t('store_already_added', { name: storeToFind.name }), 'warning');
            const updatedStore = { ...alreadyAdded, referred_by: referrerId };
            return [updatedStore, ...remainingStores];
          } else {
            showCustomAlert(t('new_store_added', { name: storeToFind.name }), 'success');
            const storeObj = { ...storeToFind, referred_by: referrerId };
            return [storeObj, ...prevStores];
          }
        });
        return;
      }

      // Query the backend dynamic store!
      try {
        const res = await fetch(`${API_BASE}/store/${storeId}`);
        if (!res.ok) throw new Error('Store not found on backend');
        const data = await res.json();
        
        if (data.status === 'ok' && data.store) {
          const fetchedStore = data.store;
          const newStore = {
            id: fetchedStore.id,
            name: fetchedStore.name,
            icon: fetchedStore.icon || '🏪',
            bg: 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300',
            accentColor: '#26A17B',
            isDynamic: true,
            sellerWallet: fetchedStore.seller_wallet || fetchedStore.sellerWallet || '',
            items: [], // Will fetch offers dynamically when selected
            referred_by: referrerId
          };

          setAddedStores(prevStores => {
            const alreadyAdded = prevStores.find(s => s.id === newStore.id);

            // Also sync the buyer's existing passes with the scanned store name/icon!
            setMyPasses(prevPasses => prevPasses.map(pass => {
              if (pass.storeId === newStore.id) {
                return {
                  ...pass,
                  vendor: newStore.name,
                  icon: pass.icon === 'coffee' ? 'coffee' : newStore.icon
                };
              }
              return pass;
            }));

            if (alreadyAdded) {
              const remainingStores = prevStores.filter(s => s.id !== newStore.id);
              showCustomAlert(t('store_already_added', { name: newStore.name }), 'warning');
              const updatedStore = { ...alreadyAdded, referred_by: referrerId };
              return [updatedStore, ...remainingStores];
            } else {
              showCustomAlert(t('new_store_added', { name: newStore.name }), 'success');
              return [newStore, ...prevStores];
            }
          });
        } else {
          throw new Error('Invalid store response');
        }
        return;
      } catch (err) {
        console.warn('Failed to load scanned store from backend:', err);
        const errDetail = err.message || String(err);
        const isDuckDns = API_BASE.includes('duckdns.org');
        const duckDnsWarning = isDuckDns ? t('duckdns_warning') : '';
        const errorMsg = t('scan_error', { storeId, errDetail, duckDnsWarningRu: duckDnsWarning });

        showCustomAlert(errorMsg, 'error');
        return;
      }
    }
    
    showCustomAlert(`Scanned QR: ${text}`, 'info');
  };

  const openScanner = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');

    if (tg && typeof tg.showScanQrPopup === 'function') {
      tg.showScanQrPopup(
        { text: role === 'buyer' ? t('scan_buyer_desc') : t('scan_seller_desc') },
        (text) => {
          handleQrScanned(text);
          tg.closeScanQrPopup();
          return true;
        }
      );
    } else {
      setIsScannerOpen(true);
    }
  };

  return (
    <div className={`max-w-md mx-auto h-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#121214] text-white' : 'bg-[#F4F5F9] text-gray-900'}`}>
      {/* Scrollable Container (contains both Header and Main Content) */}
      <div className={`flex-1 overflow-y-auto hide-scrollbar transition-all duration-300 ${isInputFocused ? 'pb-[70vh]' : 'pb-32'}`}>
        {/* Header */}
        <header 
          style={{ paddingTop: `calc(${safeAreaTop > 0 ? '2.25rem' : '1.25rem'} + ${safeAreaTop}px)` }}
          className="pb-2 px-6 flex justify-between items-center z-50 bg-inherit shrink-0"
        >
          <div className="flex items-center gap-3">
            <div 
              onMouseDown={startLongPress}
              onMouseUp={cancelLongPress}
              onMouseLeave={cancelLongPress}
              onTouchStart={startLongPress}
              onTouchEnd={cancelLongPress}
              onTouchMove={cancelLongPress}
              onContextMenu={(e) => e.preventDefault()}
              className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer shrink-0 select-none"
            >
              <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Кастомная кнопка кошелька — моментально отображает адрес без спиннера */}
            <div className="shrink-0 relative">
              {cachedWalletAddress ? (
                // Подключён: показываем адрес мгновенно
                <>
                  <button
                    onClick={() => {
                      setIsWalletMenuOpen(prev => !prev);
                      const tg = window.Telegram?.WebApp;
                      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                    }}
                    title="Нажмите для управления кошельком"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all shadow-sm border ${
                      isDark
                        ? 'bg-[#1E1E22] border-gray-700 text-white hover:border-[#26A17B] hover:text-[#26A17B]'
                        : 'bg-white border-gray-200 text-gray-900 hover:border-[#26A17B] hover:text-[#26A17B]'
                    } ${isWalletMenuOpen ? 'border-[#26A17B] text-[#26A17B]' : ''}`}
                  >
                    <Wallet size={13} className="text-[#26A17B] shrink-0" />
                    <span className="font-mono">{formatWalletAddress(cachedWalletAddress)}</span>
                  </button>

                  {/* Выпадающее меню управления кошельком */}
                  {isWalletMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setIsWalletMenuOpen(false)}
                      />
                      <div className="absolute top-full right-0 mt-2 w-48 rounded-2xl border overflow-hidden shadow-xl z-50 animate-slide-up origin-top-right backdrop-blur-xl bg-white/90 dark:bg-[#1E1E22]/90 border-gray-200/50 dark:border-gray-800/50 divide-y divide-gray-100 dark:divide-gray-800/50">
                        <button
                          onClick={handleCopyAddress}
                          className="w-full px-4 py-3 text-left text-sm font-medium transition-colors flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200"
                        >
                          {isCopied ? t('copied') : t('copy_address')}
                          {isCopied && <div className="w-1.5 h-1.5 rounded-full bg-[#26A17B]" />}
                        </button>
                        <button
                          onClick={() => {
                            setIsWalletMenuOpen(false);
                            tonConnectUI?.disconnect();
                          }}
                          className="w-full px-4 py-3 text-left text-sm font-medium transition-colors text-red-500 hover:bg-red-50/50 dark:hover:bg-red-500/10"
                        >
                          {t('disconnect_wallet')}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                // Не подключён: кнопка Connect Wallet без спиннера
                <button
                  onClick={() => tonConnectUI?.openModal()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all shadow-sm border ${
                    isDark
                      ? 'bg-[#1E1E22] border-gray-700 text-gray-400 hover:border-[#26A17B] hover:text-[#26A17B]'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-[#26A17B] hover:text-[#26A17B]'
                  }`}
                >
                  <Wallet size={13} className="shrink-0" />
                  <span>{t('connect')}</span>
                </button>
              )}
              {/* Индикатор верификации proof */}
              {cachedWalletAddress && (
                <div className="absolute -top-1 -right-1 pointer-events-none">
                  {isVerifying ? (
                    <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white dark:border-[#121214] animate-spin" style={{borderTopColor:'transparent'}} />
                  ) : walletVerified ? (
                    <div className="w-3 h-3 rounded-full bg-[#26A17B] border-2 border-white dark:border-[#121214] animate-pulse" title="Кошелёк верифицирован" />
                  ) : null}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                const appUrl = buildAppUrl();
                const tg = window.Telegram?.WebApp;
                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                shareTelegram(t('share_app_text'), appUrl);
              }}
              title={t('share_shop')}
              className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1E22] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-[#26A17B] transition shadow-sm shrink-0"
            >
              <Share2 size={18} />
            </button>
            <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1E22] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500 transition shadow-sm shrink-0">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>


        {/* Main Area Content Swapping */}
        <main className="pb-8">
        {activeTab === 'home' ? (
          <div className="animate-slide-up">
            {role === 'buyer' ? (
              <>
                {/* Carousel of owned passes at the top */}
                <section className="mt-6 mb-8">
                  <div className="px-6 mb-4 flex justify-between items-end">
                    <h2 className="text-xl font-bold">{t('my_cards')}</h2>
                    <span className="text-sm text-[#26A17B] font-medium">{t('active_count', { count: myPasses.length })}</span>
                  </div>
                  
                  <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 pb-4 gap-4">
                    {myPasses.length > 0 ? myPasses.map((pass) => {
                      const paletteColor = getPassColorByIndex(pass.id);
                      const cardColors = (pass.colors && pass.colors !== 'from-[#26A17B] to-[#1e7c5e]') ? pass.colors : paletteColor.colors;
                      const cardBtnColor = (pass.btnColor && pass.btnColor !== 'text-[#26A17B]') ? pass.btnColor : paletteColor.btnColor;
                      
                      // Resolve details for the back of the card
                      const passPrice = pass.price || (pass.nameKey === 'pass_cap' ? '10.00 ₮' : (pass.nameKey === 'pass_taco' ? '12.50 ₮' : (pass.nameKey === 'pass_boba' ? '15.00 ₮' : null)));
                      const passPriceInstead = pass.priceInstead || (pass.nameKey === 'pass_cap' ? '12.50 ₮' : null);
                      const passPayCount = pass.payCount || (pass.nameKey === 'pass_cap' ? 8 : (pass.nameKey === 'pass_taco' ? 4 : (pass.nameKey === 'pass_boba' ? 2 : null)));
                      const passTotal = pass.total;

                      return (
                        <div 
                          key={pass.id} 
                          className="snap-center shrink-0 w-[280px] h-[160px] perspective-1000 select-none"
                          onClick={() => setFlippedCardId(prev => prev === pass.id ? null : pass.id)}
                        >
                          <div className={`relative w-full h-full duration-500 preserve-3d ${flippedCardId === pass.id ? 'flipped' : ''}`}>
                            
                            {/* --- FRONT SIDE --- */}
                            <div className={`absolute inset-0 w-full h-full rounded-3xl bg-linear-to-br ${cardColors} p-5 flex flex-col justify-between overflow-hidden shadow-lg backface-hidden z-10`}>
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-5 rounded-full -ml-6 -mb-6 blur-lg"></div>
                              
                              {pass.isDemo && (
                                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md border border-white/30 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded shadow-md select-none z-30 tracking-widest rotate-12 scale-110">
                                  {t('demo_badge')}
                                </div>
                              )}
                              
                              <div className="flex justify-between items-start z-10">
                                <div>
                                  <span className="bg-white/20 text-white/90 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">{pass.vendor}</span>
                                  <h3 
                                    className="text-white font-bold text-lg mt-1.5 leading-snug overflow-hidden" 
                                    style={{ 
                                      display: '-webkit-box', 
                                      WebkitLineClamp: 2, 
                                      WebkitBoxOrient: 'vertical',
                                      wordBreak: 'break-word'
                                    }}
                                  >
                                    {t(pass.nameKey) || pass.name}
                                  </h3>
                                </div>
                                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                                  {pass.icon === 'coffee' ? <Coffee size={20} /> : <span className="text-xl">{pass.icon}</span>}
                                </div>
                              </div>
                              
                              <div className="z-10 w-full">
                                {pass.current === 0 ? (
                                  <>
                                    <div className="absolute bottom-5 left-5 max-w-[140px] flex flex-col text-left">
                                      <p className="text-white font-bold text-[13px] leading-tight flex items-center gap-1">
                                        {t('pass_fully_used_title')}
                                      </p>
                                      <p className="text-white/70 text-[9px] mt-0.5 leading-snug">
                                        {t('pass_fully_used_desc')}
                                      </p>
                                    </div>
                                    <div className="absolute bottom-5 right-5 flex items-center gap-1.5 z-20">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleBuyMore(pass); }}
                                        className={`h-8 px-3 rounded-full bg-white text-[11px] font-bold flex items-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer ${cardBtnColor}`}
                                      >
                                        <span>🛍️</span>
                                        <span>{t('buy_again')}</span>
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeletePass(pass); }}
                                        className="w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center backdrop-blur-md shadow-md hover:bg-white/25 active:scale-95 transition-all cursor-pointer"
                                        title={t('delete_card')}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="absolute bottom-5 left-5 text-left">
                                      <p className="text-white/70 text-xs mb-1">{t('left')}</p>
                                      <p className="text-white font-bold text-2xl leading-none">
                                        {pass.current} <span className="text-sm font-medium text-white/70">/ {pass.total} {t(pass.unitKey)}</span>
                                      </p>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); openQR(pass); }} 
                                      className={`absolute bottom-5 right-5 w-10 h-10 bg-white rounded-full flex items-center justify-center ${cardBtnColor} hover:scale-105 transition-transform shadow-md cursor-pointer z-20`}
                                    >
                                      <QrCode size={20} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* --- BACK SIDE --- */}
                            <div className={`absolute inset-0 w-full h-full rounded-3xl bg-linear-to-br ${cardColors} px-5 pt-4 pb-3 flex flex-col justify-between overflow-hidden shadow-lg backface-hidden rotate-y-180 z-10`}>
                              {/* Premium glassmorphic frosted overlay to make reverse side distinct but visually related */}
                              <div className="absolute inset-0 bg-white/25 dark:bg-black/35 backdrop-blur-[1px] z-0"></div>
                              
                              <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                              <div className="absolute bottom-0 left-0 w-20 h-20 bg-white opacity-5 rounded-full -ml-6 -mb-6 blur-lg"></div>
                              
                              <div className="z-10 flex flex-col h-full w-full justify-between">
                                <div className="flex justify-between items-start">
                                  <div className="min-w-0 flex-1 pr-2">
                                    {pass.isDemo ? (
                                      <span className="bg-white/20 text-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">{pass.vendor}</span>
                                    ) : (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const sid = pass.storeId;
                                          const storeUrl = (sid && !sid.startsWith('demo'))
                                            ? buildAppUrl(sid)
                                            : buildAppUrl();
                                          const text = `🏪 "${pass.vendor}" ${t('share_store_text')}`;
                                          const tg = window.Telegram?.WebApp;
                                          if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                                          shareTelegram(text, storeUrl);
                                        }}
                                        className="flex items-center gap-1 bg-white/15 hover:bg-white/25 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm active:scale-95 transition-all cursor-pointer"
                                        title={t('share_shop')}
                                      >
                                        <Share2 size={10} />
                                        <span>{t('share_shop')}</span>
                                      </button>
                                    )}
                                  </div>
                                  {/* Info button (i) in place of the category icon */}
                                  <button 
                                    onClick={async (e) => { 
                                      e.stopPropagation(); 
                                      if (pass.isDemo) {
                                        showCustomAlert(t('demo_pass_description'), 'info', t(pass.nameKey) || pass.vendor);
                                        return;
                                      }
                                      let freshDesc = pass.description;
                                      let freshContact = pass.contact;
                                      
                                      if (pass.storeId && pass.offerId) {
                                        try {
                                          const res = await fetch(`${API_BASE}/store/${pass.storeId}/offers`);
                                          if (res.ok) {
                                            const data = await res.json();
                                            if (data.status === 'ok' && data.offers) {
                                              const matchingOffer = data.offers.find(o => o.id === pass.offerId);
                                              if (matchingOffer) {
                                                freshDesc = matchingOffer.description || '';
                                                freshContact = matchingOffer.contact || '';
                                                
                                                // Update local state so it saves to localStorage & syncs to backend
                                                setMyPasses(prev => prev.map(p => p.id === pass.id ? { 
                                                  ...p, 
                                                  description: freshDesc, 
                                                  contact: freshContact 
                                                } : p));
                                              }
                                            }
                                          }
                                        } catch (err) {
                                          console.warn('Failed to fetch fresh pass details:', err);
                                        }
                                      }
                                      
                                      const desc = freshDesc || t('no_description_provided');
                                      const contact = freshContact || t('no_contact_provided');
                                      const msg = `${desc}\n\n📞 ${t('contact_label')}: ${contact}`;
                                      showCustomAlert(msg, 'info', t(pass.nameKey) || pass.name); 
                                    }} 
                                    className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-sm shrink-0 hover:bg-white/25 active:scale-95 transition-all cursor-pointer z-20"
                                    title={t('info')}
                                  >
                                    <Info size={16} />
                                  </button>
                                </div>

                                <div className="flex justify-between items-center mt-1">
                                  {/* Left part: large Cost / Price block */}
                                  <div>
                                    <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-0.5">{t('price_label')}</p>
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-2xl font-black text-white tracking-tight">{passPrice}</span>
                                      {passPriceInstead && (
                                        <span className="line-through text-white/40 text-xs font-medium">{passPriceInstead}</span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Right part: Schema / Formula details */}
                                  {passPayCount && (
                                    <div className="absolute bottom-[58px] right-5 text-right z-10">
                                      <p className="text-[9px] text-white/60 font-bold uppercase tracking-wider mb-0.5">{t('formula')}</p>
                                      <p className="text-sm font-black text-white leading-none">{passPayCount} + {passTotal - passPayCount}</p>
                                    </div>
                                  )}
                                </div>

                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    handleDeletePass(pass); 
                                  }} 
                                  className="absolute bottom-5 right-5 w-8 h-8 rounded-full bg-white/15 text-white flex items-center justify-center backdrop-blur-md hover:bg-white/25 hover:text-red-300 active:scale-95 transition-all cursor-pointer z-20"
                                  title={t('delete_card')}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    }) : (
                      <div className="snap-center shrink-0 w-[calc(100vw-48px)] max-w-[340px]">
                        <div className="relative h-[160px] rounded-3xl overflow-hidden flex flex-col items-center justify-center gap-2 px-6"
                          style={{
                            background: 'linear-gradient(135deg, rgba(38,161,123,0.08) 0%, rgba(99,102,241,0.08) 50%, rgba(236,72,153,0.08) 100%)',
                            border: '1.5px solid rgba(255,255,255,0.08)',
                            backdropFilter: 'blur(12px)'
                          }}
                        >
                          <div className="absolute top-2 left-4 text-2xl opacity-30 animate-bounce" style={{animationDelay:'0s',animationDuration:'2.5s'}}>✨</div>
                          <div className="absolute bottom-3 right-5 text-xl opacity-20 animate-bounce" style={{animationDelay:'1s',animationDuration:'3s'}}>🎟️</div>
                          <div className="absolute top-4 right-8 text-lg opacity-15 animate-bounce" style={{animationDelay:'0.5s',animationDuration:'2s'}}>💳</div>
                          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 text-center relative z-10">{t('no_passes_empty_title')}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-600 text-center leading-relaxed relative z-10 max-w-[220px]">{t('no_passes_empty_desc')}</p>
                        </div>
                      </div>
                    )}
                    <div className="snap-center shrink-0 w-2"></div>
                  </div>
                </section>

                {selectedStore === null ? (
                  /* Stores list view */
                  <section className="px-6 animate-slide-up">
                    <div className="flex justify-between items-end mb-5">
                      <h2 className="text-xl font-bold">{t('my_stores')}</h2>
                      <span className="text-sm text-[#26A17B] font-medium">{t('active_count', { count: addedStores.length })}</span>
                    </div>
                    
                    <div className="space-y-4">
                      {addedStores.length === 0 ? (
                        <div className="relative rounded-3xl overflow-hidden p-7 flex flex-col items-center gap-3"
                          style={{
                            background: 'linear-gradient(135deg, rgba(38,161,123,0.06) 0%, rgba(99,102,241,0.06) 100%)',
                            border: '1.5px dashed rgba(38,161,123,0.3)',
                          }}
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-3xl opacity-40 animate-bounce" style={{animationDelay:'0s',animationDuration:'2s'}}>🏪</span>
                            <span className="text-2xl opacity-30 animate-bounce" style={{animationDelay:'0.4s',animationDuration:'2.4s'}}>✨</span>
                            <span className="text-3xl opacity-40 animate-bounce" style={{animationDelay:'0.8s',animationDuration:'2.8s'}}>🛍️</span>
                          </div>
                          <p className="text-base font-bold text-gray-500 dark:text-gray-400 text-center">{t('no_stores_empty_title')}</p>
                          <p className="text-sm text-gray-400 dark:text-gray-600 text-center leading-relaxed max-w-[240px]">{t('no_stores_empty_desc')}</p>
                          <div className="mt-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                            style={{background:'rgba(38,161,123,0.10)', border:'1px solid rgba(38,161,123,0.2)'}}
                          >
                            <ScanLine size={13} className="text-[#26A17B]" />
                            <span className="text-xs font-semibold text-[#26A17B]">QR scan</span>
                          </div>
                        </div>
                      ) : (
                        addedStores.map((store) => {
                          const productsList = store.items ? store.items.map(item => t(item.nameKey || item.name || '')).join(', ') : '';
                          return (
                            <div 
                              key={store.id} 
                              onClick={() => {
                                const tg = window.Telegram?.WebApp;
                                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                                setSelectedStore(store);
                              }}
                              className="bg-white dark:bg-[#1E1E22] rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-4 cursor-pointer hover:border-[#26A17B]/40 active:scale-[0.99] transition-all relative overflow-hidden group animate-fade-in"
                            >
                              <div className="absolute top-0 right-0 w-24 h-24 bg-[#26A17B]/5 dark:bg-[#26A17B]/2 rounded-full blur-xl -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500"></div>

                              <div className={`w-14 h-14 ${store.bg || 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'} rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0 transform group-hover:scale-105 transition-transform`}>
                                {store.icon || '🏪'}
                              </div>

                              <div className="flex-1 min-w-0 z-10">
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white leading-tight mb-1 group-hover:text-[#26A17B] transition-colors">{store.name}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium truncate max-w-[200px]">
                                  {productsList}
                                </p>
                              </div>

                              <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-tr from-gray-50 to-white dark:from-[#1E1E22] dark:to-[#25252b] border border-gray-150 dark:border-gray-800/80 text-gray-400 group-hover:text-white group-hover:bg-linear-to-r group-hover:from-[#26A17B] group-hover:to-[#22cf9c] group-hover:border-transparent group-hover:shadow-[0_4px_12px_rgba(38,161,123,0.3)] active:scale-90 transition-all duration-300 shadow-xs">
                                <ChevronRight size={16} className="stroke-[2.5] group-hover:translate-x-0.5 transition-transform duration-350 ease-out" />
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                ) : (
                  /* Storefront Detail View */
                  <div className="animate-slide-up">
                    <div className="px-6 mb-4 flex items-center">
                      <button 
                        onClick={() => {
                          const tg = window.Telegram?.WebApp;
                          if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                          setSelectedStore(null);
                        }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md bg-white/75 dark:bg-[#1E1E22]/75 border border-gray-200/50 dark:border-gray-800/40 text-gray-500 hover:text-[#26A17B] dark:text-gray-400 dark:hover:text-[#26A17B] hover:border-[#26A17B]/30 dark:hover:border-[#26A17B]/30 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(38,161,123,0.12)] active:scale-95 transition-all duration-300 group cursor-pointer"
                      >
                        <ChevronLeft size={16} className="text-gray-450 group-hover:text-[#26A17B] group-hover:-translate-x-0.5 transition-all duration-300 shrink-0" />
                        <span className="text-[10px] font-extrabold uppercase tracking-wider leading-none">{t('back_to_list')}</span>
                      </button>
                    </div>

                    <div className="mx-6 mb-6 rounded-3xl p-5 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-[#1E1E22] dark:to-[#121214] relative overflow-hidden shadow-md flex items-center gap-4 border border-white/5">
                      <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-[#26A17B]/10 rounded-full blur-xl"></div>
                      <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>

                      {/* Subtle dismiss ✕ in the top-right corner */}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          const tg = window.Telegram?.WebApp;
                          const performRemove = () => {
                            setAddedStores(prev => prev.filter(s => s.id !== selectedStore.id));
                            setSelectedStore(null);
                            if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                          };
                          if (selectedStore.isDemo) {
                            performRemove();
                            return;
                          }
                          const confirmMessage = t('remove_store_confirm');
                          const confirmed = await showCustomConfirmAsync(confirmMessage);
                          if (confirmed) performRemove();
                          if (false) {
                            // removed
                          } else {
                            // removed
                          }
                        }}
                        className="absolute top-3 right-3 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/16 text-white/40 hover:text-white/80 transition-all active:scale-90 cursor-pointer"
                        title={t('remove_store_confirm')}
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>

                      {/* Share Store button — bottom-right corner */}
                      {!selectedStore.isDemo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const storeUrl = buildAppUrl(selectedStore.id);
                            const text = `🏪 "${selectedStore.name}" ${t('share_store_text')}`;
                            const tg = window.Telegram?.WebApp;
                            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                            shareTelegram(text, storeUrl);
                          }}
                          className="absolute bottom-3 right-3 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-white hover:bg-white/90 text-gray-900 shadow-sm transition-all active:scale-90 cursor-pointer"
                          title={t('share_shop')}
                        >
                          <Share2 size={12} strokeWidth={2.5} />
                        </button>
                      )}
                      
                      <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl shrink-0 border border-white/10">
                        {selectedStore.icon || '🏪'}
                      </div>
                      <div className="z-10 flex-1 min-w-0">
                        <h2 className="text-white font-bold text-xl mb-0.5 leading-tight truncate">{selectedStore.name}</h2>
                        <p className="text-xs text-white/60 font-medium">{t('exclusive_passes')}</p>
                      </div>
                    </div>

                    <section className="px-6 pb-24">
                      <h3 className="text-lg font-bold mb-4">{t('marketplace')}</h3>
                      
                      {isStoreOffersLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                          <div className="w-10 h-10 border-4 border-[#26A17B]/20 border-t-[#26A17B] rounded-full animate-spin"></div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Loading offers...</p>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-2 gap-3">
                            {(selectedStore.items || []).map((item) => {
                              const cleanCompare = (a, b) => (a || '').replace(/\s+\d+\+\d+$/, '') === (b || '').replace(/\s+\d+\+\d+$/, '');
                              
                              const hasActivePass = myPasses.some(p => 
                                p.vendor === selectedStore.name && 
                                (p.offerId === item.id || cleanCompare(p.name, item.name)) && 
                                p.current > 0
                              );

                              const handleBuyPass = async (e) => {
                                if (e) e.stopPropagation();
                                if (item.isDemo || selectedStore.isDemo) {
                                  showCustomAlert(t('demo_pass_description'), 'info', t(item.nameKey) || item.name);
                                  return;
                                }
                                const tg = window.Telegram?.WebApp;
                                
                                // 1. Проверяем привязку кошелька покупателя
                                if (!cachedWalletAddress) {
                                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
                                  showCustomAlert(t('wallet_required_to_buy'), 'warning');
                                  return;
                                }

                                // 1.5. Проверяем, завершил ли TonConnect восстановление соединения
                                if (!isConnectionRestored) {
                                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
                                  showCustomAlert(t('wallet_connecting_playful'), 'warning');
                                  return;
                                }

                                // 2. Проверяем, нет ли уже активного пасса
                                if (hasActivePass) {
                                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
                                  showCustomAlert(t('pass_already_purchased_alert'), 'warning');
                                  return;
                                }

                                // 3. Проверяем наличие кошелька продавца
                                const sellerRawWallet = selectedStore.sellerWallet;
                                if (!sellerRawWallet) {
                                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                                  showCustomAlert(t('seller_wallet_missing'), 'error');
                                  return;
                                }

                                // 4. Конвертируем адрес продавца в user-friendly формат
                                let sellerFriendlyAddress;
                                try {
                                  sellerFriendlyAddress = sellerRawWallet.includes(':')
                                    ? toUserFriendlyAddress(sellerRawWallet, false)
                                    : sellerRawWallet;
                                } catch (addrErr) {
                                  console.error('Failed to convert seller address:', addrErr);
                                  showCustomAlert(`${t('payment_failed')} (Seller Addr: ${addrErr.message || addrErr})`, 'error');
                                  return;
                                }

                                // 5. Конвертируем адрес покупателя в user-friendly формат
                                let buyerFriendlyAddress;
                                try {
                                  buyerFriendlyAddress = cachedWalletAddress.includes(':')
                                    ? toUserFriendlyAddress(cachedWalletAddress, false)
                                    : cachedWalletAddress;
                                } catch (addrErr) {
                                  console.error('Failed to convert buyer address:', addrErr);
                                  showCustomAlert(`${t('payment_failed')} (Buyer Addr: ${addrErr.message || addrErr})`, 'error');
                                  return;
                                }

                                // 6. Расчёт сумм сплит-платежа в BigInt (USDT decimals = 6)
                                const totalMicro = BigInt(Math.round(item.priceVal * 1_000_000));
                                const sellerAmount = totalMicro * 99n / 100n;
                                const devAmount = totalMicro - sellerAmount;

                                // 7. Показываем процесс оплаты
                                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');

                                try {
                                  // 8. Получаем адрес USDT Jetton-кошелька покупателя
                                  const buyerJettonWalletRaw = await getJettonWalletAddress(buyerFriendlyAddress);
                                  
                                  // Конвертируем адрес Jetton-кошелька покупателя в user-friendly формат (UQ...)
                                  const buyerJettonWallet = toUserFriendlyAddress(buyerJettonWalletRaw, false);

                                  // 9. Собираем два TEP-74 payload для сплит-платежа
                                  const payloadSeller = buildJettonTransferPayload(
                                    sellerAmount,
                                    sellerFriendlyAddress,
                                    buyerFriendlyAddress
                                  );
                                  const payloadDev = buildJettonTransferPayload(
                                    devAmount,
                                    DEVELOPER_WALLET,
                                    buyerFriendlyAddress
                                  );

                                  // 10. Отправляем batch-транзакцию через TonConnect (два сообщения)
                                  const txResult = await tonConnectUI.sendTransaction({
                                    validUntil: Math.floor(Date.now() / 1000) + 300, // 5 минут на подтверждение
                                    messages: [
                                      {
                                        address: buyerJettonWallet,
                                        amount: GAS_AMOUNT,
                                        payload: payloadSeller
                                      },
                                      {
                                        address: buyerJettonWallet,
                                        amount: GAS_AMOUNT,
                                        payload: payloadDev
                                      }
                                    ]
                                  });

                                  // 11. Транзакция успешна (BOC получен) — записываем покупку
                                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

                                  const rawItemName = item.nameKey ? t(item.nameKey) : (item.name || 'Pass');
                                  const itemName = rawItemName.replace(/\s+\d+\+\d+$/, '');

                                  const basePasses = myPasses.filter(p => !(p.vendor === selectedStore.name && (p.nameKey === item.nameKey || p.name === item.name) && p.current === 0));

                                  const newPass = {
                                    id: Date.now(),
                                    vendor: selectedStore.name,
                                    nameKey: item.nameKey || '',
                                    name: (item.name || '').replace(/\s+\d+\+\d+$/, ''),
                                    icon: item.icon === '☕️' ? 'coffee' : item.icon,
                                    current: item.total,
                                    total: item.total,
                                    unitKey: item.unitKey || 'pcs',
                                    colors: item.colors || ['from-emerald-500', 'to-teal-600'],
                                    btnColor: item.btnColor || 'bg-emerald-500 text-white',
                                    theme: item.theme || 'emerald',
                                    isDynamic: selectedStore.isDynamic || false,
                                    storeId: selectedStore.isDynamic ? selectedStore.id : null,
                                    offerId: selectedStore.isDynamic ? item.id : null,
                                    price: item.price || null,
                                    priceInstead: item.priceInstead || null,
                                    payCount: item.payCount || null,
                                    description: item.description || '',
                                    contact: item.contact || ''
                                  };
                                  const updatedPasses = [newPass, ...basePasses];
                                  setMyPasses(updatedPasses);

                                  // Записываем покупку в историю транзакций
                                  const newTx = {
                                    id: 'purchase_' + Date.now(),
                                    type: 'purchase',
                                    titleKey: item.nameKey || '',
                                    title: item.name || 'Pass',
                                    vendor: selectedStore.name,
                                    amount: `-${item.priceVal ? item.priceVal.toFixed(2) : (item.price || '0.00').replace(/[^\d.]/g, '')} USDT`,
                                    items: `+${item.total}`,
                                    unitKey: item.unitKey || 'pcs',
                                    date: new Date().toLocaleString(undefined, {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }),
                                    timestamp: Date.now(),
                                    isDemo: false
                                  };
                                  setHistoryTransactions(prev => [newTx, ...prev]);

                                  // Записываем продажу на бэкенде
                                  if (selectedStore.isDynamic && item.id) {
                                    const referrer = selectedStore?.referred_by || null;
                                    const url = referrer ? `${API_BASE}/buy-offer/${item.id}?sold_by=${referrer}` : `${API_BASE}/buy-offer/${item.id}`;
                                    fetch(url, { method: 'POST' })
                                      .catch(err => console.warn('Failed to record buy-offer:', err));
                                  }

                                  showCustomAlert(t('pass_bought', { name: itemName }), 'success');

                                } catch (txError) {
                                  console.error('Payment transaction failed:', txError);
                                  
                                  // Определяем тип ошибки
                                  const errorMessage = String(txError?.message || txError || '').toLowerCase();
                                  
                                  if (errorMessage.includes('cancel') || errorMessage.includes('reject') || errorMessage.includes('closed') || errorMessage.includes('abort')) {
                                    // Пользователь отменил транзакцию в кошельке
                                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');
                                    showCustomAlert(t('payment_cancelled'), 'warning');
                                  } else if (errorMessage.includes('insufficient') || errorMessage.includes('balance') || errorMessage.includes('not enough')) {
                                    // Недостаточно средств
                                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                                    showCustomAlert(t('insufficient_usdt'), 'error');
                                  } else {
                                    // Другая ошибка
                                    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                                    showCustomAlert(`${t('payment_failed')}: ${txError?.message || txError || 'Unknown error'}`, 'error');
                                  }
                                }
                              };

                              // Suffix-stripped name for rendering
                              const displayName = (item.nameKey ? t(item.nameKey) : (item.name || 'Pass')).replace(/\s+\d+\+\d+$/, '');

                              return (
                                <div 
                                  key={item.id} 
                                  onClick={hasActivePass ? handleBuyPass : undefined}
                                  className={`bg-white dark:bg-[#1E1E22] rounded-3xl p-4 border shadow-sm flex flex-col items-center text-center relative overflow-hidden transition-all duration-300 animate-fade-in ${
                                    hasActivePass 
                                      ? 'cursor-pointer border-[#26A17B]/10 hover:border-[#26A17B]/20 active:scale-[0.99]' 
                                      : 'border-gray-200 dark:border-gray-800 hover:border-[#26A17B]/40 cursor-default'
                                  }`}
                                >
                                  {/* Absolute vendor label */}
                                  <div className={`absolute top-3 left-3 max-w-[calc(100%-60px)] px-2.5 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-850 text-[10px] font-bold text-gray-500 dark:text-gray-400 text-left break-words whitespace-normal transition-opacity duration-300 ${hasActivePass ? 'opacity-40' : ''}`}>
                                    {selectedStore.name}
                                  </div>

                                  {item.isDemo && (
                                    <div className="absolute top-3 right-3 bg-[#26A17B] text-white font-black text-[9px] uppercase px-2 py-0.5 rounded shadow-sm select-none z-30 tracking-widest rotate-12 scale-110">
                                      {t('demo_badge')}
                                    </div>
                                  )}

                                  {hasActivePass ? (
                                    /* 100% Bright, non-transparent green active badge with pure white text and pulsing dot */
                                    <div className="absolute top-3 right-3 bg-[#26A17B] text-white text-[9px] font-black px-2.5 py-0.75 rounded-full shadow-sm flex items-center gap-1 z-20 select-none">
                                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0"></span>
                                      <span>{t('pass_active_badge')}</span>
                                    </div>
                                  ) : (item.payCount && item.payCount > 0 && !item.isDemo) ? (
                                    <div className="absolute top-3 right-3 bg-[#26A17B] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                      {item.payCount}+{item.total - item.payCount}
                                    </div>
                                  ) : null}

                                  {/* Faded Inner Card Content Container */}
                                  <div className={`flex flex-col items-center w-full h-full mt-6 transition-all duration-300 ${hasActivePass ? 'opacity-40 saturate-50' : ''}`}>
                                    <div className="w-16 h-16 bg-gray-50 dark:bg-[#121214] border border-gray-100 dark:border-gray-850 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner shrink-0">
                                      {item.icon}
                                    </div>

                                    <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                                      {displayName}
                                    </h4>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{item.total} {t(item.unitKey || 'pcs')}</p>

                                    <div className="mt-auto w-full flex flex-col items-center gap-1">
                                      {item.priceInsteadVal && item.priceInsteadVal > item.priceVal ? (
                                        <div className="flex items-center gap-1 text-xs mb-0.5">
                                          <span className="text-gray-400 dark:text-gray-500 line-through text-[11px] font-semibold">{item.priceInstead}</span>
                                          <span className="bg-red-500/10 text-red-500 text-[9px] font-extrabold px-1 rounded-sm">
                                            -{Math.round((1 - item.priceVal / item.priceInsteadVal) * 100)}%
                                          </span>
                                        </div>
                                      ) : null}
                                      <div className="flex items-center gap-1.5 w-full mt-0.5">
                                        <button 
                                          onClick={handleBuyPass}
                                          className="flex-1 py-2.5 border rounded-2xl font-bold text-sm bg-gray-50 hover:bg-[#26A17B]/10 dark:bg-[#121214] dark:hover:bg-[#26A17B]/20 border-gray-200 dark:border-gray-800 text-[#26A17B] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                                        >
                                          {item.price}
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            if (e) e.stopPropagation();
                                            const desc = item.description || t('no_description_provided');
                                            const contact = item.contact || t('no_contact_provided');
                                            const msg = `${desc}\n\n📞 ${t('contact_label')}: ${contact}`;
                                            showCustomAlert(msg, 'info', t(item.nameKey) || item.name);
                                          }}
                                          className="p-1 shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
                                        >
                                          <Info size={20} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {(!selectedStore.items || selectedStore.items.length === 0) && (
                            <div className="text-center py-10 bg-white dark:bg-[#1E1E22] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm text-gray-500 dark:text-gray-400 text-sm">
                              <div className="flex flex-col items-center gap-2 py-4">
                                <span className="text-3xl animate-bounce mb-1">⏳</span>
                                <p className="font-bold text-gray-800 dark:text-gray-200 text-sm leading-relaxed max-w-[280px] mx-auto">
                                  {t('store_inventory_notice')}
                                </p>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  </div>
                )}
              </>
            ) : (
              /* ============================================================================== */
              /* НОВАЯ СТРАНИЦА ПРОДАВЦА: СПИСОК НАШИХ МАГАЗИНОВ (Вкладка Layers / Home)       */
              /* ============================================================================== */
              !isManagingSingleStore ? (
                <section className="px-6 mt-6 animate-slide-up">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{t('my_stores')}</h2>
                  <button 
                    onClick={() => {
                      const tg = window.Telegram?.WebApp;
                      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
                      loadSellerStores(userId, storeId);
                    }}
                    disabled={isSellerStoresLoading}
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-[#26A17B] active:scale-90 transition-all cursor-pointer ${isSellerStoresLoading ? 'animate-spin text-[#26A17B]' : ''}`}
                    title={t('refresh_list')}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>

                {/* Кнопка создания нового магазина */}
                <button
                  onClick={() => {
                    const tg = window.Telegram?.WebApp;
                    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                    // Сбрасываем ID, чтобы открылась чистая форма создания нового магазина
                    setStoreId(null);
                    setStoreName('');
                    setStoreIcon('🏪');
                    setStoreIconDraft('🏪');
                    setStoreNameDraft('');
                    setSellerOffers([]);
                    setIsEditingStoreName(true); // Сразу открываем режим редактирования!
                    setIsManagingSingleStore(true); // Открываем управление магазином
                  }}
                  className="w-full mb-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-5 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1E1E22] transition-colors bg-transparent text-center active:scale-[0.99]"
                >
                  <PlusCircle size={28} className="mx-auto mb-2 text-[#26A17B]" />
                  <span className="font-bold text-sm">{t('add_new_store')}</span>
                </button>

                {/* Список карточек магазинов */}
                {isSellerStoresLoading && sellerStores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                    <span className="animate-spin text-2xl mb-2">⏳</span>
                    <p className="text-sm">{t('loading_stores')}</p>
                  </div>
                ) : sellerStores.length === 0 ? (
                  <div className="text-center py-10 bg-white dark:bg-[#1E1E22] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs text-gray-500 dark:text-gray-400 text-sm">
                    {t('no_stores_created')}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {sellerStores.map((store) => {
                      const storeOffers = store.offers || [];
                      const totalRevenue = storeOffers.reduce((sum, off) => {
                        const accRev = off.accumulated_revenue !== undefined ? off.accumulated_revenue : ((off.sold ?? 0) * (off.price_ton ?? 0));
                        return sum + Number(accRev);
                      }, 0);
                      
                      return (
                        <div key={store.id} className="bg-white dark:bg-[#1E1E22] rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm relative overflow-hidden flex flex-col transition-all hover:shadow-md animate-fade-in">
                          {/* Шапка карточки магазина */}
                          <div className="flex justify-between items-start mb-4 gap-2">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Кнопка Куар-кода в верхнем левом углу, размером с иконку магазина */}
                              <button
                                onClick={() => {
                                  const tg = window.Telegram?.WebApp;
                                  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                                  setStoreId(store.id);
                                  setStoreName(store.name);
                                  setStoreIcon(store.icon);
                                  setShareStoreModalOpen(true);
                                  setShareStoreModalClosing(false);
                                }}
                                className="w-12 h-12 shrink-0 rounded-2xl bg-gray-50 dark:bg-gray-800 text-[#26A17B] border border-gray-200 dark:border-gray-700/60 flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                                title={t('share_qr')}
                              >
                                <QrCode size={20} className="stroke-[2.2]" />
                              </button>

                              <span className="text-3xl shrink-0 leading-none">{store.icon || '🏪'}</span>
                              <div className="min-w-0 flex-1">
                                <h3 className="font-bold text-base text-gray-900 dark:text-white truncate pr-1">{store.name}</h3>
                                <div className="flex items-center flex-wrap gap-2 mt-0.5">
                                  <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                                    {t('passes_count', { count: storeOffers.length })}
                                  </p>
                                  {isStaffStore(store.id) && (
                                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 select-none">
                                      {t('staff_mode_label')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {/* Кнопка удалить */}
                              {!isStaffStore(store.id) && (
                                <button
                                  onClick={async () => {
                                    const tg = window.Telegram?.WebApp;
                                    const confirmed = await showCustomConfirmAsync(t('delete_store_confirm'));
                                    if (!confirmed) return;
                                    
                                    try {
                                      const res = await fetch(`${API_BASE}/delete-store/${store.id}`, { method: 'POST' });
                                      if (!res.ok) throw new Error('delete failed');
                                      const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
                                      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                                      await loadSellerStores(userId);
                                    } catch (e) {
                                      console.warn(e);
                                      showCustomAlert(t('delete_store_failed'), 'error');
                                    }
                                  }}
                                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-650 transition-colors cursor-pointer"
                                  title={t('delete_store')}
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Выручка заведения или личные продажи сотрудника */}
                          {isStaffStore(store.id) ? (
                            (() => {
                              const myRecord = (staffMembers[store.id] || []).find(m => String(m.user_id) === String(tgUser?.id || 'dev_seller_1'));
                              const mySales = myRecord ? myRecord.total_sales : 0.0;
                              const myRedemptions = myRecord ? myRecord.total_redemptions : 0;
                              return (
                                <div className="mb-4 bg-blue-50/50 dark:bg-blue-500/5 px-3 py-2 rounded-2xl border border-blue-100/30 dark:border-blue-500/10 flex flex-col gap-1.5">
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">{t('my_sales')}</span>
                                    <span className="font-bold text-blue-500">{mySales.toFixed(2)} ₮</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs">
                                    <span className="font-semibold text-gray-500 dark:text-gray-400">{t('my_redemptions')}</span>
                                    <span className="font-bold text-[#26A17B]">{myRedemptions} шт.</span>
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="mb-4 bg-emerald-50/50 dark:bg-emerald-500/5 px-3 py-2 rounded-2xl border border-emerald-100/30 dark:border-emerald-500/10 flex justify-between items-center">
                              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('total_revenue')}</span>
                              <span className="font-extrabold text-sm text-[#26A17B]">{totalRevenue.toFixed(2)} ₮</span>
                            </div>
                          )}

                          {/* Статистика по пассам */}
                          {storeOffers.length > 0 ? (
                            <div className="space-y-2 mb-4 max-h-[140px] overflow-y-auto hide-scrollbar pr-1">
                              {storeOffers.map(off => (
                                <div key={off.id} className="flex justify-between items-center text-xs border-b border-gray-50 dark:border-gray-850/30 pb-1.5">
                                  <span className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[150px]">{off.name}</span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-gray-450">{t('sold_count_small', { count: off.sold ?? 0 })}</span>
                                    <span className="font-bold text-gray-900 dark:text-white">{off.price_ton ?? 0} ₮</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-450 italic mb-4">{t('no_offers_created')}</p>
                          )}

                          {/* Блок Команда (только для владельцев) */}
                          {!isStaffStore(store.id) && (
                            <div className="mb-4 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                              <div className="flex items-center justify-between px-3 py-2 bg-gray-50/80 dark:bg-gray-900/40">
                                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                  <span>👥</span> {t('staff_team')}
                                </span>
                                <button
                                  onClick={() => {
                                    const tg = window.Telegram?.WebApp;
                                    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                                    handleGenerateInvite(store.id);
                                  }}
                                  disabled={isGeneratingInvite}
                                  className="flex items-center gap-1 text-[11px] font-bold text-[#26A17B] hover:text-[#208a69] disabled:opacity-50 transition-colors cursor-pointer"
                                >
                                  <UserPlus size={12} />
                                  {t('add_staff')}
                                </button>
                              </div>
                              <div className="px-3 py-1.5">
                                {isStaffLoading ? (
                                  <p className="text-[11px] text-gray-400 py-1.5 text-center">⏳</p>
                                ) : (staffMembers[store.id] || []).length === 0 ? (
                                  <p className="text-[11px] text-gray-400 dark:text-gray-500 italic py-1.5">{t('no_staff_yet')}</p>
                                ) : (
                                  <div className="space-y-1.5 py-1">
                                    {(staffMembers[store.id] || []).map(member => (
                                      <div key={member.user_id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                          {member.username ? (
                                            <button
                                              onClick={() => {
                                                const tg = window.Telegram?.WebApp;
                                                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                                                const link = `https://t.me/${member.username}`;
                                                if (tg?.openTelegramLink) {
                                                  tg.openTelegramLink(link);
                                                } else {
                                                  window.open(link, '_blank');
                                                }
                                              }}
                                              className="text-[11px] font-bold text-[#26A17B] hover:text-[#208a69] hover:underline flex items-center gap-1 cursor-pointer transition-all active:scale-[0.98] bg-transparent border-none p-0 outline-none truncate"
                                            >
                                              @{member.username}
                                            </button>
                                          ) : (
                                            <div className="flex items-center gap-1.5 min-w-0">
                                              <button
                                                onClick={() => {
                                                  const tg = window.Telegram?.WebApp;
                                                  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                                                  const link = `tg://user?id=${member.user_id}`;
                                                  if (tg?.openTelegramLink) {
                                                    tg.openTelegramLink(link);
                                                  } else {
                                                    window.open(link, '_blank');
                                                  }
                                                }}
                                                className="text-[11px] font-semibold text-gray-750 dark:text-gray-300 hover:text-[#26A17B] hover:underline cursor-pointer truncate bg-transparent border-none p-0 outline-none transition-all active:scale-[0.98]"
                                              >
                                                ID {member.user_id}
                                              </button>
                                              <button
                                                onClick={() => {
                                                  const tg = window.Telegram?.WebApp;
                                                  if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                                                  navigator.clipboard.writeText(member.user_id);
                                                  showCustomAlert(t('id_copied_toast'), 'success');
                                                }}
                                                className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0 cursor-pointer"
                                                title={t('copy_id')}
                                              >
                                                <Copy size={10} />
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-[11px] font-bold text-[#26A17B]">{member.total_sales.toFixed(2)} ₮</span>
                                          <button
                                            onClick={() => handleFireStaff(store.id, member.user_id)}
                                            className="w-5 h-5 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
                                            title="Уволить"
                                          >
                                            <X size={11} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Кнопка "Добавить пасс" или "Посмотреть витрину" */}
                          <button
                            onClick={() => {
                              const tg = window.Telegram?.WebApp;
                              if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                              handleSelectActiveStore(store);
                              // Также загружаем сотрудников при открытии магазина
                              loadStaffMembers(store.id);
                              setIsEditingStoreName(false);
                              setIsManagingSingleStore(true); // Открываем управление магазином
                            }}
                            className="w-full py-2.5 rounded-2xl bg-[#26A17B] hover:bg-[#208a69] active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                          >
                            {isStaffStore(store.id) ? <Eye size={14} /> : <PlusCircle size={14} />}
                            <span>{isStaffStore(store.id) ? t('view_showcase') : t('add_pass_manage')}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

            ) : (
              <div className="animate-slide-up">
            <section className="px-6 mt-6">
              {/* Back Button */}
              <div className="mb-4">
                <button 
                  onClick={() => {
                    const tg = window.Telegram?.WebApp;
                    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                    setIsManagingSingleStore(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full backdrop-blur-md bg-white/75 dark:bg-[#1E1E22]/75 border border-gray-200/50 dark:border-gray-800/40 text-gray-500 hover:text-[#26A17B] dark:text-gray-400 dark:hover:text-[#26A17B] hover:border-[#26A17B]/30 dark:hover:border-[#26A17B]/30 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_16px_rgba(38,161,123,0.12)] active:scale-95 transition-all duration-300 group cursor-pointer"
                >
                  <ChevronLeft size={16} className="text-gray-450 group-hover:text-[#26A17B] group-hover:-translate-x-0.5 transition-all duration-300 shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider leading-none">{t('back_to_my_stores')}</span>
                </button>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{t('seller_dashboard')}</h2>
                  {storeId && (
                    <button 
                      onClick={refreshSellerOffers}
                      disabled={isRefreshingOffers}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-[#26A17B] active:scale-90 transition-all cursor-pointer ${isRefreshingOffers ? 'animate-spin text-[#26A17B]' : ''}`}
                      title={t('refresh_data')}
                    >
                      <RefreshCw size={18} />
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {storeId && (
                    <button 
                      onClick={() => {
                        const tg = window.Telegram?.WebApp;
                        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                        if (!storeId || !storeName) {
                          showCustomAlert(t('store_name_required'), 'warning');
                          return;
                        }
                        setShareStoreModalOpen(true);
                        setShareStoreModalClosing(false);
                      }}
                      className="bg-[#26A17B]/10 hover:bg-[#26A17B]/20 text-[#26A17B] dark:bg-[#26A17B]/15 dark:hover:bg-[#26A17B]/25 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all active:scale-95 border border-[#26A17B]/20"
                    >
                      <Share2 size={16} />
                      <span>{t('share_shop')}</span>
                    </button>
                  )}
                  {/* Бейдж режима сотрудника под кнопкой поделиться */}
                  {isStaffStore(storeId) && (
                    <span className="text-[9px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/20 select-none">
                      {t('staff_mode_label')}
                    </span>
                  )}
                </div>
              </div>

              {/* === Поле названия и иконки магазина === */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  {t('store_name')}
                </p>

                {isStaffStore(storeId) ? (
                  /* Режим сотрудника — только просмотр, без редактирования */
                  <div className="flex items-center gap-3 bg-white dark:bg-[#1E1E22] rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-800 shadow-sm">
                    <span className="text-2xl shrink-0 leading-none">{storeIcon || '🏪'}</span>
                    <span className={`flex-1 text-sm font-semibold truncate ${storeName ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                      {storeName || t('store_name_placeholder')}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold shrink-0">{t('staff_view_only')}</span>
                  </div>
                ) : !isEditingStoreName ? (
                  /* Режим просмотра владельца — показываем иконку + название */
                  <div
                    className="flex items-center gap-3 bg-white dark:bg-[#1E1E22] rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer group"
                    onClick={() => {
                      setStoreNameDraft(storeName);
                      setStoreIconDraft(storeIcon);
                      setIsEditingStoreName(true);
                      const tg = window.Telegram?.WebApp;
                      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                    }}
                  >
                    <span className="text-2xl shrink-0 leading-none">{storeIcon || '🏪'}</span>
                    <span className={`flex-1 text-sm font-semibold truncate ${storeName ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                      {storeName || t('store_name_placeholder')}
                    </span>
                    <Pencil size={15} className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-[#26A17B] transition-colors" />
                  </div>
                ) : (
                  /* Режим редактирования с выбором иконки */
                  <div className="flex flex-col gap-2">
                    {/* Icon category picker grid */}
                    <div className="bg-white dark:bg-[#1E1E22] rounded-2xl px-4 py-3.5 border border-gray-200 dark:border-gray-800 shadow-sm">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{t('store_category_label')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: '🍽', key: 'cat_food_drinks' },
                          { icon: '✂️', key: 'cat_beauty' },
                          { icon: '🚘', key: 'cat_auto' },
                          { icon: '🏋️', key: 'cat_sport' },
                          { icon: '🐾', key: 'cat_pets' },
                          { icon: '🛠', key: 'cat_services' },
                          { icon: '🏪', key: 'cat_other' }
                        ].map(({ icon, key }) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              setStoreIconDraft(icon);
                              const tg = window.Telegram?.WebApp;
                              if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                            }}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all active:scale-95 text-left cursor-pointer ${
                              storeIconDraft === icon
                                ? 'bg-[#26A17B]/10 border-[#26A17B] text-[#26A17B] font-bold shadow-xs'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-750 dark:text-gray-350 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span className="text-lg shrink-0 leading-none">{icon}</span>
                            <span className="text-xs truncate">{t(key)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Name input */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#1E1E22] rounded-2xl px-4 py-3 border-2 border-[#26A17B] shadow-sm">
                      <input
                        type="text"
                        autoFocus
                        value={storeNameDraft}
                        onChange={(e) => setStoreNameDraft(e.target.value)}
                        onFocus={(e) => {
                          setIsInputFocused(true);
                          setTimeout(() => {
                            e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }, 300);
                        }}
                        onBlur={() => {
                          setIsInputFocused(false);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateStoreName(); if (e.key === 'Escape') setIsEditingStoreName(false); }}
                        placeholder={t('store_name_placeholder')}
                        maxLength={60}
                        className="flex-1 text-sm font-semibold text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
                      />
                      {storeNameDraft.length > 0 && (
                        <button
                          onClick={() => setStoreNameDraft('')}
                          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
                          title="Очистить"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUpdateStoreName}
                        disabled={!storeNameDraft.trim() || isUpdatingStoreName}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                          storeNameDraft.trim() && !isUpdatingStoreName
                            ? 'bg-[#26A17B] text-white hover:bg-[#208a69] active:scale-[0.99]'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isUpdatingStoreName ? <span className="animate-spin">⏳</span> : <Check size={15} />}
                        {t('save')}
                      </button>
                      <button
                        onClick={() => setIsEditingStoreName(false)}
                        className="py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      {/* Удалить весь магазин */}
                      <button
                        onClick={handleDeleteStore}
                        disabled={isDeletingStore}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-650 transition-colors shrink-0"
                        title={t('delete_store')}
                      >
                        {isDeletingStore ? <span className="text-xs animate-spin">⏳</span> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!isEditingStoreName && (
                <div className="space-y-4">
                  {/* Кнопка добавления нового товара — только для владельца */}
                  {!isStaffStore(storeId) && (!storeName ? (
                    /* Блокируем если нет названия */
                    <div className="w-full border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 text-center cursor-default">
                      <PlusCircle size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                      <span className="font-medium text-sm">{t('store_name_required')}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const tg = window.Telegram?.WebApp;
                        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                        if (!cachedWalletAddress) {
                          showCustomAlert(t('wallet_required_to_create'), 'warning');
                          return;
                        }
                        const dynamicIcons = getCategoryIconList(storeIcon);
                        setFormIcon(dynamicIcons[0]);
                        setEditingOffer(null);
                        setFormName('');
                        setFormPrice('');
                        setFormPriceInstead('');
                        setFormPay('');
                        setFormGet('');
                        setFormDescription('');
                        setFormContact('');
                        setIsAddOfferOpen(true);
                        setIsAddOfferClosing(false);
                      }}
                      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1E1E22] transition-colors bg-transparent text-center bg-white dark:bg-[#1E1E22]"
                    >
                      <PlusCircle size={32} className="mx-auto mb-2 text-[#26A17B]" />
                      <span className="font-medium">{t('create_new')}</span>
                    </button>
                  ))}

                  {/* Список текущих предложений продавца */}
                  {sellerOffers.length === 0 && (
                    <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
                      {t('no_offers')}
                    </div>
                  )}
                  {sellerOffers.map((offer) => (
                    <div key={offer.id} className="bg-white dark:bg-[#1E1E22] rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col relative overflow-hidden">
                      <div className={`flex justify-between items-start mb-4 ${offer.is_hidden ? 'opacity-45 transition-all duration-300' : 'transition-all duration-300'}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-emerald-50 dark:bg-emerald-500/10 shrink-0">
                            {offer.icon}
                          </div>
                          <div className="pr-12">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-1.5">
                              <span className="line-clamp-2">{offer.name}</span>
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {offer.total_count ?? offer.total} {t('pcs')} • {offer.price_ton != null ? `${offer.price_ton} ₮` : offer.price}
                            </p>
                          </div>
                        </div>
                        {/* Кнопка удаления оффера и плашка Скрыт — только для владельца */}
                        {!isStaffStore(storeId) && (
                          <div className="absolute top-5 right-5 flex flex-col items-end gap-2">
                            <button
                              onClick={async () => {
                                const tg = window.Telegram?.WebApp;
                                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                                
                                const soldCount = Number(offer.sold ?? 0);
                                if (soldCount > 0) {
                                  const warningMsg = t('delete_sold_offer_warning', { revenue: offer.revenue ?? '0.00 ₮' });
                                  const confirmed = await showCustomConfirmAsync(warningMsg);
                                  if (!confirmed) return;
                                }
                                
                                try {
                                  const res = await fetch(`${API_BASE}/delete-offer/${offer.id}`, {
                                    method: 'POST'
                                  });
                                  if (!res.ok) throw new Error('delete failed');
                                  setSellerOffers(prev => prev.filter(o => o.id !== offer.id));
                                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                                  const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
                                  loadSellerStores(userId, storeId);
                                } catch (err) {
                                  console.error('Failed to delete offer:', err);
                                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                                  showCustomAlert(t('delete_failed'), 'error');
                                }
                              }}
                              className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-650 transition-colors shrink-0 cursor-pointer shadow-sm"
                              title={t('delete_offer')}
                            >
                              <Trash2 size={15} />
                            </button>
                            {offer.is_hidden && (
                              <span className="text-[10px] bg-blue-500/10 text-blue-500 dark:text-blue-400 font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                Скрыт
                              </span>
                            )}
                          </div>
                        )}

                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div className={`flex flex-col select-none ${offer.is_hidden ? 'opacity-45 transition-all duration-300' : 'transition-all duration-300'}`}>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 leading-none">{t('sold_count', { count: offer.sold ?? 0 })}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1 leading-none">{t('revenue')}:</p>
                          <p className="font-extrabold text-[#26A17B] leading-none">
                            {offer.revenue ?? '0.00 ₮'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {/* Кнопка скрыть/показать — только для владельца */}
                          {!isStaffStore(storeId) && (
                            <button
                              onClick={() => handleToggleVisibility(offer.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs border ${
                                offer.is_hidden
                                  ? 'bg-blue-500 hover:bg-blue-600 text-white border-transparent shadow-[0_2px_8px_rgba(59,130,246,0.3)]'
                                  : 'bg-gray-50 hover:bg-gray-100 dark:bg-[#121214] dark:hover:bg-gray-800 border-gray-200 dark:border-gray-850 text-gray-600 dark:text-gray-300'
                              }`}
                              title={offer.is_hidden ? t('show') : t('hide')}
                            >
                              {offer.is_hidden ? <Eye size={13} /> : <EyeOff size={13} />}
                              <span>{offer.is_hidden ? t('show') : t('hide')}</span>
                            </button>
                          )}

                          {/* Кнопка редактирования — только для владельца */}
                          {!isStaffStore(storeId) && (
                            <button
                              onClick={() => handleEditOfferClick(offer)}
                              className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-[#26A17B] hover:bg-[#26A17B]/10 dark:hover:bg-[#26A17B]/20 transition-all shrink-0 active:scale-90 cursor-pointer border border-emerald-100/30 dark:border-emerald-500/10"
                              title={t('edit')}
                            >
                              <Pencil size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </section>
            </div>
            )
          )}
        </div>
        ) : activeTab === 'store' && role === 'seller' ? (
          <div className="animate-slide-up">
            <section className="px-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold">{t('seller_dashboard')}</h2>
                  {storeId && (
                    <button 
                      onClick={refreshSellerOffers}
                      disabled={isRefreshingOffers}
                      className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-[#26A17B] active:scale-90 transition-all cursor-pointer ${isRefreshingOffers ? 'animate-spin text-[#26A17B]' : ''}`}
                      title={t('refresh_data')}
                    >
                      <RefreshCw size={18} />
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => {
                    const tg = window.Telegram?.WebApp;
                    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                    if (!storeId || !storeName) {
                      showCustomAlert(t('store_name_required'), 'warning');
                      return;
                    }
                    setShareStoreModalOpen(true);
                    setShareStoreModalClosing(false);
                  }}
                  className="bg-[#26A17B]/10 hover:bg-[#26A17B]/20 text-[#26A17B] dark:bg-[#26A17B]/15 dark:hover:bg-[#26A17B]/25 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all active:scale-95 border border-[#26A17B]/20"
                >
                  <Share2 size={16} />
                  <span>{t('share_shop')}</span>
                </button>
              </div>

              {/* === Поле названия и иконки магазина === */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  {t('store_name')}
                </p>

                {!isEditingStoreName ? (
                  /* Режим просмотра — показываем иконку + название */
                  <div
                    className="flex items-center gap-3 bg-white dark:bg-[#1E1E22] rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer group"
                    onClick={() => {
                      setStoreNameDraft(storeName);
                      setStoreIconDraft(storeIcon);
                      setIsEditingStoreName(true);
                      const tg = window.Telegram?.WebApp;
                      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                    }}
                  >
                    <span className="text-2xl shrink-0 leading-none">{storeIcon || '🏪'}</span>
                    <span className={`flex-1 text-sm font-semibold truncate ${storeName ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                      {storeName || t('store_name_placeholder')}
                    </span>
                    <Pencil size={15} className="shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-[#26A17B] transition-colors" />
                  </div>
                ) : (
                  /* Режим редактирования с выбором иконки */
                  <div className="flex flex-col gap-2">
                    {/* Icon category picker grid */}
                    <div className="bg-white dark:bg-[#1E1E22] rounded-2xl px-4 py-3.5 border border-gray-200 dark:border-gray-800 shadow-sm">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">{t('store_category_label')}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { icon: '🍽', key: 'cat_food_drinks' },
                          { icon: '✂️', key: 'cat_beauty' },
                          { icon: '🚘', key: 'cat_auto' },
                          { icon: '🏋️', key: 'cat_sport' },
                          { icon: '🐾', key: 'cat_pets' },
                          { icon: '🛠', key: 'cat_services' },
                          { icon: '🏪', key: 'cat_other' }
                        ].map(({ icon, key }) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => {
                              setStoreIconDraft(icon);
                              const tg = window.Telegram?.WebApp;
                              if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                            }}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all active:scale-95 text-left cursor-pointer ${
                              storeIconDraft === icon
                                ? 'bg-[#26A17B]/10 border-[#26A17B] text-[#26A17B] font-bold shadow-xs'
                                : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-750 dark:text-gray-350 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                          >
                            <span className="text-lg shrink-0 leading-none">{icon}</span>
                            <span className="text-xs truncate">{t(key)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Name input */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#1E1E22] rounded-2xl px-4 py-3 border-2 border-[#26A17B] shadow-sm">
                      <input
                        type="text"
                        autoFocus
                        value={storeNameDraft}
                        onChange={(e) => setStoreNameDraft(e.target.value)}
                        onFocus={(e) => {
                          setIsInputFocused(true);
                          setTimeout(() => {
                            e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                          }, 300);
                        }}
                        onBlur={() => {
                          setIsInputFocused(false);
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateStoreName(); if (e.key === 'Escape') setIsEditingStoreName(false); }}
                        placeholder={t('store_name_placeholder')}
                        maxLength={60}
                        className="flex-1 text-sm font-semibold text-gray-900 dark:text-white bg-transparent outline-none placeholder-gray-400 dark:placeholder-gray-500"
                      />
                      {storeNameDraft.length > 0 && (
                        <button
                          onClick={() => setStoreNameDraft('')}
                          className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors shrink-0"
                          title="Очистить"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleUpdateStoreName}
                        disabled={!storeNameDraft.trim() || isUpdatingStoreName}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                          storeNameDraft.trim() && !isUpdatingStoreName
                            ? 'bg-[#26A17B] text-white hover:bg-[#208a69] active:scale-[0.99]'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isUpdatingStoreName ? <span className="animate-spin">⏳</span> : <Check size={15} />}
                        {t('save')}
                      </button>
                      <button
                        onClick={() => setIsEditingStoreName(false)}
                        className="py-2.5 px-4 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {t('cancel')}
                      </button>
                      {/* Удалить весь магазин */}
                      <button
                        onClick={handleDeleteStore}
                        disabled={isDeletingStore}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-650 transition-colors shrink-0"
                        title={t('delete_store')}
                      >
                        {isDeletingStore ? <span className="text-xs animate-spin">⏳</span> : <Trash2 size={15} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {!isEditingStoreName && (
                <div className="space-y-4">
                  {/* Кнопка добавления нового товара */}
                  {!storeName ? (
                    /* Блокируем если нет названия */
                    <div className="w-full border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-3xl p-6 flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 text-center cursor-default">
                      <PlusCircle size={32} className="mx-auto mb-2 text-gray-300 dark:text-gray-700" />
                      <span className="font-medium text-sm">{t('store_name_required')}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        const tg = window.Telegram?.WebApp;
                        if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                        if (!cachedWalletAddress) {
                          showCustomAlert(t('wallet_required_to_create'), 'warning');
                          return;
                        }
                        const dynamicIcons = getCategoryIconList(storeIcon);
                        setFormIcon(dynamicIcons[0]);
                        setIsAddOfferOpen(true);
                        setIsAddOfferClosing(false);
                      }}
                      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1E1E22] transition-colors bg-transparent text-center bg-white dark:bg-[#1E1E22]"
                    >
                      <PlusCircle size={32} className="mx-auto mb-2 text-[#26A17B]" />
                      <span className="font-medium">{t('create_new')}</span>
                    </button>
                  )}

                  {/* Список текущих предложений продавца */}
                  {sellerOffers.length === 0 && (
                    <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-sm">
                      {t('no_offers')}
                    </div>
                  )}
                  {sellerOffers.map((offer) => (
                    <div key={offer.id} className="bg-white dark:bg-[#1E1E22] rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl bg-emerald-50 dark:bg-emerald-500/10">
                            {offer.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{offer.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {offer.total_count ?? offer.total} {t('pcs')} • {offer.price_ton != null ? `${offer.price_ton} ₮` : offer.price}
                            </p>
                          </div>
                        </div>
                        {/* Кнопка удаления оффера */}
                        <button
                          onClick={async () => {
                            const tg = window.Telegram?.WebApp;
                            if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                            
                            const soldCount = Number(offer.sold ?? 0);
                            if (soldCount > 0) {
                              const warningMsg = t('delete_sold_offer_warning', { revenue: offer.revenue ?? '0.00 ₮' });
                              const confirmed = await showCustomConfirmAsync(warningMsg);
                              if (!confirmed) return;
                            }
                            
                            try {
                              const res = await fetch(`${API_BASE}/delete-offer/${offer.id}`, {
                                method: 'POST'
                              });
                              if (!res.ok) throw new Error('delete failed');
                              setSellerOffers(prev => prev.filter(o => o.id !== offer.id));
                              if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                              const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
                              loadSellerStores(userId, storeId);
                            } catch (err) {
                              console.error('Failed to delete offer:', err);
                              if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                              showCustomAlert(t('delete_failed'), 'error');
                            }
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-650 transition-colors shrink-0"
                          title={t('delete_offer')}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('sold_count', { count: offer.sold ?? 0 })}</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {t('revenue')}: <span className="text-[#26A17B]">{offer.revenue ?? '0.00 ₮'}</span>
                            </p>
                          </div>
                        </div>
                    </div>
                  ))}
                </div>
                )}
              </section>
            </div>
        ) : activeTab === 'settings' ? (
          <section className="px-6 mt-6 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6">{t('settings')}</h2>
            
            {/* Переключатель роли */}
            <div className="bg-white dark:bg-[#1E1E22] rounded-2xl p-1.5 border border-gray-200 dark:border-gray-800 shadow-sm flex mb-6">
              <button 
                onClick={() => {
                  setRole('buyer');
                  setIsManagingSingleStore(false);
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${role === 'buyer' ? 'bg-[#F4F5F9] dark:bg-[#2C2C32] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {t('buyer')}
              </button>
              <button 
                onClick={() => {
                  setRole('seller');
                  setIsManagingSingleStore(false);
                }}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${role === 'seller' ? 'bg-[#F4F5F9] dark:bg-[#2C2C32] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {t('seller')}
              </button>
            </div>

            <div className="bg-white dark:bg-[#1E1E22] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">{t('language')}</h3>
              <div className="space-y-2">
                {Object.entries(LANGUAGES).map(([code, name]) => (
                  <button 
                    key={code}
                    onClick={() => {
                      setLang(code);
                      const tg = window.Telegram?.WebApp;
                      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                    }}
                    className={`w-full flex justify-between items-center p-3 rounded-xl transition-colors ${lang === code ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-900 dark:text-white'}`}
                  >
                    <span>{name}</span>
                    {lang === code && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
                  </button>
                ))}
              </div>
            </div>

            {/* Связь с разработчиком */}
            <div className="mt-5">
               <button
                 onClick={() => {
                   const tg = window.Telegram?.WebApp;
                   if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                   if (tg) {
                     tg.openTelegramLink('https://t.me/passloyality');
                   } else {
                     window.open('https://t.me/passloyality', '_blank');
                   }
                 }}
                 className="w-full flex items-center justify-center gap-2.5 py-4 px-4 bg-blue-500/10 hover:bg-blue-500/15 dark:bg-blue-500/15 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 dark:border-blue-500/10 rounded-2xl font-bold text-sm transition-all active:scale-[0.99] cursor-pointer shadow-xs"
               >
                 <MessageSquare size={16} />
                 <span>{t('contact_developer')}</span>
               </button>
            </div>
          </section>
        ) : activeTab === 'history' ? (
          <section className="px-6 mt-6 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6">{t('history')}</h2>

            <div className="space-y-3">
              {historyTransactions.length > 0 ? (
                historyTransactions.map((tx) => {
                  // Determine premium colors and icons dynamically
                  let iconBg = 'bg-blue-50 text-blue-500 dark:bg-blue-500/10';
                  let iconElement = <Plus size={18} />;
                  let amountColor = 'text-gray-500 dark:text-gray-400';

                  if (tx.type === 'purchase') {
                    iconBg = 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10';
                    iconElement = <Plus size={18} />;
                    amountColor = 'text-red-500 dark:text-red-400';
                  } else if (tx.type === 'redeem') {
                    iconBg = 'bg-orange-50 text-orange-500 dark:bg-orange-500/10';
                    iconElement = <Minus size={18} />;
                    amountColor = 'text-emerald-500 dark:text-emerald-400';
                  } else if (tx.type === 'seller_sale') {
                    iconBg = 'bg-blue-50 text-blue-500 dark:bg-blue-500/10';
                    iconElement = <Store size={18} />;
                    amountColor = 'text-emerald-500 dark:text-emerald-400';
                  } else if (tx.type === 'seller_redeem') {
                    iconBg = 'bg-purple-50 text-purple-500 dark:bg-purple-500/10';
                    iconElement = <ScanLine size={18} />;
                    amountColor = 'text-purple-500 dark:text-purple-400';
                  }

                  const displayName = tx.titleKey ? t(tx.titleKey) : tx.title;

                  return (
                    <div key={tx.id} className="bg-white dark:bg-[#1E1E22] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between transition-all duration-300 hover:border-[#26A17B]/20 dark:hover:border-[#26A17B]/20 hover:shadow-md animate-fade-in relative overflow-hidden">
                      {/* Premium Glassmorphic DEMO Watermark on the card if applicable */}
                      {tx.isDemo && (
                        <div className="absolute -top-1.5 -right-3 bg-amber-500/10 text-amber-500 dark:text-amber-400 text-[8px] font-black px-4 py-1.5 rotate-12 transform uppercase select-none border-b border-l border-amber-500/10 tracking-widest rounded-bl-lg">
                          {t('demo_badge')}
                        </div>
                      )}
                      
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                          {iconElement}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight">{displayName}</h4>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{tx.vendor}</span> • {tx.date}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-black text-sm ${tx.items.startsWith('+') ? 'text-emerald-500' : 'text-gray-900 dark:text-white'}`}>
                          {tx.items} {t(tx.unitKey)}
                        </p>
                        {tx.amount ? (
                          <p className={`text-[11px] font-bold mt-0.5 ${amountColor}`}>
                            {tx.amount}
                          </p>
                        ) : tx.type === 'redeem' ? (
                          <p className="text-[10px] font-bold mt-0.5 text-emerald-500 uppercase tracking-wider bg-emerald-500/5 px-1.5 py-0.5 rounded">
                            {t('redeem')}
                          </p>
                        ) : tx.type === 'seller_redeem' ? (
                          <p className="text-[10px] font-bold mt-0.5 text-purple-500 uppercase tracking-wider bg-purple-500/5 px-1.5 py-0.5 rounded">
                            {t('done')}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-500 dark:text-gray-400 text-sm">
                  {t('history_empty')}
                </div>
              )}
            </div>
          </section>
        ) : null}
      </main>
      </div>

      {/* Floating Bottom Navigation Capsule */}
      <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[70%] max-w-[280px] bg-white/10 dark:bg-[#1E1E22]/10 backdrop-blur-3xl rounded-full px-6 py-4 flex justify-between items-center shadow-lg z-50 border border-white/20 dark:border-white/5 animate-slide-up">
        <button 
          onClick={() => setActiveTab('home')} 
          className={`flex flex-col items-center gap-1 transition-all duration-300 transform active:scale-90 ${activeTab === 'home' ? 'text-gray-900 dark:text-white scale-110' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          title={t('tab_showcase')}
        >
          <Layers size={22} />
        </button>
        
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-all duration-300 transform active:scale-90 ${activeTab === 'history' ? 'text-gray-900 dark:text-white scale-110' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          title={t('tab_history')}
        >
          <History size={22} />
        </button>

        <button 
          onClick={() => setActiveTab('settings')} 
          className={`flex flex-col items-center gap-1 transition-all duration-300 transform active:scale-90 ${activeTab === 'settings' ? 'text-gray-900 dark:text-white scale-110' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
          title={t('settings')}
        >
          <Settings size={22} />
        </button>
      </nav>

      {/* Floating Scanner FAB */}
      <button 
        onClick={openScanner}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-[#26A17B] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(38,161,123,0.4)] hover:shadow-[0_12px_28px_rgba(38,161,123,0.5)] transform hover:scale-110 active:scale-95 transition-all duration-300 z-45 border-2 border-white dark:border-[#1E1E22] group"
        title={role === 'buyer' ? t('scan_buyer_desc') : t('scan_seller_desc')}
      >
        <ScanLine size={24} className="stroke-[2.5] group-hover:rotate-12 transition-transform duration-300" />
      </button>

      {/* QR Modal Overlay */}
      {qrModalState.isOpen && (() => {
        const activePass = myPasses.find(p => p.id === qrModalState.pass?.id) || qrModalState.pass;
        return (
          <div 
            className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={(e) => { if (e.target === e.currentTarget) closeQR(); }}
          >
            <div 
              style={qrStyle}
              className={`bg-white dark:bg-[#1E1E22] w-full sm:w-11/12 sm:rounded-3xl rounded-t-3xl p-6 flex flex-col items-center shadow-2xl ${qrModalState.isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
            >
              <div 
                className="w-full flex flex-col items-center cursor-grab select-none active:cursor-grabbing shrink-0"
                onTouchStart={handleQrTouchStart}
                onTouchMove={handleQrTouchMove}
                onTouchEnd={handleQrTouchEnd}
              >
                <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mb-6 sm:hidden cursor-pointer" onClick={closeQR}></div>
                <h3 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">
                  {t('get_pass', { name: activePass?.nameKey ? t(activePass.nameKey) : (activePass?.name || '') })}
                </h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6 mt-1">{t('show_code')}</p>
              
              {qrOtpLoading ? (
                <div className="w-48 h-48 flex flex-col items-center justify-center bg-gray-50 dark:bg-[#121214] rounded-3xl border border-gray-200 dark:border-gray-800 shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-none mb-6">
                  <div className="w-10 h-10 border-4 border-[#26A17B]/20 border-t-[#26A17B] rounded-full animate-spin mb-3"></div>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{t('otp_loading')}</p>
                </div>
              ) : qrOtpStatus === 'scanned' ? (
                /* Success checkmark screen */
                <div className="w-48 h-48 flex flex-col items-center justify-center bg-emerald-50 dark:bg-emerald-950/20 rounded-3xl border border-emerald-100 dark:border-emerald-900/40 shadow-inner mb-6 animate-scale-in">
                  <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-3 animate-bounce">
                    <Check size={36} strokeWidth={3} />
                  </div>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider text-center px-4 leading-tight">{t('otp_scanned')}</p>
                </div>
              ) : qrOtpStatus === 'expired' ? (
                /* Expired screen with styled "Refresh" button */
                <div className="w-48 h-48 flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 rounded-3xl border border-red-100 dark:border-red-900/40 shadow-inner mb-6 animate-scale-in">
                  <p className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase tracking-wider mb-4 text-center px-4 leading-tight">{t('otp_expired')}</p>
                  <button 
                    onClick={() => generatePassOtp(activePass)} 
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 cursor-pointer active:scale-95 animate-fade-in"
                  >
                    {t('otp_refresh')}
                  </button>
                </div>
              ) : qrOtpStatus === 'error' ? (
                /* Error screen */
                <div className="w-48 h-48 flex flex-col items-center justify-center bg-red-50 dark:bg-red-950/20 rounded-3xl border border-red-100 dark:border-red-900/40 shadow-inner mb-6 animate-scale-in">
                  <p className="text-[10px] text-red-500 dark:text-red-400 font-bold uppercase tracking-wider mb-4 text-center px-4 leading-tight">Error generating code</p>
                  <button 
                    onClick={() => generatePassOtp(activePass)} 
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-red-500/20 cursor-pointer active:scale-95 animate-fade-in"
                  >
                    {t('otp_refresh')}
                  </button>
                </div>
              ) : (
                /* Active OTP QR Code */
                <div className="flex flex-col items-center">
                  <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-none mb-4 border border-gray-200 dark:border-gray-800">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrOtpToken || 'no_token'}`} 
                      alt="QR Code" 
                      className="w-48 h-48 rounded-xl animate-fade-in" 
                    />
                  </div>
                  
                  {/* Visual ticking countdown progress indicator */}
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-24 bg-gray-200 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${(qrOtpTimeLeft / 100) * 100}%` }}
                        className={`h-full transition-all duration-1000 rounded-full ${qrOtpTimeLeft > 30 ? 'bg-[#26A17B]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)] animate-pulse'}`}
                      ></div>
                    </div>
                    <span className={`text-[10px] font-bold ${qrOtpTimeLeft > 30 ? 'text-gray-500 dark:text-gray-400' : 'text-red-500 font-extrabold animate-pulse'}`}>
                      {t('otp_time_left', { time: qrOtpTimeLeft })}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="w-full bg-[#F4F5F9] dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex justify-between items-center mb-6">
                <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('your_balance')}</span>
                <span className="font-bold text-lg text-gray-900 dark:text-white">
                  {activePass?.current} {activePass?.unitKey ? t(activePass.unitKey) : ''}
                </span>
              </div>
  
              <button onClick={closeQR} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-gray-900 dark:text-white text-lg">
                {t('done')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Modern Scanner Overlay */}
      {isScannerOpen && (
        <div className="absolute inset-0 z-100 bg-black flex flex-col items-center justify-center animate-slide-up overflow-hidden">
          {/* Live Camera Stream */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted
            className="absolute inset-0 w-full h-full object-cover opacity-60 z-0"
          />
          
          {/* Viewfinder UI */}
          <div 
            onClick={() => {
              if (role === 'buyer') {
                handleQrScanned("Store_boba_lab");
              } else {
                handleQrScanned("Redeem_MockPass_123");
              }
              setIsScannerOpen(false);
            }}
            className="relative w-64 h-64 mb-8 z-10 cursor-pointer active:scale-95 transition-transform"
            title="Click to simulate scanning a QR code"
          >
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#26A17B] rounded-tl-3xl"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#26A17B] rounded-tr-3xl"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#26A17B] rounded-bl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#26A17B] rounded-br-3xl"></div>
            
            {/* Scanning Line */}
            <div className="absolute left-2 right-2 h-0.5 bg-[#26A17B] shadow-[0_0_15px_3px_rgba(38,161,123,0.5)] animate-scan"></div>
          </div>
          
          <p className="text-white/80 text-center text-sm font-medium max-w-[260px] mb-12 z-10">
            {role === 'buyer' ? t('scan_buyer_desc') : t('scan_seller_desc')}
          </p>
          
          <button 
            onClick={() => setIsScannerOpen(false)} 
            className="px-8 py-3 rounded-full bg-white/10 text-white font-bold backdrop-blur-md border border-white/20 hover:bg-white/30 transition-colors z-10"
          >
            {t('cancel')}
          </button>
        </div>
      )}

      {/* Модальное окно создания предложения */}
      {isAddOfferOpen && (
        <div 
          className="absolute inset-0 z-50 flex items-end justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddOfferClosing(true);
              setTimeout(() => setIsAddOfferOpen(false), 300);
            }
          }}
        >
          <div 
            style={offerStyle}
            className={`bg-white dark:bg-[#1E1E22] w-full sm:w-11/12 sm:rounded-3xl rounded-t-3xl p-6 flex flex-col shadow-2xl overflow-y-auto max-h-[85vh] hide-scrollbar ${isAddOfferClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
          >
            <div 
              className="w-full flex flex-col items-center cursor-grab select-none active:cursor-grabbing shrink-0"
              onTouchStart={handleOfferTouchStart}
              onTouchMove={handleOfferTouchMove}
              onTouchEnd={handleOfferTouchEnd}
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mb-6 mx-auto cursor-pointer" onClick={() => {
                setIsAddOfferClosing(true);
                setTimeout(() => setIsAddOfferOpen(false), 300);
              }}></div>
              <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white text-center">
                {editingOffer ? t('edit_offer_title') : t('create_offer')}
              </h3>
            </div>

            {/* Выбор иконки (эмодзи) */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">{t('select_icon')}</label>
              {(() => {
                const offerIconsData = CATEGORY_OFFER_ICONS[storeIcon] || CATEGORY_OFFER_ICONS['🏪'];
                if (!Array.isArray(offerIconsData)) {
                  // Food & Drinks grouped view
                  return (
                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-[#26A17B] dark:text-[#26A17B] uppercase tracking-wider block mb-1.5">{t('subheader_food')}</span>
                        <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-[#121214] p-2 rounded-2xl border border-gray-200 dark:border-gray-800">
                          {offerIconsData.food.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setFormIcon(emoji);
                                const tg = window.Telegram?.WebApp;
                                if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                              }}
                              className={`h-11 rounded-xl text-xl flex items-center justify-center transition cursor-pointer ${formIcon === emoji ? 'bg-white dark:bg-gray-800 shadow-xs border border-gray-200 dark:border-gray-700 font-bold' : 'opacity-60 hover:opacity-100'}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-[#26A17B] dark:text-[#26A17B] uppercase tracking-wider block mb-1.5">{t('subheader_drinks')}</span>
                        <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-[#121214] p-2 rounded-2xl border border-gray-200 dark:border-gray-800">
                          {offerIconsData.drinks.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setFormIcon(emoji);
                                const tg = window.Telegram?.WebApp;
                                if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                              }}
                              className={`h-11 rounded-xl text-xl flex items-center justify-center transition cursor-pointer ${formIcon === emoji ? 'bg-white dark:bg-gray-800 shadow-xs border border-gray-200 dark:border-gray-700 font-bold' : 'opacity-60 hover:opacity-100'}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Standard flat grid view
                  return (
                    <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-[#121214] p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800">
                      {offerIconsData.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setFormIcon(emoji);
                            const tg = window.Telegram?.WebApp;
                            if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                          }}
                          className={`h-11 rounded-xl text-xl flex items-center justify-center transition cursor-pointer ${formIcon === emoji ? 'bg-white dark:bg-gray-800 shadow-xs border border-gray-200 dark:border-gray-700 font-bold' : 'opacity-60 hover:opacity-100'}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  );
                }
              })()}
            </div>

            {/* Название предложения */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">{t('offer_name')}</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('offer_name_placeholder')}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 300);
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:border-[#26A17B] transition-colors"
              />
            </div>

            {/* Сетка цены: Плати и Вместо */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                  {t('pay')}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="0.00"
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 300);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-[#26A17B] placeholder-[#26A17B]/25 focus:outline-hidden focus:border-[#26A17B] transition-colors"
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                  {t('required_field')}
                </span>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                  {t('instead')}
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={formPriceInstead}
                  onChange={(e) => setFormPriceInstead(e.target.value)}
                  placeholder="0.00"
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 300);
                  }}
                  className={`w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold transition-colors focus:outline-hidden focus:border-gray-400 ${
                    formPriceInstead 
                      ? 'text-gray-900 dark:text-white font-extrabold opacity-100' 
                      : 'text-gray-400/70 dark:text-gray-500/70 placeholder-gray-400/25 dark:placeholder-gray-500/20'
                  }`}
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                  {t('optional')}
                </span>
              </div>
            </div>

            {/* Сетка лояльности: Оплати и Забери */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                  {t('pay_for_pcs')}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formPay}
                  onChange={(e) => setFormPay(e.target.value)}
                  placeholder="00"
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 300);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400/20 dark:placeholder-gray-500/20 focus:outline-hidden focus:border-[#26A17B] transition-colors"
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                  {t('optional')}
                </span>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                  {t('get_total_pcs')}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formGet}
                  onChange={(e) => setFormGet(e.target.value)}
                  placeholder="00"
                  onFocus={(e) => {
                    setTimeout(() => {
                      e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                    }, 300);
                  }}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400/20 dark:placeholder-gray-500/20 focus:outline-hidden focus:border-[#26A17B] transition-colors"
                />
                <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                  {t('required_field')}
                </span>
              </div>
            </div>

            {/* Условия & Описание */}
            <div className="mt-4">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                {t('offer_description')}
              </label>
              <textarea
                rows={3}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder={t('offer_description_placeholder')}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 300);
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400/30 dark:placeholder-gray-500/30 focus:outline-hidden focus:border-[#26A17B] transition-colors resize-none leading-relaxed"
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                {t('required_field')}
              </span>
            </div>

            {/* Контакты */}
            <div className="mt-4 mb-4">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
                {t('offer_contact')}
              </label>
              <input
                type="text"
                value={formContact}
                onChange={(e) => setFormContact(e.target.value)}
                placeholder={t('offer_contact_placeholder')}
                onFocus={(e) => {
                  setTimeout(() => {
                    e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }, 300);
                }}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400/30 dark:placeholder-gray-500/30 focus:outline-hidden focus:border-[#26A17B] transition-colors"
              />
              <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 block font-medium">
                {t('required_field')}
              </span>
            </div>

            {/* Кнопка "Сохранить" */}
            <button
              onClick={async () => {
                if (!formName || !formPrice || !formGet || !formDescription.trim() || !formContact.trim() || isOfferSaving) return;
                if (!storeId) {
                  showCustomAlert(t('store_not_created'), 'error');
                  return;
                }

                setIsOfferSaving(true);
                try {
                  const payVal = formPay.trim() !== '' ? parseInt(formPay) : null;
                  const getVal = parseInt(formGet);
                  const priceVal = parseFloat(formPrice);
                  const priceInsteadVal = formPriceInstead.trim() !== '' ? parseFloat(formPriceInstead) : null;

                  // Protection checks for correct input values
                  if (formName.trim().length > 20) {
                    showCustomAlert(t('validation_offer_name_limit'), 'warning');
                    setIsOfferSaving(false);
                    return;
                  }

                  if (priceInsteadVal !== null && priceVal >= priceInsteadVal) {
                    showCustomAlert(t('validation_price_error'), 'warning');
                    setIsOfferSaving(false);
                    return;
                  }

                  if (payVal !== null && payVal > getVal) {
                    showCustomAlert(t('validation_stamps_error'), 'warning');
                    setIsOfferSaving(false);
                    return;
                  }

                  // Build the offer name based on stamps ratio
                  let offerName = formName;
                  if (payVal && payVal > 0 && getVal > payVal) {
                    offerName = `${formName} ${payVal}+${getVal - payVal}`;
                  }

                  const url = editingOffer 
                    ? `${API_BASE}/update-offer/${editingOffer.id}`
                    : `${API_BASE}/add-offer`;

                  const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...(editingOffer ? {} : { store_id: storeId }),
                      icon: formIcon,
                      name: offerName,
                      pay_count: payVal,
                      total_count: getVal,
                      price_ton: priceVal,
                      price_instead: priceInsteadVal,
                      description: formDescription,
                      contact: formContact
                    })
                  });

                  if (!res.ok) throw new Error('Save offer request failed');
                  const json = await res.json();

                  if (editingOffer) {
                    // Обновляем оффер в списке
                    setSellerOffers(prev => prev.map(o => o.id === json.offer.id ? json.offer : o));
                  } else {
                    // Добавляем новый оффер в начало списка
                    setSellerOffers(prev => [json.offer, ...prev]);
                  }

                  // Синхронизируем магазины
                  const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
                  loadSellerStores(userId, storeId);

                  // Тактильный отклик при успехе
                  const tg = window.Telegram?.WebApp;
                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

                  // Закрываем окно и сбрасываем форму
                  setIsAddOfferClosing(true);
                  setTimeout(() => {
                    setIsAddOfferOpen(false);
                    setFormName('');
                    setFormPrice('');
                    setFormPriceInstead('');
                    setFormPay('');
                    setFormGet('');
                    setFormDescription('');
                    setFormContact('');
                    setFormIcon('☕️');
                    setEditingOffer(null);
                  }, 300);
                } catch (err) {
                  console.error('Failed to save offer:', err);
                  const tg = window.Telegram?.WebApp;
                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                  showCustomAlert(t('save_failed'), 'error');
                } finally {
                  setIsOfferSaving(false);
                }
              }}
              disabled={!formName || !formPrice || !formGet || !formDescription.trim() || !formContact.trim() || isOfferSaving}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all ${(!formName || !formPrice || !formGet || !formDescription.trim() || !formContact.trim() || isOfferSaving) ? 'bg-gray-300 dark:bg-gray-800 cursor-not-allowed opacity-50' : 'bg-[#26A17B] hover:bg-[#208a69] active:scale-[0.99] cursor-pointer'}`}
            >
              {isOfferSaving ? t('saving') : t('save')}
            </button>
          </div>
        </div>
      )}

      {/* Share Store Modal Overlay */}
      {shareStoreModalOpen && (
        <div 
          className="absolute inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/40 dark:bg-black/60 backdrop-blur-md transition-opacity duration-300"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShareStoreModalClosing(true);
              setTimeout(() => {
                setShareStoreModalOpen(false);
                setShareStoreModalClosing(false);
              }, 300);
            }
          }}
        >
          <div 
            className={`bg-white/85 dark:bg-[#1E1E22]/90 backdrop-blur-2xl w-full sm:w-[420px] sm:rounded-3xl rounded-t-[32px] p-6 flex flex-col items-center shadow-2xl border border-white/20 dark:border-white/5 relative overflow-hidden transition-all duration-300 ${shareStoreModalClosing ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100 animate-slide-up'}`}
          >
            {/* Soft decorative background lights */}
            <div className="absolute -left-12 -bottom-12 w-32 h-32 bg-[#26A17B]/10 rounded-full blur-2xl"></div>
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

            {/* Handle bar for bottom sheet drag visual */}
            <div 
              className="w-12 h-1.5 bg-gray-305/60 dark:bg-gray-700/60 rounded-full mb-6 sm:hidden cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
              onClick={() => {
                setShareStoreModalClosing(true);
                setTimeout(() => {
                  setShareStoreModalOpen(false);
                  setShareStoreModalClosing(false);
                }, 300);
              }}
            ></div>

            {/* Close Button on top-right for desktop/tablet view */}
            <button
              onClick={() => {
                const tg = window.Telegram?.WebApp;
                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                setShareStoreModalClosing(true);
                setTimeout(() => {
                  setShareStoreModalOpen(false);
                  setShareStoreModalClosing(false);
                }, 300);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100/80 dark:bg-gray-800/80 border border-gray-200/50 dark:border-gray-700/50 flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors z-10"
            >
              <X size={16} />
            </button>

            {/* Title & Description */}
            <div className="text-center w-full mb-5 z-10">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                {t('share_store_title')}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed max-w-[290px] mx-auto">
                {t('share_store_desc')}
              </p>
            </div>

            {/* QR Card Container */}
            <div className="bg-white p-5 rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-none mb-6 border border-gray-100 dark:border-gray-800/20 transform hover:scale-[1.01] transition-transform duration-300 relative group z-10">
              <div className="absolute inset-0 bg-[#26A17B]/2 rounded-[28px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=Store_${storeId}${isStaffStore(storeId) && tgUser?.id ? `_${tgUser.id}` : ''}`} 
                alt="Store QR Code" 
                className="w-48 h-48 rounded-xl object-contain relative" 
              />
            </div>

            {/* Store Information Badge */}
            <div className="w-full bg-gray-50/50 dark:bg-[#121214]/50 border border-gray-150 dark:border-gray-850 rounded-2xl p-4 flex items-center gap-4 mb-6 backdrop-blur-md z-10">
              <div className="w-12 h-12 bg-white dark:bg-[#1E1E22] rounded-xl flex items-center justify-center text-2xl shadow-inner shrink-0 border border-gray-200/30 dark:border-gray-800/30">
                🏪
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider mb-0.5">{t('store_name')}</p>
                <h4 className="font-bold text-base text-gray-900 dark:text-white truncate leading-tight">{storeName}</h4>
              </div>
            </div>

            {/* Close/Done Button */}
            <button 
              onClick={() => {
                const tg = window.Telegram?.WebApp;
                if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                setShareStoreModalClosing(true);
                setTimeout(() => {
                  setShareStoreModalOpen(false);
                  setShareStoreModalClosing(false);
                }, 300);
              }} 
              className="w-full py-4 rounded-2xl bg-[#26A17B] hover:bg-[#208a69] active:scale-[0.99] transition-all font-bold text-white text-base shadow-md shadow-[#26A17B]/15 z-10"
            >
              {t('done')}
            </button>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {customAlert.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setCustomAlert({ ...customAlert, isOpen: false })}
          />
          <div className="relative bg-white dark:bg-[#1E1E22] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center text-center">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                customAlert.type === 'success' ? 'bg-[#26A17B]/10 text-[#26A17B]' : 
                customAlert.type === 'error' ? 'bg-red-500/10 text-red-500' : 
                'bg-yellow-500/10 text-yellow-500'
              }`}>
                {customAlert.type === 'success' ? <CheckCircle2 size={32} /> : 
                 customAlert.type === 'error' ? <AlertCircle size={32} /> : 
                 <Info size={32} />}
              </div>
              
              {customAlert.title && (
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {customAlert.title}
                </h3>
              )}
              
              <p className="text-gray-600 dark:text-gray-300 font-medium whitespace-pre-wrap">
                {linkify(customAlert.message)}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-[#18181A] border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setCustomAlert({ ...customAlert, isOpen: false })}
                className={`w-full py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center transition-all ${
                  customAlert.type === 'success' ? 'bg-[#26A17B] text-white hover:bg-[#208a69] active:scale-[0.98]' :
                  customAlert.type === 'error' ? 'bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]' :
                  'bg-yellow-500 text-white hover:bg-yellow-600 active:scale-[0.98]'
                }`}
              >
                ОК
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {customConfirm.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={customConfirm.onCancel}
          />
          <div className="relative bg-white dark:bg-[#1E1E22] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-yellow-500/10 text-yellow-500">
                <AlertCircle size={32} />
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium whitespace-pre-wrap">
                {customConfirm.message}
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-[#18181A] border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button
                onClick={customConfirm.onCancel}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center transition-all bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 active:scale-[0.98]"
              >
                {t('cancel')}
              </button>
              <button
                onClick={customConfirm.onConfirm}
                className="flex-1 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center transition-all bg-red-500 text-white hover:bg-red-600 active:scale-[0.98]"
              >
                ОК
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}