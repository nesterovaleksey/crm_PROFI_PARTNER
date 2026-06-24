import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, KeyRound, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Lock } from 'lucide-react';

export default function VerificationScreen({ tgUser, onVerified }) {
  const [step, setStep] = useState(1); // 1 = Email input, 2 = Code input
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [driverName, setDriverName] = useState('');

  // Step 1: Request verification code
  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const cleanEmail = email.trim().toLowerCase();

      // Call secure Database Function to request and generate code
      const { data: res, error: rpcErr } = await supabase
        .rpc('request_verification_code', { p_email: cleanEmail });

      if (rpcErr) throw rpcErr;

      // The function returns a table-like result array. Let's get the first row.
      const result = res && res[0];
      if (!result || !result.success) {
        setError(result?.error_message || 'Не удалось отправить код подтверждения.');
        setLoading(false);
        return;
      }

      const generatedCode = result.code;
      const dbDriverName = result.full_name;
      setDriverName(dbDriverName);

      // Send code to n8n webhook
      const n8nWebhookUrl = 'https://primary-production-e36b.up.railway.app/webhook/send-code';
      
      try {
        const response = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: cleanEmail,
            code: generatedCode,
            name: dbDriverName
          }),
        });
        
        if (!response.ok) {
          throw new Error('Не удалось отправить письмо через n8n');
        }
      } catch (webhookErr) {
        console.error('Webhook error sending verification code:', webhookErr);
        setError('Не удалось отправить код подтверждения. Пожалуйста, проверьте адрес вашей почты или попробуйте позже.');
        setLoading(false);
        return;
      }

      setSuccess(prev => prev || `Код подтверждения отправлен на почту ${cleanEmail}. Проверьте спам, если письмо не пришло.`);
      setStep(2);
    } catch (err) {
      console.error('Error during verification request:', err);
      setError('Произошла ошибка при отправке запроса. Пожалуйста, попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanCode = code.trim();

      // Call secure Database Function to verify and link
      const { data: isVerified, error: rpcErr } = await supabase
        .rpc('verify_and_link_driver', {
          p_email: cleanEmail,
          p_code: cleanCode,
          p_telegram_id: tgUser.id
        });

      if (rpcErr) throw rpcErr;

      if (!isVerified) {
        setError('Неверный код подтверждения или срок его действия истек.');
        setLoading(false);
        return;
      }

      setSuccess('Успешно авторизовано! Вход в личный кабинет...');
      
      setTimeout(() => {
        onVerified();
      }, 1200);

    } catch (err) {
      console.error('Error during verification:', err);
      setError('Ошибка авторизации. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 max-w-md mx-auto my-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-5">
        <Lock size={120} />
      </div>

      <div className="text-center mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-light)] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/20">
          <Lock className="text-white" size={22} />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">Авторизация профиля</h2>
        <p className="text-xs text-[var(--text-muted)] mt-1.5">
          Для доступа к доходам PROFI CRM подтвердите адрес вашей электронной почты
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 bg-[var(--error-glow)] border border-[var(--danger)]/20 text-[var(--danger)] rounded-xl flex gap-2.5 items-start text-xs animate-headShake">
          <AlertCircle className="shrink-0 mt-0.5" size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3.5 bg-[var(--success-glow)] border border-[var(--success)]/20 text-[var(--success)] rounded-xl flex gap-2.5 items-start text-xs">
          <CheckCircle2 className="shrink-0 mt-0.5" size={16} />
          <span>{success}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleRequestCode} className="space-y-5 relative z-10">
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2">
              Ваш E-mail
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[var(--text-dim)]">
                <Mail size={18} />
              </span>
              <input
                type="email"
                placeholder="driver@profi.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-11"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full btn-primary"
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <>
                <span>Получить пароль</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyCode} className="space-y-5 relative z-10">
          <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-darker)] px-3.5 py-2.5 rounded-xl border border-[var(--border-glass)] flex justify-between items-center">
            <span>Водитель:</span>
            <strong className="text-[var(--text-primary)]">{driverName}</strong>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider mb-2">
              Одноразовый пароль (Код)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[var(--text-dim)]">
                <KeyRound size={18} />
              </span>
              <input
                type="text"
                placeholder="Введите 6-значный код"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={10}
                className="input-field pl-11 tracking-widest font-bold"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSuccess('');
                setError('');
              }}
              className="w-1/3 btn-secondary"
              disabled={loading}
            >
              Назад
            </button>
            <button
              type="submit"
              className="w-2/3 btn-primary"
              disabled={loading}
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={18} />
              ) : (
                <span>Войти</span>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
