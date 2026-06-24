import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import VerificationScreen from './components/VerificationScreen';
import MainMenu from './components/MainMenu';
import AdminPanel from './components/AdminPanel';
import { RefreshCw, ShieldAlert, Award } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // driver object from DB
  const [tgUser, setTgUser] = useState(null); // tg user from SDK or mock
  const [isTelegram, setIsTelegram] = useState(false);
  const [activeTab, setActiveTab] = useState('driver'); // 'driver' or 'admin'
  const [mockTgId, setMockTgId] = useState('');

  // 1. Initial Telegram Web App setup
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) {
      tg.ready();
      tg.expand();
      setIsTelegram(true);
      setTgUser(tg.initDataUnsafe.user);
      checkUser(tg.initDataUnsafe.user.id);
    } else {
      // Local development fallback
      setIsTelegram(false);
      const savedMock = localStorage.getItem('mock_tg_id');
      if (savedMock) {
        setMockTgId(savedMock);
        checkUser(parseInt(savedMock, 10));
      } else {
        setLoading(false);
      }
    }
  }, []);

  const checkUser = async (telegramId) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setUser(data);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error checking user:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = (e) => {
    e.preventDefault();
    if (!mockTgId) return;
    localStorage.setItem('mock_tg_id', mockTgId);
    setTgUser({ id: parseInt(mockTgId, 10), first_name: 'Test', last_name: 'Driver' });
    checkUser(parseInt(mockTgId, 10));
  };

  const handleLogout = () => {
    localStorage.removeItem('mock_tg_id');
    setUser(null);
    setTgUser(null);
    setMockTgId('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <RefreshCw className="animate-spin text-[var(--accent)] mb-4" size={40} />
        <p className="text-[var(--text-muted)] font-medium">Загрузка PROFI Partner...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] pb-10">
      {/* Dev Simulator Panel */}
      {!isTelegram && (
        <div className="bg-[var(--bg-main)] border-b border-[var(--border-glass)] p-4 flex flex-wrap items-center justify-between gap-4 relative z-50">
          <div className="flex items-center gap-2 text-[var(--warning)] font-semibold text-sm">
            <ShieldAlert size={18} />
            <span>Dev Simulator (Вне Telegram)</span>
          </div>
          {!tgUser ? (
            <form onSubmit={handleMockLogin} className="flex gap-2">
              <input
                type="number"
                placeholder="Telegram User ID"
                value={mockTgId}
                onChange={(e) => setMockTgId(e.target.value)}
                className="bg-[var(--bg-darker)] border border-[var(--border-glass)] px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:border-[var(--accent)]"
                required
              />
              <button type="submit" className="btn-primary !py-1.5 !text-sm">
                Войти
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-[var(--text-muted)]">
                Вошли как TG ID: <strong>{tgUser.id}</strong> {user ? `(Водитель: ${user.full_name})` : '(Не авторизован)'}
              </span>
              <button onClick={handleLogout} className="text-[var(--danger)] hover:underline">
                Выйти
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-6">
        {!tgUser ? (
          <div className="glass-card p-8 text-center my-10 space-y-5">
            <img
              src="https://static.tildacdn.net/tild3734-3735-4631-b565-616264303164/noroot.png"
              alt="PROFI Partner Logo"
              className="mx-auto"
              style={{ height: '48px' }}
            />
            <h1 className="text-xl font-bold tracking-wider">PROFI Partner</h1>
            <p className="text-xs text-[var(--text-muted)]">
              Пожалуйста, откройте это приложение внутри Telegram-бота или введите Telegram ID в симуляторе выше.
            </p>
          </div>
        ) : !user ? (
          <VerificationScreen tgUser={tgUser} onVerified={() => checkUser(tgUser.id)} />
        ) : !user.is_active ? (
          <div className="glass-card p-8 text-center my-10 space-y-5">
            <div className="w-16 h-16 rounded-full bg-[var(--danger-glow)] flex items-center justify-center mx-auto text-[var(--danger)]">
              <ShieldAlert size={36} />
            </div>
            <h1 className="text-xl font-bold tracking-wider text-[var(--danger)]">Доступ ограничен</h1>
            <p className="text-xs text-[var(--text-muted)] text-center">
              Ваш аккаунт деактивирован администратором. Пожалуйста, обратитесь к руководству для восстановления доступа.
            </p>
            {!isTelegram && (
              <button 
                onClick={handleLogout} 
                className="w-full btn-secondary text-xs py-2 mt-4"
              >
                Выйти из симулятора
              </button>
            )}
          </div>
        ) : (
          <div>
            {/* Header (Branded Logo & Info) */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img
                  src="https://static.tildacdn.net/tild3734-3735-4631-b565-616264303164/noroot.png"
                  alt="PROFI Partner Logo"
                  style={{ height: '36px' }}
                />
                <div>
                  <h1 className="text-md font-extrabold tracking-wider uppercase text-[var(--text-primary)]">PROFI Partner</h1>
                  <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-widest font-semibold">{user.full_name}</p>
                </div>
              </div>
              
              {user.is_admin && (
                <div className="flex p-1 bg-[var(--bg-main)] border border-[var(--border-glass)] rounded-xl">
                  <button
                    onClick={() => setActiveTab('driver')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'driver'
                        ? 'btn-primary !py-1 !px-2.5 shadow-none'
                        : 'text-[var(--text-dim)] hover:text-white'
                    }`}
                  >
                    Кабинет
                  </button>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === 'admin'
                        ? 'btn-primary !py-1 !px-2.5 shadow-none'
                        : 'text-[var(--text-dim)] hover:text-white'
                    }`}
                  >
                    Админ
                  </button>
                </div>
              )}
            </div>

            {/* Tab Content */}
            {activeTab === 'admin' && user.is_admin ? (
              <AdminPanel />
            ) : (
              <MainMenu driver={user} />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
