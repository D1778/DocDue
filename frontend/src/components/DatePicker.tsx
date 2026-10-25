'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { formatDate } from '@/lib/format';

interface DatePickerProps {
  id?: string;
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  min?: string;  // "YYYY-MM-DD"
  max?: string;  // "YYYY-MM-DD"
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

/** Format year, month (0-11), day (1-31) to "YYYY-MM-DD" */
function toDateStr(year: number, monthIndex: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(monthIndex + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Get today's local date as "YYYY-MM-DD" */
function getTodayStr(): string {
  const now = new Date();
  return toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Add months to a YYYY-MM-DD date string */
function addMonthsToStr(dateStr: string, monthsToAdd: number): string {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  if (Number.isNaN(base.getTime())) return getTodayStr();
  base.setMonth(base.getMonth() + monthsToAdd);
  return toDateStr(base.getFullYear(), base.getMonth(), base.getDate());
}

export function DatePicker({
  id,
  value,
  onChange,
  min,
  max,
  disabled = false,
  placeholder = 'Select expiry date...',
  className = '',
}: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const [open, setOpen] = useState(false);

  // Parse initial view month & year based on value or today
  const initialDate = value ? new Date(`${value}T00:00:00`) : new Date();
  const validInitial = !Number.isNaN(initialDate.getTime());
  const [viewYear, setViewYear] = useState(validInitial ? initialDate.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(validInitial ? initialDate.getMonth() : new Date().getMonth());

  // Update view when value changes and popover opens
  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T00:00:00`);
      if (!Number.isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [value, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const todayStr = getTodayStr();

  // Navigation handlers
  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function selectDate(dateStr: string) {
    if (min && dateStr < min) return;
    if (max && dateStr > max) return;
    onChange(dateStr);
    setOpen(false);
  }

  // Calculate calendar grid (Monday-starting)
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const mondayOffset = (firstDayOfMonth + 6) % 7; // 0 = Mon, 6 = Sun
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Cells before day 1 (from previous month)
  const prevMonthDays: Array<{ day: number; dateStr: string }> = [];
  for (let i = mondayOffset - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    prevMonthDays.push({ day, dateStr: toDateStr(prevY, prevM, day) });
  }

  // Days in current month
  const currentMonthDays: Array<{ day: number; dateStr: string }> = [];
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    currentMonthDays.push({ day: d, dateStr: toDateStr(viewYear, viewMonth, d) });
  }

  // Cells after (to fill grid to 35 or 42 cells)
  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const nextMonthCells = totalCells > 35 ? 42 - totalCells : 35 - totalCells;
  const nextMonthDays: Array<{ day: number; dateStr: string }> = [];
  for (let d = 1; d <= nextMonthCells; d++) {
    const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
    nextMonthDays.push({ day: d, dateStr: toDateStr(nextY, nextM, d) });
  }

  // Year options for quick select (10 years back to 30 years forward)
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 5; y <= currentYear + 25; y++) {
    years.push(y);
  }

  return (
    <div ref={rootRef} className={`relative ${open ? 'z-30' : ''} ${className}`}>
      {/* Trigger Button */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((prev) => !prev)}
        className={`group flex w-full items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-left text-sm font-medium transition shadow-sm ring-1 ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400 ${
          open ? 'ring-2 ring-brand-600' : 'ring-ink-300 hover:ring-brand-400'
        }`}
      >
        {/* Calendar Icon */}
        <svg
          viewBox="0 0 20 20"
          className="size-4 shrink-0 text-ink-500 transition-colors group-hover:text-brand-700"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="14" height="13" rx="2" />
          <path d="M16 2v4M4 2v4M3 8h14" />
          <circle cx="7.5" cy="11.5" r="0.75" fill="currentColor" />
          <circle cx="12.5" cy="11.5" r="0.75" fill="currentColor" />
          <circle cx="7.5" cy="14.5" r="0.75" fill="currentColor" />
          <circle cx="12.5" cy="14.5" r="0.75" fill="currentColor" />
        </svg>

        {/* Formatted Date Display */}
        <span className={`min-w-0 flex-1 truncate ${value ? 'font-stamp text-ink-900 font-semibold' : 'text-ink-400 font-normal'}`}>
          {value ? formatDate(value) : placeholder}
        </span>

        {/* Clear button (if value is set) or chevron */}
        {value && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            title="Clear date"
            aria-label="Clear date"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                onChange('');
              }
            }}
            className="rounded p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4L4 12" />
            </svg>
          </span>
        ) : (
          <svg
            viewBox="0 0 20 20"
            className={`size-4 shrink-0 text-ink-400 transition-transform duration-200 group-hover:text-brand-700 ${
              open ? 'rotate-180 text-brand-700' : ''
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m5 8 5 5 5-5" />
          </svg>
        )}
      </button>

      {/* Popover Calendar */}
      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Choose expiry date"
          className="dropdown-pop absolute left-0 z-50 mt-2 w-[min(21.5rem,calc(100vw-2rem))] rounded-2xl bg-white p-3.5 shadow-[0_20px_45px_-12px_rgba(14,21,18,0.35)] ring-1 ring-ink-200"
        >
          {/* Header: Month and Year Navigators */}
          <div className="flex items-center justify-between pb-3 border-b border-ink-100">
            <button
              type="button"
              onClick={prevMonth}
              aria-label="Previous month"
              className="flex size-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-800"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m10 12-4-4 4-4" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5">
              {/* Month Selector */}
              <select
                value={viewMonth}
                onChange={(e) => setViewMonth(Number(e.target.value))}
                className="cursor-pointer rounded-lg bg-transparent py-1 px-1.5 font-display text-sm font-bold text-ink-900 transition hover:bg-brand-50 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Selector */}
              <select
                value={viewYear}
                onChange={(e) => setViewYear(Number(e.target.value))}
                className="cursor-pointer rounded-lg bg-transparent py-1 px-1.5 font-display text-sm font-bold text-ink-900 transition hover:bg-brand-50 focus:outline-none focus:ring-1 focus:ring-brand-600"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="flex size-8 items-center justify-center rounded-lg text-ink-600 transition hover:bg-brand-50 hover:text-brand-800"
            >
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 4 4 4-4 4" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 pt-2.5 pb-1 text-center font-sans text-xs font-semibold text-ink-400">
            {WEEKDAY_NAMES.map((w) => (
              <span key={w} className="py-0.5">
                {w}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-sm">
            {/* Previous month filler days */}
            {prevMonthDays.map(({ day, dateStr }) => (
              <button
                key={dateStr}
                type="button"
                onClick={() => selectDate(dateStr)}
                className="flex size-8 sm:size-9 items-center justify-center mx-auto rounded-lg text-xs text-ink-300 transition hover:bg-ink-100 hover:text-ink-600"
              >
                {day}
              </button>
            ))}

            {/* Current month days */}
            {currentMonthDays.map(({ day, dateStr }) => {
              const isSelected = value === dateStr;
              const isToday = todayStr === dateStr;
              const isPastMin = min && dateStr < min;
              const isPastMax = max && dateStr > max;
              const isDisabled = isPastMin || isPastMax;

              return (
                <button
                  key={dateStr}
                  type="button"
                  disabled={Boolean(isDisabled)}
                  onClick={() => selectDate(dateStr)}
                  className={`flex size-8 sm:size-9 items-center justify-center mx-auto rounded-lg text-xs sm:text-sm font-medium transition ${
                    isSelected
                      ? 'bg-brand-700 text-white font-bold shadow-sm ring-1 ring-brand-800'
                      : isToday
                        ? 'ring-1.5 ring-brand-600 font-bold text-brand-900 bg-brand-50/70 hover:bg-brand-100'
                        : isDisabled
                          ? 'text-ink-300 cursor-not-allowed opacity-40'
                          : 'text-ink-800 hover:bg-brand-50 hover:text-brand-900'
                  }`}
                >
                  {day}
                </button>
              );
            })}

            {/* Next month filler days */}
            {nextMonthDays.map(({ day, dateStr }) => (
              <button
                key={dateStr}
                type="button"
                onClick={() => selectDate(dateStr)}
                className="flex size-8 sm:size-9 items-center justify-center mx-auto rounded-lg text-xs text-ink-300 transition hover:bg-ink-100 hover:text-ink-600"
              >
                {day}
              </button>
            ))}
          </div>

          {/* Expiry Quick Presets */}
          <div className="mt-3 pt-2.5 border-t border-ink-100">
            <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
              <span className="font-medium text-[11px] uppercase tracking-wider text-ink-400">Quick expiry</span>
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                  }}
                  className="font-medium text-red-600 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => selectDate(todayStr)}
                className="rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => selectDate(addMonthsToStr(todayStr, 6))}
                className="rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200"
              >
                +6 months
              </button>
              <button
                type="button"
                onClick={() => selectDate(addMonthsToStr(todayStr, 12))}
                className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800 ring-1 ring-inset ring-brand-200 transition hover:bg-brand-100"
              >
                +1 year
              </button>
              <button
                type="button"
                onClick={() => selectDate(addMonthsToStr(todayStr, 24))}
                className="rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200"
              >
                +2 years
              </button>
              <button
                type="button"
                onClick={() => selectDate(addMonthsToStr(todayStr, 60))}
                className="rounded-lg bg-ink-50 px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-inset ring-ink-200 transition hover:bg-brand-50 hover:text-brand-800 hover:ring-brand-200"
              >
                +5 years
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
