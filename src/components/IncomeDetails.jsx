import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function IncomeDetails({ data }) {
  // Helper to format currency (Zloty - PLN)
  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(num);
  };

  // Convert values safely
  const uberNettoGotowka = parseFloat(data.uber_netto_gotowka) || 0;
  const uberNetto = parseFloat(data.uber_netto) || 0;
  
  const boltNettoGotowka = parseFloat(data.bolt_netto_gotowka) || 0;
  const boltNetto = parseFloat(data.bolt_netto) || 0;
  
  const freenowNettoK = parseFloat(data.freenow_netto_k) || 0;
  const freenowNettoL = parseFloat(data.freenow_netto_l) || 0;

  // Cash Calculations
  const uberCash = uberNettoGotowka - uberNetto;
  const boltCash = boltNettoGotowka - boltNetto;
  const freenowCash = freenowNettoK - freenowNettoL;
  const totalCash = uberCash + boltCash + freenowCash;


  const vat = parseFloat(data.vat) || 0;
  const partner = parseFloat(data.partner) || 0;
  const auto = parseFloat(data.auto) || 0;
  const korekty = parseFloat(data.korekty) || 0;
  const zus = parseFloat(data.zus) || 0;
  const totalExpenses = vat + partner + auto + korekty + zus;

  const doWyplaty = parseFloat(data.do_wyplaty) || 0;
  const zwrotKosztow = parseFloat(data.zwrot_kosztow) || 0;
  const umowaZlecenie = parseFloat(data.umowa_zlecenie) || 0;
  
  const totalPayout = doWyplaty + zwrotKosztow + umowaZlecenie;

  // Section checks to hide complete cards if all fields are 0
  const hasRevenues = uberNettoGotowka !== 0 || boltNettoGotowka !== 0 || freenowNettoK !== 0;
  const hasExpenses = totalExpenses !== 0;

  return (
    <div className="flex-col gap-4">
      {/* 1. TO PAYOUT HERO CARD (No "Расчет готов" badge, flex aligned rows) */}
      <div className="glass-card p-5 bg-gradient-to-br from-[hsla(253,30%,16%,0.4)] to-transparent border border-[var(--border-glass)] relative overflow-hidden premium-glow">
        <div className="flex-col">
          <span className="text-xs text-dim font-bold uppercase tracking-wider block mb-1">
            Итого к выплате
          </span>
          <h2 className="text-3xl font-extrabold text-success tracking-tight mb-4">
            {formatCurrency(totalPayout)}
          </h2>
          
          {/* Payout breakdown rows (only non-zero, properly aligned left/right) */}
          <div className="divider">
            {doWyplaty !== 0 && (
              <div className="item-row">
                <span className="text-xs text-muted">Do wypłaty</span>
                <span className="font-bold text-sm">{formatCurrency(doWyplaty)}</span>
              </div>
            )}
            {zwrotKosztow !== 0 && (
              <div className="item-row">
                <span className="text-xs text-muted">Zwrot kosztów</span>
                <span className="font-bold text-sm">{formatCurrency(zwrotKosztow)}</span>
              </div>
            )}
            {umowaZlecenie !== 0 && (
              <div className="item-row">
                <span className="text-xs text-muted">Umowa zlecenie</span>
                <span className="font-bold text-sm">{formatCurrency(umowaZlecenie)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. REVENUES (No separate cash panel, cash in parens with 💵 icon, clean layout) */}
      {hasRevenues && (
        <div className="glass-card p-5 flex-col mt-4">
          <h3 className="text-xs font-extrabold text-success uppercase tracking-widest flex-row gap-2 pb-3 border-b border-[var(--border-glass)]">
            <ArrowUpRight className="bg-[var(--success-glow)] p-1 rounded-lg" size={24} />
            <span>Доходы</span>
          </h3>
          
          <div className="mt-2 flex-col">
            {uberNettoGotowka !== 0 && (
              <div className="item-row">
                <span className="text-sm text-muted">Uber</span>
                <span className="font-semibold text-sm flex-row gap-2">
                  <span>{formatCurrency(uberNettoGotowka)}</span>
                  {uberCash !== 0 && (
                    <span className="text-xs text-dim font-medium">
                      (💵 {formatCurrency(uberCash)})
                    </span>
                  )}
                </span>
              </div>
            )}

            {boltNettoGotowka !== 0 && (
              <div className="item-row">
                <span className="text-sm text-muted">Bolt</span>
                <span className="font-semibold text-sm flex-row gap-2">
                  <span>{formatCurrency(boltNettoGotowka)}</span>
                  {boltCash !== 0 && (
                    <span className="text-xs text-dim font-medium">
                      (💵 {formatCurrency(boltCash)})
                    </span>
                  )}
                </span>
              </div>
            )}

            {freenowNettoK !== 0 && (
              <div className="item-row">
                <span className="text-sm text-muted">FreeNow</span>
                <span className="font-semibold text-sm flex-row gap-2">
                  <span>{formatCurrency(freenowNettoK)}</span>
                  {freenowCash !== 0 && (
                    <span className="text-xs text-dim font-medium">
                      (💵 {formatCurrency(freenowCash)})
                    </span>
                  )}
                </span>
              </div>
            )}
            
            <div className="item-row mt-2 border-t border-[var(--border-glass)] pt-2">
              <span className="text-sm font-extrabold text-[var(--text-primary)]">Всего доходов</span>
              <span className="flex-row gap-2 items-center">
                <span className="text-sm font-extrabold text-[var(--text-primary)]">
                  {formatCurrency(uberNettoGotowka + boltNettoGotowka + freenowNettoK)}
                </span>
                {totalCash !== 0 && (
                  <span className="text-xs text-dim font-medium">
                    (💵 {formatCurrency(totalCash)})
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. EXPENSES (No tech names like ZUS/VAT/Partner, aligned left/right) */}
      {hasExpenses && (
        <div className="glass-card p-5 flex-col mt-4">
          <h3 className="text-xs font-extrabold text-danger uppercase tracking-widest flex-row gap-2 pb-3 border-b border-[var(--border-glass)]">
            <ArrowDownRight className="bg-[var(--danger-glow)] p-1 rounded-lg text-danger" size={24} />
            <span>Расходы и удержания</span>
          </h3>

          <div className="mt-2 flex-col">
            {vat !== 0 && (
              <div className="item-row text-xs">
                <span className="text-muted">Комиссия</span>
                <span className="font-semibold">{formatCurrency(vat)}</span>
              </div>
            )}
            {partner !== 0 && (
              <div className="item-row text-xs">
                <span className="text-muted">Партнерка</span>
                <span className="font-semibold">{formatCurrency(partner)}</span>
              </div>
            )}
            {auto !== 0 && (
              <div className="item-row text-xs">
                <span className="text-muted">Аренда</span>
                <span className="font-semibold">{formatCurrency(auto)}</span>
              </div>
            )}
            {korekty !== 0 && (
              <div className="item-row text-xs">
                <span className="text-muted">Прочее</span>
                <span className="font-semibold">{formatCurrency(korekty)}</span>
              </div>
            )}
            {zus !== 0 && (
              <div className="item-row text-xs border-t border-[var(--border-glass)] pt-2">
                <span className="text-muted">Налог</span>
                <span className="font-semibold">{formatCurrency(zus)}</span>
              </div>
            )}
            
            <div className="item-row mt-2 border-t border-[var(--border-glass)] pt-2">
              <span className="text-sm font-extrabold text-[var(--text-primary)]">Всего удержано</span>
              <span className="text-sm font-extrabold text-danger">{formatCurrency(totalExpenses)}</span>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
