import { useState, useEffect, useRef } from 'react';
import { 
  Moon, Sun, QrCode, Layers, 
  Store, ScanLine, History, Settings,
  Plus, Minus, Share2, PlusCircle, Coffee, Trash2, Pencil, X, Check
} from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

// Импортируем наши разделенные файлы
import './index.css';
import { LANGUAGES, TRANSLATIONS } from '../content/locales/translations';
import { MY_PASSES, MARKETPLACE_ITEMS, HISTORY_TRANSACTIONS, STORES_DATA } from '../content/data/mockData';

// Базовый URL бэкенда
const API_BASE = 'https://pdrua.duckdns.org/fintech/api';

const getThemeByIcon = (icon) => {
  const normalized = String(icon || '').toLowerCase();
  if (normalized.includes('☕️') || normalized.includes('coffee') || normalized.includes('капучино') || normalized.includes('кофе')) {
    return {
      colors: 'from-amber-800 to-amber-950',
      btnColor: 'text-amber-900',
      theme: 'amber'
    };
  }
  if (normalized.includes('🌮') || normalized.includes('🌯') || normalized.includes('shawarma') || normalized.includes('тако') || normalized.includes('шаурма')) {
    return {
      colors: 'from-rose-500 to-red-600',
      btnColor: 'text-rose-600',
      theme: 'rose'
    };
  }
  if (normalized.includes('🧋') || normalized.includes('bubble') || normalized.includes('boba') || normalized.includes('чай')) {
    return {
      colors: 'from-indigo-500 to-purple-600',
      btnColor: 'text-indigo-600',
      theme: 'indigo'
    };
  }
  if (normalized.includes('🥐') || normalized.includes('croissant') || normalized.includes('круассан')) {
    return {
      colors: 'from-orange-600 to-orange-850',
      btnColor: 'text-orange-700',
      theme: 'orange'
    };
  }
  return {
    colors: 'from-[#26A17B] to-[#1e7c5e]',
    btnColor: 'text-[#26A17B]',
    theme: 'teal'
  };
};

export default function App() {
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
    } catch (e) {
      console.warn('Failed to parse my_passes:', e);
    }
    return MY_PASSES.map(p => ({
      ...p,
      icon: (typeof p.icon === 'string' && p.icon.trim() !== '')
        ? p.icon
        : (p.nameKey === 'pass_cap' ? 'coffee' : (p.nameKey === 'pass_taco' ? '🌮' : (p.nameKey === 'pass_boba' ? '🧋' : '🎟️')))
    }));
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
    } catch (e) {
      console.warn('Failed to load added_stores:', e);
    }
    return [];
  });
  const [selectedStore, setSelectedStore] = useState(null);
  const [shareStoreModalOpen, setShareStoreModalOpen] = useState(false);
  const [shareStoreModalClosing, setShareStoreModalClosing] = useState(false);
  const [isStoreOffersLoading, setIsStoreOffersLoading] = useState(false);
  const [qrModalState, setQrModalState] = useState({ isOpen: false, isClosing: false, pass: null });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const videoRef = useRef(null);
  const [cameraStream, setCameraStream] = useState(null);

  // Стейты для продавца
  const [sellerOffers, setSellerOffers] = useState([]);
  const [storeId, setStoreId] = useState(null);       // ID магазина продавца в Redis
  const [isOfferSaving, setIsOfferSaving] = useState(false); // Лоадер кнопки сохранения
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);
  const [isAddOfferClosing, setIsAddOfferClosing] = useState(false);

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
  const [walletVerified, setWalletVerified] = useState(() => {
    try { return localStorage.getItem('wallet_verified') === 'true'; } catch { return false; }
  });
  const [isVerifying, setIsVerifying] = useState(false);
  
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
  
  // Стейты для новой формы добавления
  const [formIcon, setFormIcon] = useState('☕️');
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formPay, setFormPay] = useState('4');
  const [formGet, setFormGet] = useState('5');

  // Легкая кастомная функция перевода (t)
  const t = (key, params = {}) => {
    let text = TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
    Object.keys(params).forEach(k => {
      text = text.replace(`{${k}}`, params[k]);
    });
    return text;
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

  // --- Фоновое обновление названий и иконок добавленных магазинов для покупателя ---
  useEffect(() => {
    if (role !== 'buyer' || addedStores.length === 0) return;

    let isMounted = true;

    const refreshStoresMetadata = async () => {
      try {
        let hasChanges = false;
        const refreshedStores = await Promise.all(
          addedStores.map(async (store) => {
            if (!store.isDynamic || !store.id) return store;
            try {
              const res = await fetch(`${API_BASE}/store/${store.id}`);
              if (!res.ok) return store;
              const data = await res.json();
              if (data.status === 'ok' && data.store) {
                const latestName = data.store.name;
                const latestIcon = data.store.icon;
                if (
                  (latestName && latestName !== store.name) ||
                  (latestIcon && latestIcon !== store.icon)
                ) {
                  hasChanges = true;
                  return {
                    ...store,
                    name: latestName || store.name,
                    icon: latestIcon || store.icon
                  };
                }
              }
            } catch (err) {
              console.warn(`Failed to refresh store ${store.id} metadata:`, err);
            }
            return store;
          })
        );

        if (isMounted && hasChanges) {
          setAddedStores(refreshedStores);
        }
      } catch (err) {
        console.warn('Failed to refresh dynamic stores metadata:', err);
      }
    };

    refreshStoresMetadata();

    return () => {
      isMounted = false;
    };
  }, [role]);


  // --- Инициализация магазина продавца и загрузка офферов из Redis ---
  useEffect(() => {
    if (role !== 'seller') return;

    const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
    const storeName = tgUser?.first_name
      ? `${tgUser.first_name}'s Shop`
      : 'My Shop';

    const initSellerStore = async () => {
      try {
        // Создаём магазин (или получаем существующий — эндпоинт идемпотентен)
        const initialName = tgUser?.first_name
          ? `${tgUser.first_name}'s Shop`
          : 'My Shop';
        const storeRes = await fetch(`${API_BASE}/create-store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_id: userId, name: initialName, icon: '🏪' })
        });
        if (!storeRes.ok) throw new Error('create-store failed');
        const storeJson = await storeRes.json();
        const sid = storeJson.store?.id;
        if (!sid) throw new Error('No store_id returned');
        setStoreId(sid);
        // Синхронизируем название и иконку магазина из Redis
        const nameFromDb = storeJson.store?.name || '';
        const iconFromDb = storeJson.store?.icon || '🏪';
        setStoreName(nameFromDb);
        setStoreIcon(iconFromDb);
        setStoreIconDraft(iconFromDb);

        // Загружаем офферы этого магазина
        const offersRes = await fetch(`${API_BASE}/store/${sid}/offers`);
        if (!offersRes.ok) throw new Error('get offers failed');
        const offersJson = await offersRes.json();
        setSellerOffers(offersJson.offers || []);
      } catch (err) {
        console.warn('Seller store init error:', err);
      }
    };

    initSellerStore();
  }, [role]);

  // --- TonConnect Proof: загружаем payload до открытия шторки ---
  useEffect(() => {
    if (!tonConnectUI) return;

    const loadProofPayload = async () => {
      // Ставим состояние loading пока загружаемся nonce
      tonConnectUI.setConnectRequestParameters({ state: 'loading' });
      try {
        const res = await fetch(`${API_BASE}/auth/proof-payload`);
        if (!res.ok) throw new Error('proof-payload fetch failed');
        const { payload } = await res.json();
        // Передаём payload кошельку: она попросит подписать его подписью
        tonConnectUI.setConnectRequestParameters({
          state: 'ready',
          value: { tonProof: payload }
        });
      } catch (err) {
        console.warn('Failed to load proof payload:', err);
        // При ошибке открываем кошелёк без proof (деградация)
        tonConnectUI.setConnectRequestParameters(null);
      }
    };

    loadProofPayload();
  }, [tonConnectUI]);

  // --- TonConnect Proof: обрабатываем результат подключения и шлём proof на бэкенд ---
  useEffect(() => {
    if (!tonConnectUI) return;

    const unsubscribe = tonConnectUI.onStatusChange(async (walletInfo) => {
      // Кошелёк отключен — сбрасываем статус
      if (!walletInfo) {
        setWalletVerified(false);
        try { localStorage.removeItem('wallet_verified'); } catch {}
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
        
        const mappedItems = (data.offers || []).map(offer => ({
          id: offer.id,
          icon: offer.icon || '🎟️',
          nameKey: offer.name,
          name: offer.name,
          price: `${parseFloat(offer.price_ton).toFixed(2)} ₮`,
          priceVal: parseFloat(offer.price_ton),
          total: parseInt(offer.total_count),
          unitKey: 'pcs',
          desc: `${offer.pay_count}+${offer.total_count - offer.pay_count}`,
          ...getThemeByIcon(offer.icon || '')
        }));

        // Update selected store with loaded items
        setSelectedStore(prev => {
          if (!prev || prev.id !== selectedStore.id) return prev;
          return { ...prev, items: mappedItems };
        });

        // Also update the store in the addedStores list so it is preserved!
        setAddedStores(prevStores => prevStores.map(s => {
          if (s.id === selectedStore.id) {
            return { ...s, items: mappedItems };
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
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    setQrModalState({ isOpen: true, isClosing: false, pass });
  };

  const handleUpdateStoreName = async () => {
    const trimmed = storeNameDraft.trim();
    if (!trimmed || isUpdatingStoreName) return;
    setIsUpdatingStoreName(true);
    try {
      if (!storeId) {
        // Если ID магазина пустой (например, после удаления), создаем новый магазин
        const userId = tgUser?.id ? String(tgUser.id) : 'dev_seller_1';
        const res = await fetch(`${API_BASE}/create-store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner_id: userId, name: trimmed, icon: storeIconDraft })
        });
        if (!res.ok) throw new Error('create-store failed');
        const json = await res.json();
        const sid = json.store?.id;
        if (!sid) throw new Error('No store_id returned');
        
        setStoreId(sid);
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
    } catch (err) {
      console.error('Failed to save store name:', err);
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      alert(t('save_failed'));
    } finally {
      setIsUpdatingStoreName(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeId || isDeletingStore) return;
    const tg = window.Telegram?.WebApp;
    // Нативный диалог подтверждения
    const confirmed = await new Promise((resolve) => {
      if (tg?.showConfirm) {
        tg.showConfirm(t('delete_store_confirm'), (ok) => resolve(ok));
      } else {
        resolve(window.confirm(t('delete_store_confirm')));
      }
    });
    if (!confirmed) return;

    setIsDeletingStore(true);
    try {
      const res = await fetch(`${API_BASE}/delete-store/${storeId}`, { method: 'POST' });
      if (!res.ok) throw new Error('delete-store failed');
      // Сбрасываем всё состояние магазина
      setStoreId(null);
      setStoreName('');
      setStoreNameDraft('');
      setSellerOffers([]);
      setIsEditingStoreName(false);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    } catch (err) {
      console.error('Failed to delete store:', err);
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
      alert(t('delete_store_failed'));
    } finally {
      setIsDeletingStore(false);
    }
  };

  const closeQR = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    setQrModalState(prev => ({ ...prev, isClosing: true }));
    setTimeout(() => {
      setQrModalState({ isOpen: false, isClosing: false, pass: null });
    }, 300);
  };

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
    if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    
    // Check if the QR code represents a store to add (no role check to avoid stale closure issues)
    if (text && text.startsWith('Store_')) {
      const storeId = text.substring(6).trim();
      const storeToFind = STORES_DATA.find(s => s.id.toLowerCase() === storeId.toLowerCase() || s.name.toLowerCase() === storeId.toLowerCase());
      
      if (storeToFind) {
        setAddedStores(prevStores => {
          const alreadyAdded = prevStores.find(s => s.id === storeToFind.id);
          if (alreadyAdded) {
            // Move to the top of the list!
            const remainingStores = prevStores.filter(s => s.id !== storeToFind.id);
            if (tg?.showAlert) {
              tg.showAlert(t('store_already_added', { name: storeToFind.name }));
            } else {
              alert(t('store_already_added', { name: storeToFind.name }));
            }
            return [storeToFind, ...remainingStores];
          } else {
            // Add to the top of the list!
            if (tg?.showAlert) {
              tg.showAlert(t('new_store_added', { name: storeToFind.name }));
            } else {
              alert(t('new_store_added', { name: storeToFind.name }));
            }
            return [storeToFind, ...prevStores];
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
            items: [] // Will fetch offers dynamically when selected
          };

          setAddedStores(prevStores => {
            const alreadyAdded = prevStores.find(s => s.id === newStore.id);
            if (alreadyAdded) {
              const remainingStores = prevStores.filter(s => s.id !== newStore.id);
              if (tg?.showAlert) {
                tg.showAlert(t('store_already_added', { name: newStore.name }));
              } else {
                alert(t('store_already_added', { name: newStore.name }));
              }
              return [newStore, ...remainingStores];
            } else {
              if (tg?.showAlert) {
                tg.showAlert(t('new_store_added', { name: newStore.name }));
              } else {
                alert(t('new_store_added', { name: newStore.name }));
              }
              return [newStore, ...prevStores];
            }
          });
        } else {
          throw new Error('Invalid store response');
        }
        return;
      } catch (err) {
        console.warn('Failed to load scanned store from backend:', err);
        if (tg?.showAlert) {
          tg.showAlert(`Failed to load scanned store "${storeId}". Check connection or QR code.`);
        } else {
          alert(`Failed to load scanned store "${storeId}". Check connection or QR code.`);
        }
        return;
      }
    }
    
    if (tg?.showAlert) {
      tg.showAlert(`Scanned QR: ${text}`);
    } else {
      alert(`Scanned QR: ${text}`);
    }
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
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        {/* Header */}
        <header 
          style={{ paddingTop: `calc(${safeAreaTop > 0 ? '2.25rem' : '1.25rem'} + ${safeAreaTop}px)` }}
          className="pb-2 px-6 flex justify-between items-center z-50 bg-inherit shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer shrink-0">
              <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Нативная смарт-кнопка TON Connect. Сама меняет состояние при подключении */}
            <div className="shrink-0 relative">
              <TonConnectButton style={{ width: 'max-content' }} />
              {/* Индикатор верификации proof */}
              {wallet && (
                <div className="absolute -top-1 -right-1 pointer-events-none">
                  {isVerifying ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white dark:border-[#121214] animate-spin" style={{borderTopColor:'transparent'}} />
                  ) : walletVerified ? (
                    <div className="w-3.5 h-3.5 rounded-full bg-[#26A17B] border-2 border-white dark:border-[#121214] animate-pulse" title={t('wallet_verified')} />
                  ) : null}
                </div>
              )}
            </div>
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
                    {myPasses.map((pass) => (
                      <div key={pass.id} className={`snap-center shrink-0 w-[280px] h-[160px] rounded-3xl bg-linear-to-br ${pass.colors} p-5 flex flex-col justify-between relative overflow-hidden shadow-lg`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                        
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <span className="bg-white/20 text-white/90 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">{pass.vendor}</span>
                            <h3 className="text-white font-bold text-xl mt-2">{t(pass.nameKey)}</h3>
                          </div>
                          <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                            {pass.icon === 'coffee' ? <Coffee size={20} /> : <span className="text-xl">{pass.icon}</span>}
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-end z-10">
                          <div>
                            <p className="text-white/70 text-xs mb-1">{t('left')}</p>
                            <p className="text-white font-bold text-2xl leading-none">
                              {pass.current} <span className="text-sm font-medium text-white/70">/ {pass.total} {t(pass.unitKey)}</span>
                            </p>
                          </div>
                          <button onClick={() => openQR(pass)} className={`w-10 h-10 bg-white rounded-full flex items-center justify-center ${pass.btnColor} hover:scale-105 transition-transform shadow-md`}>
                            <QrCode size={20} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {myPasses.length === 0 && (
                      <div className="w-full text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                        {t('no_active_passes')}
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
                        <div className="text-center py-10 bg-white dark:bg-[#1E1E22] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm text-gray-500 dark:text-gray-400 text-sm">
                          {t('no_stores')}
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

                              <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-gray-50 dark:bg-[#121214] border border-gray-150 dark:border-gray-850 group-hover:bg-[#26A17B] group-hover:text-white text-gray-400 transition-all">
                                <span className="text-lg font-bold group-hover:translate-x-0.5 transition-transform">→</span>
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
                    <div className="px-6 mb-4 flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const tg = window.Telegram?.WebApp;
                          if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');
                          setSelectedStore(null);
                        }}
                        className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-[#1E1E22] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 shadow-sm hover:text-[#26A17B] active:scale-95 transition-all"
                      >
                        <span className="text-lg font-bold">←</span>
                      </button>
                      <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('back_to_list')}</span>
                    </div>

                    <div className="mx-6 mb-6 rounded-3xl p-5 bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-[#1E1E22] dark:to-[#121214] relative overflow-hidden shadow-md flex items-center gap-4 border border-white/5">
                      <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-[#26A17B]/10 rounded-full blur-xl"></div>
                      <div className="absolute -right-10 -top-10 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>

                      {/* Subtle dismiss ✕ in the top-right corner */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const tg = window.Telegram?.WebApp;
                          const confirmMessage = t('remove_store_confirm');
                          const performRemove = () => {
                            setAddedStores(prev => prev.filter(s => s.id !== selectedStore.id));
                            setSelectedStore(null);
                            if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                          };
                          if (tg && typeof tg.showConfirm === 'function') {
                            tg.showConfirm(confirmMessage, (ok) => { if (ok) performRemove(); });
                          } else {
                            if (window.confirm(confirmMessage)) performRemove();
                          }
                        }}
                        className="absolute top-3 right-3 z-20 w-6 h-6 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/16 text-white/40 hover:text-white/80 transition-all active:scale-90 cursor-pointer"
                        title={t('remove_store_confirm')}
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                      
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
                              const handleBuyPass = () => {
                                const tg = window.Telegram?.WebApp;
                                if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

                                const itemName = item.nameKey ? t(item.nameKey) : (item.name || 'Pass');
                                const alreadyOwnedIdx = myPasses.findIndex(p => p.vendor === selectedStore.name && (p.nameKey === item.nameKey || p.name === item.name));

                                let updatedPasses;
                                if (alreadyOwnedIdx !== -1) {
                                  updatedPasses = [...myPasses];
                                  updatedPasses[alreadyOwnedIdx] = {
                                    ...updatedPasses[alreadyOwnedIdx],
                                    current: Math.min(updatedPasses[alreadyOwnedIdx].total, updatedPasses[alreadyOwnedIdx].current + 1)
                                  };
                                } else {
                                  const newPass = {
                                    id: Date.now(),
                                    vendor: selectedStore.name,
                                    nameKey: item.nameKey || '',
                                    name: item.name || '',
                                    icon: item.icon === '☕️' ? 'coffee' : item.icon,
                                    current: item.total,
                                    total: item.total,
                                    unitKey: item.unitKey || 'pcs',
                                    colors: item.colors || ['from-emerald-500', 'to-teal-600'],
                                    btnColor: item.btnColor || 'bg-emerald-500 text-white',
                                    theme: item.theme || 'emerald'
                                  };
                                  updatedPasses = [newPass, ...myPasses];
                                }

                                setMyPasses(updatedPasses);

                                if (tg?.showAlert) {
                                  tg.showAlert(t('pass_bought', { name: itemName }));
                                } else {
                                  alert(t('pass_bought', { name: itemName }));
                                }
                              };

                              return (
                                <div key={item.id} className="bg-white dark:bg-[#1E1E22] rounded-3xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center relative overflow-hidden hover:border-[#26A17B]/40 transition-colors animate-fade-in">
                                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-850 text-[10px] font-bold text-gray-500 dark:text-gray-400">
                                    {selectedStore.name}
                                  </div>

                                  <div className="absolute top-3 right-3 bg-[#26A17B] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    {item.desc}
                                  </div>

                                  <div className="w-16 h-16 bg-gray-50 dark:bg-[#121214] border border-gray-100 dark:border-gray-850 rounded-full flex items-center justify-center text-3xl mt-6 mb-3 shadow-inner shrink-0">
                                    {item.icon}
                                  </div>

                                  <h4 className="font-bold text-sm text-gray-900 dark:text-white mb-1">
                                    {item.nameKey ? t(item.nameKey) : (item.name || 'Pass')}
                                  </h4>
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">{item.total} {t(item.unitKey || 'pcs')}</p>

                                  <button 
                                    onClick={handleBuyPass}
                                    className="mt-auto w-full py-2.5 bg-gray-50 hover:bg-[#26A17B]/10 dark:bg-[#121214] dark:hover:bg-[#26A17B]/20 border border-gray-200 dark:border-gray-800 rounded-2xl text-[#26A17B] font-bold text-sm transition-all hover:scale-[1.02] active:scale-95"
                                  >
                                    {item.price}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                          {(!selectedStore.items || selectedStore.items.length === 0) && (
                            <div className="text-center py-10 bg-white dark:bg-[#1E1E22] rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm text-gray-500 dark:text-gray-400 text-sm">
                              {t('no_offers')}
                            </div>
                          )}
                        </>
                      )}
                    </section>
                  </div>
                )}
              </>
            ) : (
              <section className="px-6 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">{t('seller_dashboard')}</h2>
                  <button 
                    onClick={() => {
                      const tg = window.Telegram?.WebApp;
                      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
                      if (!storeId || !storeName) {
                        if (tg?.showAlert) {
                          tg.showAlert(t('store_name_required'));
                        } else {
                          alert(t('store_name_required'));
                        }
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
                      {/* Icon picker row */}
                      <div className="bg-white dark:bg-[#1E1E22] rounded-2xl px-3 py-2.5 border border-gray-200 dark:border-gray-800 shadow-sm">
                        <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{t('store_icon_label')}</p>
                        <div className="flex flex-wrap gap-1.5">
                          {['🏪','☕️','🍕','🌮','🌯','🧋','🍦','🥐','🍩','🥗','🍣','🌸','🛍️','💈','🍗','🥙','🍔','🧁','🍺','🎂'].map(icon => (
                            <button
                              key={icon}
                              onClick={() => {
                                setStoreIconDraft(icon);
                                const tg = window.Telegram?.WebApp;
                                if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                              }}
                              className={`w-9 h-9 text-xl rounded-xl flex items-center justify-center transition-all active:scale-90 ${
                                storeIconDraft === icon
                                  ? 'bg-[#26A17B]/15 ring-2 ring-[#26A17B] scale-110'
                                  : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              {icon}
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
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 transition-colors shrink-0"
                          title={t('delete_store')}
                        >
                          {isDeletingStore ? <span className="text-xs animate-spin">⏳</span> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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
                        setIsAddOfferOpen(true);
                        setIsAddOfferClosing(false);
                      }}
                      className="w-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl p-6 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#1E1E22] transition-colors bg-transparent text-center"
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
                            try {
                              const res = await fetch(`${API_BASE}/delete-offer/${offer.id}`, {
                                method: 'POST'
                              });
                              if (!res.ok) throw new Error('delete failed');
                              setSellerOffers(prev => prev.filter(o => o.id !== offer.id));
                              if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
                            } catch (err) {
                              console.error('Failed to delete offer:', err);
                              if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                              alert(t('delete_failed'));
                            }
                          }}
                          className="w-9 h-9 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 hover:text-red-600 transition-colors shrink-0"
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
              </section>
            )}
          </div>
        ) : activeTab === 'settings' ? (
          <section className="px-6 mt-6 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6">{t('settings')}</h2>
            
            {/* Переключатель роли */}
            <div className="bg-white dark:bg-[#1E1E22] rounded-2xl p-1.5 border border-gray-200 dark:border-gray-800 shadow-sm flex mb-6">
              <button 
                onClick={() => setRole('buyer')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${role === 'buyer' ? 'bg-[#F4F5F9] dark:bg-[#2C2C32] text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
              >
                {t('buyer')}
              </button>
              <button 
                onClick={() => setRole('seller')}
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
          </section>
        ) : activeTab === 'history' ? (
          <section className="px-6 mt-6 animate-slide-up">
            <h2 className="text-2xl font-bold mb-6">{t('history')}</h2>

            <div className="space-y-3">
              {HISTORY_TRANSACTIONS.length > 0 ? (
                HISTORY_TRANSACTIONS.map((tx) => (
                  <div key={tx.id} className="bg-white dark:bg-[#1E1E22] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between transition-colors hover:border-gray-300 dark:hover:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'purchase' ? 'bg-blue-50 text-blue-500 dark:bg-blue-500/10' : 'bg-orange-50 text-orange-500 dark:bg-orange-500/10'}`}>
                        {tx.type === 'purchase' ? <Plus size={18} /> : <Minus size={18} />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white leading-tight mb-0.5">{t(tx.titleKey)}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{tx.vendor} • {tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">
                        {tx.items} {t(tx.unitKey)}
                      </p>
                      {tx.amount && <p className="text-xs text-[#26A17B] font-medium mt-0.5">{tx.amount}</p>}
                    </div>
                  </div>
                ))
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

      {/* Floating Bottom Navigation */}
      <nav className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white/10 dark:bg-[#1E1E22]/10 backdrop-blur-3xl rounded-full px-6 py-4 flex justify-between items-center shadow-lg z-50 border border-white/20 dark:border-white/5">
  <button 
    onClick={() => setActiveTab('home')} 
    className={`flex flex-col items-center gap-1 transition ${activeTab === 'home' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
  >
    <Layers size={22} />
  </button>
  
  <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-900 dark:hover:text-white transition">
    <Store size={22} />
  </button>
  
  <button 
    onClick={openScanner}
    className="w-12 h-12 -mt-10 rounded-full bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 shadow-lg transform hover:scale-105 transition border-4 border-[#F4F5F9] dark:border-[#121214]"
  >
    <ScanLine size={24} />
  </button>

  <button
    onClick={() => setActiveTab('history')}
    className={`flex flex-col items-center gap-1 transition ${activeTab === 'history' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
  >
    <History size={22} />
  </button>

  <button 
    onClick={() => setActiveTab('settings')} 
    className={`flex flex-col items-center gap-1 transition ${activeTab === 'settings' ? 'text-gray-900 dark:text-white' : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'}`}
  >
    <Settings size={22} />
  </button>
</nav>

      {/* QR Modal Overlay */}
      {qrModalState.isOpen && (
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
              <h3 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('get_pass', { name: t(qrModalState.pass?.nameKey) })}</h3>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6 mt-1">{t('show_code')}</p>
            
            <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.05)] dark:shadow-none mb-6 border border-gray-200 dark:border-gray-800">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Redeem_${qrModalState.pass?.id}`} alt="QR Code" className="w-48 h-48 rounded-xl" />
            </div>
            
            <div className="w-full bg-[#F4F5F9] dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex justify-between items-center mb-6">
              <span className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('your_balance')}</span>
              <span className="font-bold text-lg text-gray-900 dark:text-white">{qrModalState.pass?.current} {t(qrModalState.pass?.unitKey)}</span>
            </div>

            <button onClick={closeQR} className="w-full py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-bold text-gray-900 dark:text-white text-lg">
              {t('done')}
            </button>
          </div>
        </div>
      )}

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
              <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white text-center">{t('create_offer')}</h3>
            </div>

            {/* Выбор иконки (эмодзи) */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-2">{t('select_icon')}</label>
              <div className="grid grid-cols-6 gap-2 bg-gray-50 dark:bg-[#121214] p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800">
                {['☕️', '🌯', '🌮', '🥐', '🍦', '🌭', '🥤', '🍰', '🍟', '🍔', '🍕', '🍩'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      setFormIcon(emoji);
                      const tg = window.Telegram?.WebApp;
                      if (tg?.HapticFeedback) tg.HapticFeedback.selectionChanged();
                    }}
                    className={`h-11 rounded-xl text-xl flex items-center justify-center transition ${formIcon === emoji ? 'bg-white dark:bg-gray-800 shadow-md scale-105 border border-gray-200 dark:border-gray-700' : 'opacity-60 hover:opacity-100'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Название предложения */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">{t('offer_name')}</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder={t('offer_name_placeholder')}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm text-gray-900 dark:text-white focus:outline-hidden focus:border-[#26A17B] transition-colors"
              />
            </div>

            {/* Цена пасса */}
            <div className="mb-5">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">{t('price')}</label>
              <input
                type="text"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="10.00"
                className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-[#26A17B] focus:outline-hidden focus:border-[#26A17B] transition-colors"
              />
            </div>

            {/* Конструктор Лояльности 4+1 или 9+1 */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div>
                <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">{t('pay_for')}</label>
                <select
                  value={formPay}
                  onChange={(e) => setFormPay(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-hidden"
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">{t('receive_total')}</label>
                <select
                  value={formGet}
                  onChange={(e) => setFormGet(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-[#121214] border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold text-gray-900 dark:text-white focus:outline-hidden"
                >
                  {[4, 5, 6, 7, 8, 9, 10, 11, 12].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            {/* Кнопка "Сохранить" */}
            <button
              onClick={async () => {
                if (!formName || !formPrice || isOfferSaving) return;
                if (!storeId) {
                  alert(t('store_not_created'));
                  return;
                }

                setIsOfferSaving(true);
                try {
                  const res = await fetch(`${API_BASE}/add-offer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      store_id: storeId,
                      icon: formIcon,
                      name: `${formName} ${formPay}+${parseInt(formGet) - parseInt(formPay)}`,
                      pay_count: parseInt(formPay),
                      total_count: parseInt(formGet),
                      price_ton: parseFloat(formPrice)
                    })
                  });

                  if (!res.ok) throw new Error('add-offer request failed');
                  const json = await res.json();

                  // Добавляем новый оффер в начало списка
                  setSellerOffers(prev => [json.offer, ...prev]);

                  // Тактильный отклик при успехе
                  const tg = window.Telegram?.WebApp;
                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

                  // Закрываем окно и сбрасываем форму
                  setIsAddOfferClosing(true);
                  setTimeout(() => {
                    setIsAddOfferOpen(false);
                    setFormName('');
                    setFormPrice('');
                    setFormIcon('☕️');
                  }, 300);
                } catch (err) {
                  console.error('Failed to save offer:', err);
                  const tg = window.Telegram?.WebApp;
                  if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
                  alert(t('save_failed'));
                } finally {
                  setIsOfferSaving(false);
                }
              }}
              disabled={!formName || !formPrice || isOfferSaving}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all ${(!formName || !formPrice || isOfferSaving) ? 'bg-gray-300 dark:bg-gray-800 cursor-not-allowed opacity-50' : 'bg-[#26A17B] hover:bg-[#208a69] active:scale-[0.99]'}`}
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
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=Store_${storeId}`} 
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
    </div>
  );
}