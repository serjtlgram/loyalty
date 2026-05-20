import React, { useState, useEffect } from 'react';
import { 
  Wallet, Moon, Sun, QrCode, Layers, 
  Store, ScanLine, History, Settings,
  Plus, Minus, Share2, PlusCircle
} from 'lucide-react';
import { TonConnectButton } from '@tonconnect/ui-react';

// Импортируем наши разделенные файлы
import './index.css';
import { LANGUAGES, TRANSLATIONS } from '../content/locales/translations';
import { MY_PASSES, MARKETPLACE_ITEMS, HISTORY_TRANSACTIONS, SELLER_OFFERS } from '../content/data/mockData';

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // 'home' | 'settings'
  const [lang, setLang] = useState('en'); // Default language is English
  const [role, setRole] = useState('buyer'); // 'buyer' | 'seller'
  const [qrModalState, setQrModalState] = useState({ isOpen: false, isClosing: false, pass: null });
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Стейты для продавца
  const [sellerOffers, setSellerOffers] = useState(SELLER_OFFERS);
  const [isAddOfferOpen, setIsAddOfferOpen] = useState(false);
  const [isAddOfferClosing, setIsAddOfferClosing] = useState(false);
  
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

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.expand();
      tg.ready();
      
      if (tg.colorScheme) {
        setIsDark(tg.colorScheme === 'dark');
      }

      // Автоматическое определение языка из Telegram
      const tgLang = tg.initDataUnsafe?.user?.language_code;
      if (tgLang && TRANSLATIONS[tgLang]) {
        setLang(tgLang); // Если язык поддерживается нами - ставим его
      } else if (tgLang) {
        setLang('en'); // Фолбэк для других языков (французский, немецкий и т.д.)
      }
    }
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark(!isDark);

  const openQR = (pass) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('medium');
    setQrModalState({ isOpen: true, isClosing: false, pass });
  };

  const closeQR = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('light');

    setQrModalState(prev => ({ ...prev, isClosing: true }));
    setTimeout(() => {
      setQrModalState({ isOpen: false, isClosing: false, pass: null });
    }, 300);
  };

  return (
    <div className={`max-w-md mx-auto h-screen flex flex-col relative overflow-hidden transition-colors duration-300 ${isDark ? 'bg-[#121214] text-white' : 'bg-[#F4F5F9] text-gray-900'}`}>
      {/* Header */}
      <header className="pt-6 pb-2 px-6 flex justify-between items-center z-50 bg-inherit shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer shrink-0">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Alexey&backgroundColor=f4f5f9" alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-0.5">{t('welcome')}</p>
            <h1 className="text-lg font-bold tracking-tight leading-none">Alex</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Нативная смарт-кнопка TON Connect. Сама меняет состояние при подключении */}
          <div className="shrink-0">
            <TonConnectButton />
          </div>
          <button onClick={toggleTheme} className="w-10 h-10 rounded-full bg-white dark:bg-[#1E1E22] border border-gray-200 dark:border-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-blue-500 transition shadow-sm shrink-0">
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Area Content Swapping */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-32">
        {activeTab === 'home' ? (
          <div className="animate-slide-up">
            {role === 'buyer' ? (
              <>
            <section className="mt-6 mb-8">
              <div className="px-6 mb-4 flex justify-between items-end">
                <h2 className="text-xl font-bold">{t('my_cards')}</h2>
                <span className="text-sm text-[#26A17B] font-medium">{t('active_count', { count: MY_PASSES.length })}</span>
              </div>
              
              <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-6 pb-4 gap-4">
                {MY_PASSES.map((pass) => (
                  <div key={pass.id} className={`snap-center shrink-0 w-[280px] h-[160px] rounded-3xl bg-linear-to-br ${pass.colors} p-5 flex flex-col justify-between relative overflow-hidden shadow-lg`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-xl"></div>
                    
                    <div className="flex justify-between items-start z-10">
                      <div>
                        <span className="bg-white/20 text-white/90 text-xs font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">{pass.vendor}</span>
                        <h3 className="text-white font-bold text-xl mt-2">{t(pass.nameKey)}</h3>
                      </div>
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white backdrop-blur-sm">
                        {pass.icon}
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
                <div className="snap-center shrink-0 w-2"></div>
              </div>
            </section>

            <section className="px-6">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-lg font-bold">{t('marketplace')}</h2>
                <span className="text-sm text-[#26A17B] font-medium cursor-pointer">{t('all_categories')}</span>
              </div>

              <div className="flex gap-2 mb-5 overflow-x-auto hide-scrollbar pb-1">
                <button className="px-4 py-1.5 rounded-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium whitespace-nowrap">{t('all')}</button>
                <button className="px-4 py-1.5 rounded-full bg-white dark:bg-[#1E1E22] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium whitespace-nowrap">{t('cat_coffee')}</button>
                <button className="px-4 py-1.5 rounded-full bg-white dark:bg-[#1E1E22] border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium whitespace-nowrap">{t('cat_shawarma')}</button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Создаем копию массива и сортируем по параметру orders (от большего к меньшему) */}
                {[...MARKETPLACE_ITEMS]
                  .sort((a, b) => b.orders - a.orders)
                  .map((item) => (
                  <div key={item.id} className="bg-white dark:bg-[#1E1E22] rounded-2xl p-4 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-[#26A17B]/50 transition-colors relative overflow-hidden">
                    {item.hit && (
                      <div className="absolute top-0 right-0 bg-[#26A17B] text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">{t('hit')}</div>
                    )}
                    <div className={`w-14 h-14 ${item.bg} rounded-full flex items-center justify-center text-2xl mb-3`}>
                      {item.icon}
                    </div>
                    <h4 className="font-bold text-sm mb-1">{t(item.nameKey)}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{item.desc}</p>
                    <div className="mt-auto w-full py-2 bg-[#F4F5F9] dark:bg-[#121214] rounded-xl text-[#26A17B] font-bold text-sm">
                      {item.price}
                    </div>
                  </div>
                ))}
              </div>
            </section>
              </>
            ) : (
              <section className="px-6 mt-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold">{t('seller_dashboard')}</h2>
                  <button className="bg-gray-100 dark:bg-[#1E1E22] text-gray-900 dark:text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-colors border border-gray-200 dark:border-gray-800">
                    <Share2 size={16} />
                    <span>{t('share_shop')}</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Кнопка добавления нового товара */}
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

                  {/* Список текущих предложений продавца */}
                  {sellerOffers.map((offer) => (
                    <div key={offer.id} className="bg-white dark:bg-[#1E1E22] rounded-3xl p-5 border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col relative overflow-hidden">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${offer.bg}`}>
                            {offer.icon}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{offer.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{offer.total} {t('pcs')} • {offer.price}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-800">
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('sold_count', { count: offer.sold })}</p>
                            <p className="font-medium text-gray-900 dark:text-white">{t('revenue')}: <span className="text-[#26A17B]">{offer.revenue}</span></p>
                          </div>
                          <button className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-bold text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                            {t('edit')}
                          </button>
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
    onClick={() => {
      const tg = window.Telegram?.WebApp;
      if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred('heavy');
      setIsScannerOpen(true);
    }}
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
          <div className={`bg-white dark:bg-[#1E1E22] w-full sm:w-11/12 sm:rounded-3xl rounded-t-3xl p-6 flex flex-col items-center shadow-2xl ${qrModalState.isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mb-6 sm:hidden cursor-pointer" onClick={closeQR}></div>
            
            <h3 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white">{t('get_pass', { name: t(qrModalState.pass?.nameKey) })}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-6">{t('show_code')}</p>
            
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
        <div className="absolute inset-0 z-100 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center animate-slide-up">
          {/* Viewfinder UI */}
          <div className="relative w-64 h-64 mb-8">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-[#26A17B] rounded-tl-3xl"></div>
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-[#26A17B] rounded-tr-3xl"></div>
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-[#26A17B] rounded-bl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-[#26A17B] rounded-br-3xl"></div>
            
            {/* Scanning Line */}
            <div className="absolute left-2 right-2 h-0.5 bg-[#26A17B] shadow-[0_0_15px_3px_rgba(38,161,123,0.5)] animate-scan"></div>
          </div>
          
          <p className="text-white/80 text-center text-sm font-medium max-w-[260px] mb-12">
            {role === 'buyer' ? t('scan_buyer_desc') : t('scan_seller_desc')}
          </p>
          
          <button 
            onClick={() => setIsScannerOpen(false)} 
            className="px-8 py-3 rounded-full bg-white/10 text-white font-bold backdrop-blur-md border border-white/20 hover:bg-white/30 transition-colors"
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
          <div className={`bg-white dark:bg-[#1E1E22] w-full sm:w-11/12 sm:rounded-3xl rounded-t-3xl p-6 flex flex-col shadow-2xl overflow-y-auto max-h-[85vh] hide-scrollbar ${isAddOfferClosing ? 'animate-slide-down' : 'animate-slide-up'}`}>
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mb-6 mx-auto cursor-pointer" onClick={() => {
              setIsAddOfferClosing(true);
              setTimeout(() => setIsAddOfferOpen(false), 300);
            }}></div>

            <h3 className="text-xl font-bold mb-6 text-gray-900 dark:text-white text-center">{t('create_offer')}</h3>

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
              onClick={() => {
                if (!formName || !formPrice) return;
                
                const formattedPrice = `${parseFloat(formPrice).toFixed(2)} ₮`;
                const newOfferObj = {
                  id: Date.now(),
                  icon: formIcon,
                  name: `${formName} ${formPay}+${parseInt(formGet) - parseInt(formPay)}`,
                  price: formattedPrice,
                  total: parseInt(formGet),
                  sold: 0,
                  revenue: '0.00 ₮',
                  bg: 'bg-emerald-50 dark:bg-emerald-500/10'
                };

                setSellerOffers([newOfferObj, ...sellerOffers]);
                
                // Тактильный отклик от телеграма при успехе
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
              }}
              disabled={!formName || !formPrice}
              className={`w-full py-4 rounded-2xl font-bold text-white text-lg transition-all ${(!formName || !formPrice) ? 'bg-gray-300 dark:bg-gray-800 cursor-not-allowed opacity-50' : 'bg-[#26A17B] hover:bg-[#208a69] active:scale-[0.99]'}`}
            >
              {t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}