import React, { useState } from 'react';
import { Smartphone, X, ChevronDown, ChevronUp, Info, HelpCircle } from 'lucide-react';

export default function ShortcutModal({ isOpen, onClose }) {
  const [showInstructions, setShowInstructions] = useState(false);
  const [activeTab, setActiveTab] = useState('android'); // 'android' or 'ios'

  if (!isOpen) return null;

  const handleInstall = () => {
    if (window.Telegram?.WebApp?.addToHomeScreen) {
      window.Telegram.WebApp.addToHomeScreen();
    }
    onClose();
  };

  const handleDismiss = () => {
    localStorage.setItem('dismissed_shortcut_prompt', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div className="glass-card w-full max-w-md p-6 relative overflow-hidden flex flex-col gap-5 premium-glow border border-[var(--border-glow)]">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--text-dim)] hover:text-white transition-colors p-1"
        >
          <X size={20} />
        </button>

        {/* Branded Icon Header */}
        <div className="flex flex-col items-center text-center mt-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-3">
            <Smartphone className="text-[var(--bg-darker)]" size={28} />
          </div>
          <h2 className="text-lg font-bold tracking-wide text-[var(--text-main)]">
            Добавить на рабочий стол
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed max-w-xs">
            Установите ярлык приложения PROFI Partner для быстрого и удобного доступа к балансу и отчетам в один клик.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5 w-full">
          <button 
            onClick={handleInstall}
            className="btn-primary w-full py-3"
          >
            Создать ярлык
          </button>
          
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="btn-secondary w-full py-3 text-xs"
          >
            <HelpCircle size={16} />
            {showInstructions ? 'Скрыть инструкцию' : 'Как настроить разрешения'}
            {showInstructions ? <ChevronUp size={14} className="ml-1" /> : <ChevronDown size={14} className="ml-1" />}
          </button>

          <button 
            onClick={handleDismiss}
            className="text-xs text-[var(--text-dim)] hover:text-white transition-colors py-2 text-center font-medium mt-1"
          >
            Больше не показывать
          </button>
        </div>

        {/* Dynamic Instructions Panel */}
        {showInstructions && (
          <div className="border-t border-[var(--border-glass)] pt-4 mt-1 flex flex-col gap-3 animate-fade-in max-h-[220px] overflow-y-auto pr-1">
            <div className="flex p-0.5 bg-[var(--bg-darker)] rounded-xl border border-[var(--border-glass)]">
              <button
                onClick={() => setActiveTab('android')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-center transition-all ${
                  activeTab === 'android' ? 'btn-primary !py-1 !px-2 shadow-none text-white' : 'text-[var(--text-dim)]'
                }`}
              >
                Android (Xiaomi/Samsung)
              </button>
              <button
                onClick={() => setActiveTab('ios')}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold text-center transition-all ${
                  activeTab === 'ios' ? 'btn-primary !py-1 !px-2 shadow-none text-white' : 'text-[var(--text-dim)]'
                }`}
              >
                iOS (iPhone)
              </button>
            </div>

            {activeTab === 'android' ? (
              <div className="text-left text-xs space-y-2.5 text-[var(--text-muted)] leading-relaxed">
                <p className="font-semibold text-[var(--text-main)] text-[11px] flex items-start gap-1.5">
                  <Info size={14} className="text-[var(--accent)] shrink-0 mt-0.5" />
                  Важно: на Android нужно включить разрешение для Telegram на создание ярлыков.
                </p>
                <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[11px]">
                  <li>Откройте <span className="text-[var(--text-main)] font-medium">Настройки</span> телефона.</li>
                  <li>Перейдите в <span className="text-[var(--text-main)] font-medium">Приложения</span> → <span className="text-[var(--text-main)] font-medium">Все приложения</span> → <span className="text-[var(--text-main)] font-medium">Telegram</span>.</li>
                  <li>Выберите <span className="text-[var(--text-main)] font-medium">Другие разрешения</span> (или Специальные разрешения).</li>
                  <li>Найдите и включите пункт <span className="text-[var(--text-main)] font-medium">«Ярлыки рабочего стола»</span> (или «Добавление ярлыков»).</li>
                </ol>
              </div>
            ) : (
              <div className="text-left text-xs space-y-2 text-[var(--text-muted)] leading-relaxed text-[11px]">
                <p>
                  На устройствах Apple ярлыки поддерживаются нативно, если установлена свежая версия iOS и официальный клиент Telegram.
                </p>
                <p className="font-semibold text-[var(--text-main)]">
                  Дополнительных настроек не требуется — достаточно подтвердить действие в стандартном всплывающем окне Telegram.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
