import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Check } from 'lucide-react';

export default function CalendarSelector({ selectedPeriod, onPeriodChange }) {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 4, 15)); // Default to May 2026
  const [hoveredPeriod, setHoveredPeriod] = useState('');
  const [pendingPeriod, setPendingPeriod] = useState(''); // Highlighted but not yet confirmed

  // Helper: Find Monday of the week containing the date
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  };

  // Helper: Format date to DD.MM
  const formatDateLabel = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
  };

  // Helper: Get period string for a date (DD.MM-DD.MM YYYY)
  const getPeriodString = (d) => {
    const monday = getMonday(d);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return `${formatDateLabel(monday)}-${formatDateLabel(sunday)} ${monday.getFullYear()}`;
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Generate days for the grid (42 days)
  const generateGridDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    let firstDayIdx = firstDay.getDay() - 1;
    if (firstDayIdx === -1) firstDayIdx = 6; // Sunday

    const prevMonthDaysCount = new Date(year, month, 0).getDate();
    const days = [];

    // Fill previous month days
    for (let i = firstDayIdx - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonthDaysCount - i));
    }

    // Fill current month days
    const currentMonthDaysCount = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= currentMonthDaysCount; i++) {
      days.push(new Date(year, month, i));
    }

    // Fill next month days to complete 42 cells
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i));
    }

    return days;
  };

  // Click on a day → just highlight the week (pending), no data fetch yet
  const handleDayClick = (pStr) => {
    setPendingPeriod(pStr);
  };

  // "Выбрать" button → confirm and trigger data fetch
  const handleConfirm = () => {
    if (pendingPeriod) {
      onPeriodChange(pendingPeriod);
      setPendingPeriod('');
    }
  };

  const daysGrid = generateGridDays();
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // The week to highlight on the grid: pending > hovered > selected
  const activeHighlight = pendingPeriod || hoveredPeriod;

  return (
    <div className="glass-card p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex-between mb-4">
        <div className="flex-row gap-2">
          <Calendar className="text-[var(--accent)]" size={20} />
          <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Календарь отчетов
          </h3>
        </div>

        {/* Confirm button — appears when a pending week is chosen */}
        <div className="flex-row">
          {pendingPeriod && (
            <button
              onClick={handleConfirm}
              className="btn-primary btn-xs flex-row gap-1.5 animate-fade-in"
            >
              <Check size={14} />
              <span>Выбрать</span>
            </button>
          )}
        </div>
      </div>

      {/* Month Selector centered */}
      <div className="flex-center mb-4">
        <div className="flex-row gap-1 bg-[var(--bg-darker)] px-2 py-1.5 rounded-xl border border-[var(--border-glass)]">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-[var(--bg-card)] rounded-lg transition-all text-[var(--text-muted)] hover:text-[var(--accent)]"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs font-semibold px-2 min-w-[100px] text-center select-none">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-[var(--bg-card)] rounded-lg transition-all text-[var(--text-muted)] hover:text-[var(--accent)]"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="calendar-grid">
        {weekDays.map((day) => (
          <div key={day} className="calendar-day-header">
            {day}
          </div>
        ))}

        {daysGrid.map((dayDate, idx) => {
          const pStr = getPeriodString(dayDate);
          const isSelected = selectedPeriod === pStr && !pendingPeriod;
          const isPending = pendingPeriod === pStr;
          const isHighlighted = activeHighlight === pStr && !isPending && !isSelected;

          function isCurrentMonthActive(date) {
            return date.getMonth() === currentDate.getMonth();
          }

          let cellClass = 'calendar-cell ';
          if (!isCurrentMonthActive(dayDate)) cellClass += 'calendar-cell-other ';
          if (isPending) cellClass += 'calendar-cell-selected ';
          else if (isSelected) cellClass += 'calendar-cell-selected ';
          else if (isHighlighted) cellClass += 'calendar-cell-active-week ';

          return (
            <div
              key={idx}
              className={cellClass}
              onMouseEnter={() => !pendingPeriod && setHoveredPeriod(pStr)}
              onMouseLeave={() => !pendingPeriod && setHoveredPeriod('')}
              onClick={() => handleDayClick(pStr)}
              title={`Выбрать неделю: ${pStr}`}
            >
              {dayDate.getDate()}
            </div>
          );
        })}
      </div>

      {/* Hint text when week is selected but not confirmed */}
      {pendingPeriod && (
        <p className="text-[10px] text-[var(--text-dim)] text-center mt-3 animate-fade-in">
          Нажмите «Выбрать» для загрузки данных
        </p>
      )}
    </div>
  );
}
