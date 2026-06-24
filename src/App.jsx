import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import VerificationScreen from './components/VerificationScreen';
import MainMenu from './components/MainMenu';
import AdminPanel from './components/AdminPanel';
import { RefreshCw, ShieldAlert, Send } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null); // driver object from DB
  const [tgUser, setTgUser] = useState(null); // tg user from Telegram SDK
  const [isTelegram, setIsTelegram] = useState(false);
  const [activeTab, setActiveTab] = useState('driver'); // 'driver' or 'admin'

  // 1. Initial Telegram Web App setup
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initData) {
      tg.ready();
      tg.expand();
      setIsTelegram(true);
      setTgUser(tg.initDataUnsafe?.user || null);
      authenticateWithTelegram(tg.initData);
    } else {
      // Not inside Telegram — production: just show the "open in Telegram" screen
      setIsTelegram(false);
      setLoading(false);
    }
  }, []);

  const authenticateWithTelegram = async (initData) => {
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const res = await fetch(`${supabaseUrl}/functions/v1/telegram-auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        },
        body: JSON.stringify({ initData })
      });
      
      if (!res.ok) {
        throw new Error('Telegram verification failed');
      }
      
      const result = await res.json();
      
      if (result.success && result.is_verified && result.access_token) {
        // Sign in using Custom JWT session
        const { data, error } = await supabase.auth.setSession({
          access_token: result.access_token,
          refresh_token: result.access_token
        });
        if (error) throw error;
        
        setUser(result.driver || null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Error authenticating with Telegram:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
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

      {/* Main Container */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-6">
        {!isTelegram ? (
          /* ── Открыто не в Telegram – боевой экран ── */
          <div className="glass-card p-10 text-center my-10 space-y-6">
            <img
              src="https://static.tildacdn.net/tild3734-3735-4631-b565-616264303164/noroot.png"
              alt="PROFI Partner Logo"
              className="mx-auto"
              style={{ height: '52px' }}
            />
            <div>
              <h1 className="text-xl font-bold tracking-wider mb-2">PROFI Partner</h1>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                Это приложение работает только внутри Telegram.
              </p>
            </div>
            <div className="flex flex-col items-center gap-3 pt-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <Send className="text-white" size={26} />
              </div>
              <p className="text-xs text-[var(--text-dim)] max-w-xs">
                Откройте приложение через Telegram-бота PROFI Partner, чтобы получить доступ к вашему личному кабинету.
              </p>
            </div>
          </div>
        ) : !user ? (
          <VerificationScreen tgUser={tgUser} onVerified={() => authenticateWithTelegram(window.Telegram?.WebApp?.initData)} />
        ) : !user.is_active ? (
          <div className="glass-card p-8 text-center my-10 space-y-5">
            <div className="w-16 h-16 rounded-full bg-[var(--danger-glow)] flex items-center justify-center mx-auto text-[var(--danger)]">
              <ShieldAlert size={36} />
            </div>
            <h1 className="text-xl font-bold tracking-wider text-[var(--danger)]">Доступ ограничен</h1>
            <p className="text-xs text-[var(--text-muted)] text-center">
              Ваш аккаунт деактивирован администратором. Пожалуйста, обратитесь к руководству для восстановления доступа.
            </p>
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
