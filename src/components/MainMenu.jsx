import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import IncomeDetails from './IncomeDetails';
import CalendarSelector from './CalendarSelector';
import { RefreshCw, Inbox, CalendarRange, ChevronDown, ChevronUp } from 'lucide-react';

export default function MainMenu({ driver }) {
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [incomeData, setIncomeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchingIncome, setFetchingIncome] = useState(false);
  const [error, setError] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Helper: Parse period name like "11.05-17.05 2026" to Date for sorting
  const parsePeriodDate = (periodStr) => {
    try {
      const parts = periodStr.split(' ');
      const year = parseInt(parts[1], 10);
      const days = parts[0].split('-');
      const mondayParts = days[0].split('.');
      const day = parseInt(mondayParts[0], 10);
      const month = parseInt(mondayParts[1], 10) - 1;
      return new Date(year, month, day);
    } catch (e) {
      return new Date(0);
    }
  };

  const fetchDefaultPeriod = async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: err } = await supabase
        .from('weekly_incomes')
        .select('period_name')
        .eq('driver_id', driver.id);

      if (err) throw err;

      // Extract unique period names and sort by date descending (latest first)
      const uniquePeriods = [...new Set(data.map(item => item.period_name))];
      uniquePeriods.sort((a, b) => parsePeriodDate(b) - parsePeriodDate(a));
      
      if (uniquePeriods.length > 0) {
        setSelectedPeriod(uniquePeriods[0]); // Select the most recent week by default
      } else {
        // Fallback: If no records exist at all, set current week as default
        const today = new Date();
        const monday = new Date(today);
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1);
        monday.setDate(diff);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        const formatDate = (d) => {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return `${dd}.${mm}`;
        };
        
        setSelectedPeriod(`${formatDate(monday)}-${formatDate(sunday)} ${monday.getFullYear()}`);
      }
    } catch (err) {
      console.error('Error fetching default period:', err);
      setError('Не удалось загрузить периоды.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDefaultPeriod();
  }, [driver.id]);

  useEffect(() => {
    if (!selectedPeriod) {
      setIncomeData(null);
      return;
    }

    const fetchIncomeData = async () => {
      setFetchingIncome(true);
      setError('');
      try {
        const { data, error: err } = await supabase
          .from('weekly_incomes')
          .select('*')
          .eq('driver_id', driver.id)
          .eq('period_name', selectedPeriod)
          .maybeSingle();

        if (err) throw err;
        setIncomeData(data);
      } catch (err) {
        console.error('Error fetching income data:', err);
        setError('Не удалось загрузить данные по доходам за выбранный период.');
        setIncomeData(null);
      } finally {
        setFetchingIncome(false);
      }
    };

    fetchIncomeData();
  }, [selectedPeriod, driver.id]);

  const handlePeriodChange = (pStr) => {
    setSelectedPeriod(pStr);
    setCalendarOpen(false);
  };

  if (loading) {
    return (
      <div className="flex-col flex-center py-16">
        <RefreshCw className="animate-spin text-accent mb-3" size={32} />
        <span className="text-sm text-dim font-medium">Инициализация кабинета...</span>
      </div>
    );
  }

  return (
    <div className="flex-col gap-4">
      {/* Clickable Selected Week Selector Box (Toggles Calendar) */}
      {selectedPeriod && (
        <div 
          onClick={() => setCalendarOpen(!calendarOpen)}
          className="glass-card p-4 flex-between border-l-2 border-l-accent cursor-pointer hover:border-l-accent-light transition-all select-none"
        >
          <div className="flex-row gap-3">
            <CalendarRange className="text-accent" size={22} />
            <div className="flex-col">
              <span className="text-[10px] text-dim font-bold uppercase tracking-wider block">
                Отчетный период
              </span>
              <span className="text-sm font-semibold text-main">
                {selectedPeriod.split(' ')[0]} ({selectedPeriod.split(' ')[1]} г.)
              </span>
            </div>
          </div>
          <div className="flex-row gap-2">
            <span className="text-xs text-dim">Выбрать период</span>
            {calendarOpen ? (
              <ChevronUp className="text-muted" size={16} />
            ) : (
              <ChevronDown className="text-muted" size={16} />
            )}
          </div>
        </div>
      )}

      {/* Collapsable Calendar Selector */}
      {calendarOpen && (
        <div className="mt-3">
          <CalendarSelector
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </div>
      )}

      {error && (
        <div className="p-4 bg-[var(--error-glow)] border border-[var(--danger)]/30 text-danger rounded-xl text-xs mt-3">
          {error}
        </div>
      )}

      {/* Income Details View / Empty State / Loading */}
      <div className="mt-3">
        {fetchingIncome ? (
          <div className="flex-col flex-center py-16">
            <RefreshCw className="animate-spin text-accent mb-3" size={28} />
            <span className="text-xs text-dim">Загрузка данных...</span>
          </div>
        ) : incomeData ? (
          <IncomeDetails data={incomeData} />
        ) : (
          selectedPeriod && (
            <div className="glass-card p-8 text-center my-6 flex-col flex-center">
              <Inbox className="text-dim mb-4 animate-pulse" size={44} />
              <h3 className="text-lg font-bold mb-1">Данных нет</h3>
              <p className="text-sm text-muted max-w-xs mx-auto">
                За отчетный период ({selectedPeriod.split(' ')[0]}) нет начисленных доходов для вашей учетной записи.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
