import { useMemo, useState } from 'react';
import { isDue } from '../utils/schedule';
import {
  dayCompletionValue,
  formatMonthYear,
  formatRu,
  parseKey,
  toKey,
  todayKey,
} from '../utils/dateHelpers';

const WEEK_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

// Сетка одного месяца
function buildMonth(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (new Date(year, month, 1).getDay() + 6) % 7; // Пн = 0
  const cells = [];
  for (let p = 0; p < startOffset; p++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  return { year, month, cells };
}

// Стиль ячейки по доле выполнения (0..1)
function cellStyle(value) {
  if (value <= 0) return { background: 'rgba(148, 163, 184, 0.18)', color: '#94a3b8' };
  if (value < 0.34) return { background: 'rgba(52, 211, 153, 0.45)', color: '#065f46' };
  if (value < 0.67) return { background: 'rgba(16, 185, 129, 0.75)', color: '#033b2a' };
  if (value < 1) return { background: 'rgba(5, 150, 105, 0.9)', color: '#042f1c' };
  return { background: '#059669', color: '#ffffff' };
}

// Карта выполнения: три месяца (прошлый | текущий | следующий) с листанием.
export default function Calendar({ habits }) {
  // Смещение в месяцах относительно «сегодня»
  const [monthOffset, setMonthOffset] = useState(0);
  const now = new Date();
  const centerYear = now.getFullYear();
  const centerMonth = now.getMonth() + monthOffset;
  const today = todayKey();

  // Три месяца: предыдущий, центральный, следующий
  const months = useMemo(
    () => [-1, 0, 1].map((d) => buildMonth(centerYear, centerMonth + d)),
    [centerYear, centerMonth]
  );

  // Статистика по каждому дню: сколько запланировано / выполнено / частично
  const dayInfo = useMemo(() => {
    const keys = new Set();
    for (const m of months) {
      for (const date of m.cells) if (date) keys.add(toKey(date));
    }
    if (!habits.length) return {};

    const info = {};
    for (const habit of habits) {
      const isPlan = (key) => isDue(habit.schedule, parseKey(key));

      // Полные выполнения
      for (const key of habit.completedDates) {
        if (!keys.has(key) || !isPlan(key)) continue;
        const entry = (info[key] ||= { due: 0, full: 0, partial: 0, sum: 0 });
        entry.due++;
        entry.full++;
        entry.sum += 1;
      }

      // Частичный прогресс по счётчикам
      const counts = habit.counts || {};
      for (const key of Object.keys(counts)) {
        if (!keys.has(key) || !isPlan(key)) continue;
        if (habit.completedDates.includes(key)) continue;
        const value = dayCompletionValue(habit, key);
        const entry = (info[key] ||= { due: 0, full: 0, partial: 0, sum: 0 });
        entry.due++;
        if (value >= 1) entry.full++;
        else entry.partial++;
        entry.sum += value;
      }
    }
    return info;
  }, [habits, months]);

  if (habits.length === 0) return null;

  const centerDate = new Date(centerYear, centerMonth, 1);

  return (
    <div className="glass animate-fade-up rounded-3xl p-5 sm:p-6">
      {/* Панель управления */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMonthOffset((o) => o - 1)}
            aria-label="Предыдущий месяц"
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl active:scale-90"
          >
            ‹
          </button>

          <div className="px-2 text-center">
            <h2 className="font-display text-base font-bold text-slate-800 sm:text-lg dark:text-slate-100">
              📅 {formatMonthYear(centerDate)}
            </h2>
            {monthOffset !== 0 && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                просмотр других месяцев
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMonthOffset((o) => o + 1)}
            aria-label="Следующий месяц"
            className="flex size-10 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 text-xl font-bold text-white shadow-lg shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl active:scale-90"
          >
            ›
          </button>
        </div>

        {/* Кнопка «сегодня» и легенда */}
        <div className="flex flex-wrap items-center gap-3">
          {monthOffset !== 0 && (
            <button
              type="button"
              onClick={() => setMonthOffset(0)}
              className="cursor-pointer rounded-full border-2 border-indigo-300/70 bg-white/50 px-3.5 py-1.5 text-sm font-semibold text-indigo-600 transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-500 active:scale-95 dark:border-indigo-400/30 dark:bg-night-700/50 dark:text-indigo-300"
            >
              ⏪ Сегодня
            </button>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Меньше</span>
            {[0, 0.25, 0.5, 0.85, 1].map((v) => (
              <span key={v} className="size-4 rounded-[5px]" style={cellStyle(v)} />
            ))}
            <span>Больше</span>
          </div>
        </div>
      </div>

      {/* Три месяца: прошлый, текущий (центр), следующий */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {months.map((m, i) => {
          const isCenter = i === 1;
          return (
            <div
              key={`${m.year}-${m.month}`}
              className={`animate-fade-up rounded-2xl p-2 ${
                isCenter
                  ? 'bg-gradient-to-b from-indigo-500/10 to-fuchsia-500/10 ring-2 ring-indigo-400/60 shadow-xl shadow-indigo-500/10 dark:ring-indigo-400/40'
                  : 'opacity-80 hover:opacity-100'
              }`}
            >
              <p
                className={`font-display mb-2 text-center font-bold ${
                  isCenter
                    ? 'text-sm text-slate-800 sm:text-lg dark:text-slate-100'
                    : 'text-sm text-slate-500 dark:text-slate-400'
                }`}
              >
                {isCenter ? '📍 ' : ''}
                {formatMonthYear(new Date(m.year, m.month, 1))}
              </p>

              <div className="rounded-xl bg-white/40 p-3 dark:bg-white/5">
                {/* Дни недели */}
                <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  {WEEK_HEADERS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {m.cells.map((date, idx) => {
                    if (!date) return <span key={`empty-${idx}`} />;
                    const key = toKey(date);
                    const info = dayInfo[key];
                    const value = info ? info.sum / info.due : 0;
                    const style = cellStyle(value);
                    const isToday = key === today && isCenter;
                    const isFuture = key > today;

                    const tip = info
                      ? `${formatRu(date)} — выполнено ${info.full} из ${info.due}` +
                        (info.partial ? `, ${info.partial} частично` : '')
                      : formatRu(date);

                    return (
                      <span
                        key={key}
                        title={tip}
                        className={`cal-cell flex size-6 items-center justify-center rounded-lg text-[10px] font-semibold sm:size-7 ${
                          isFuture ? 'bg-transparent text-slate-300 dark:text-slate-600' : ''
                        }`}
                        style={
                          isFuture
                            ? undefined
                            : {
                                ...style,
                                outline: isToday ? '2px solid #f43f5e' : undefined,
                                outlineOffset: '1px',
                              }
                        }
                      >
                        {date.getDate()}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Зелёный — выполнено; оттенок зависит от доли выполненного за день. Центр — текущий месяц.
      </p>
    </div>
  );
}