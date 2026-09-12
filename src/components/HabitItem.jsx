import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { getCategory } from '../utils/categories';
import { isDue, scheduleLabel } from '../utils/schedule';
import {
  addDays,
  bestStreak,
  currentStreak,
  dayCount,
  dayGoal,
  formatRu,
  isDayDone,
  isDayPartial,
  lastNDays,
  parseKey,
  toKey,
  todayKey,
  weekdayLabel,
} from '../utils/dateHelpers';

const CONFETTI_COLORS = [
  '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#60a5fa', '#fb7185', '#f97316',
];

const createBurst = () =>
  Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: 20 + Math.random() * 60,
    tx: (Math.random() - 0.5) * 160,
    rot: (Math.random() - 0.5) * 540,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: Math.random() * 0.15,
  }));

// Вспышка конфетти при полном выполнении привычки.
function ConfettiBurst({ pieces }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            top: '-6px',
            background: p.color,
            '--tx': `${p.tx}px`,
            '--rot': `${p.rot}deg`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

// Карточка одной привычки.
export default function HabitItem({ habit, onStep, onDelete, onEdit, activeDateKey }) {
  const cat = getCategory(habit.categoryId);
  const [confirming, setConfirming] = useState(false);
  const [burstPieces, setBurstPieces] = useState(null);

  const today = todayKey();
  // День, за который идёт отметка: по умолчанию сегодня, иначе выбранный в фильтре
  const targetKey = activeDateKey || today;
  const targetDate = parseKey(targetKey);
  const goal = dayGoal(habit);
  const isOnce = habit.schedule?.type === 'once';
  const onceDate = habit.schedule?.date || null;
  const doneToday = isDayDone(habit, today);
  const dueOnTarget = isDue(habit.schedule, targetDate);
  const doneOnTarget = isDayDone(habit, targetKey);
  const partialOnTarget = isDayPartial(habit, targetKey);
  const countOnTarget = dayCount(habit, targetKey);

  const isDueCheck = (date) => isDue(habit.schedule, date);
  const streak = currentStreak(habit.completedDates, isDueCheck);
  const best = bestStreak(habit.completedDates, isDueCheck);

  // Последние 7 дней с пометками: выполнен / частично / пропущен / не по плану
  const days = lastNDays(7).map((key) => {
    const date = parseKey(key);
    return {
      key,
      isToday: key === today,
      done: isDayDone(habit, key),
      partial: isDayPartial(habit, key),
      due: isDue(habit.schedule, date),
    };
  });

  const total = habit.completedDates.length;

  // Ближайший плановый день впереди (для досрочного выполнения).
  // Не действует для категорий «Здоровье» и «Спорт».
  const nextDueKey = (() => {
    if (cat.id === 'health' || cat.id === 'sport') return null;
    if (isOnce && onceDate) return onceDate > today ? onceDate : null;
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 31; i++) {
      const d = addDays(base, i);
      if (isDue(habit.schedule, d)) return toKey(d);
    }
    return null;
  })();

  // Текст «за завтра / за послезавтра / на 15 сентября»
  const earlyRel = nextDueKey
    ? (() => {
        const d = parseKey(nextDueKey);
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        const diff = Math.round((d - base) / 86400000);
        if (diff === 1) return 'за завтра';
        if (diff === 2) return 'за послезавтра';
        return `на ${formatRu(d)}`;
      })()
    : null;

  const stepOnDay = (delta) => {
    const cnt = dayCount(habit, targetKey);
    const doneKey = isDayDone(habit, targetKey);
    const willComplete = delta > 0 && !doneKey && cnt + delta >= goal;
    if (willComplete) {
      setBurstPieces(createBurst());
      setTimeout(() => setBurstPieces(null), 1200);
    }
    onStep(habit.id, delta, targetKey);
  };

  const handleDelete = () => {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 2500);
      return;
    }
    onDelete(habit.id);
  };

  // Кнопки/индикатор прогресса выполнения за выбранный день
  const renderControls = () => {
    // Разовая задача с прошедшей датой — выполнить уже нельзя
    if (isOnce && onceDate && onceDate < targetKey) {
      return (
        <button
          type="button"
          disabled
          className="mt-4 w-full cursor-not-allowed rounded-2xl border-2 border-dashed border-rose-300/70 bg-transparent px-4 py-3 font-bold text-rose-400 dark:border-rose-400/30 dark:text-rose-300"
        >
          ⏰ Дата прошла
        </button>
      );
    }

    // Задача по плану в выбранный день — обычная отметка за этот день
    if (dueOnTarget) {
      // Цель = 1: одна кнопка-переключатель
      if (goal <= 1) {
        return (
          <button
            type="button"
            onClick={() => stepOnDay(doneOnTarget ? -1 : 1)}
            className={`mt-4 w-full cursor-pointer rounded-2xl px-4 py-3 font-bold transition-all duration-300 active:scale-[0.98] ${
              doneOnTarget
                ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-500/40'
                : `bg-gradient-to-r ${cat.gradient} text-white opacity-90 shadow-lg hover:-translate-y-0.5 hover:opacity-100 hover:shadow-2xl`
            }`}
          >
            {doneOnTarget
              ? targetKey === today
                ? '✓ Выполнено сегодня'
                : `✓ Выполнено: ${formatRu(targetDate)}`
              : targetKey === today
                ? 'Отметить выполнение'
                : `Отметить за ${formatRu(targetDate)}`}
          </button>
        );
      }

      // Счётчик: частичное выполнение (X из Y раз/день)
      return (
        <div className="mt-4">
          {partialOnTarget && (
            <p className="mb-2 text-center text-sm font-semibold text-amber-500">
              Выполнено частично: {countOnTarget} из {goal}
            </p>
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepOnDay(-1)}
              disabled={countOnTarget <= 0}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-rose-400 to-red-500 text-xl font-bold text-white shadow-lg shadow-red-500/30 transition-all duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Уменьшить"
            >
              −
            </button>

            <div className="flex-1">
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-600/40">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    doneOnTarget
                      ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                  }`}
                  style={{ width: `${(countOnTarget / goal) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs font-semibold text-slate-500 dark:text-slate-400">
                {doneOnTarget ? `✓ ${goal} из ${goal} — выполнено!` : `${countOnTarget} из ${goal}`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => stepOnDay(1)}
              disabled={doneOnTarget}
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 text-xl font-bold text-white shadow-lg shadow-emerald-500/30 transition-all duration-300 active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Увеличить"
            >
              +
            </button>
          </div>
        </div>
      );
    }

    // Уже отмечено в этот день (досрочно или вручную) — можно убрать
    if (doneOnTarget || countOnTarget > 0) {
      return (
        <button
          type="button"
          onClick={() => stepOnDay(-1)}
          disabled={countOnTarget <= 0}
          className="mt-4 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-emerald-400 to-green-500 px-4 py-3 font-bold text-white shadow-lg shadow-emerald-500/40 transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ✓ Отмечено за {formatRu(targetDate)} — убрать
        </button>
      );
    }

    // Есть ближайший плановый день впереди → можно выполнить заранее (не для Здоровья/Спорта)
    if (nextDueKey) {
      const doneAhead = isDayDone(habit, nextDueKey);
      return (
        <button
          type="button"
          onClick={() => onStep(habit.id, doneAhead ? -1 : 1, nextDueKey)}
          className={`mt-4 w-full cursor-pointer rounded-2xl px-4 py-3 font-bold transition-all duration-300 active:scale-[0.98] ${
            doneAhead
              ? 'bg-gradient-to-r from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-500/40'
              : `bg-gradient-to-r ${cat.gradient} text-white opacity-90 shadow-lg hover:-translate-y-0.5 hover:opacity-100 hover:shadow-2xl`
          }`}
        >
          {doneAhead
            ? `✓ Выполнено: ${formatRu(parseKey(nextDueKey))}`
            : `Сделать заранее (${earlyRel})`}
        </button>
      );
    }

    return (
      <button
        type="button"
        disabled
        className="mt-4 w-full cursor-not-allowed rounded-2xl border-2 border-dashed border-slate-300/70 bg-transparent px-4 py-3 font-bold text-slate-400 dark:border-slate-600/50 dark:text-slate-500"
      >
        📅 {targetKey === today ? 'Сегодня' : 'В этот день'} не по расписанию
      </button>
    );
  };

  return (
    <div
      className={`glass card-lift group relative overflow-hidden rounded-3xl p-5 sm:p-6 ${
        doneToday ? 'shadow-xl' : ''
      }`}
    >
      <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${cat.gradient}`} />

      {burstPieces && <ConfettiBurst pieces={burstPieces} />}

      <div className="flex items-start gap-4">
        <div
          className={`flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${cat.gradient} text-3xl shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6`}
        >
          {habit.emoji || cat.emoji}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="break-words text-lg font-bold text-slate-800 dark:text-slate-100">
                {habit.name}
              </h3>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${cat.chip}`}
                >
                  {cat.emoji} {cat.name}
                </span>
                <span className="inline-block rounded-full bg-slate-500/15 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-400/15 dark:text-slate-300">
                  {isOnce && onceDate ? (
                    <>
                      📍 {formatRu(parseKey(onceDate))}
                      {habit.time && ` · ${habit.time}`}
                    </>
                  ) : (
                    <>🔁 {scheduleLabel(habit.schedule)}</>
                  )}
                  {habit.time && !isOnce && ` · ⏰ ${habit.time}`}
                </span>
                {goal > 1 && (
                  <span className="inline-block rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                    🎯 {goal} раз/день
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(habit.id)}
                  aria-label="Редактировать привычку"
                  className="translate-y-1 cursor-pointer rounded-xl px-2.5 py-2 text-slate-400 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 hover:bg-indigo-500/10 hover:text-indigo-500 active:scale-90 dark:text-slate-500 dark:hover:text-indigo-400"
                >
                  <Pencil className="size-4" />
                </button>
              )}
              <button
                type="button"
                onClick={handleDelete}
                aria-label="Удалить привычку"
              className={`shrink-0 cursor-pointer rounded-xl px-2.5 py-2 transition-all duration-300 active:scale-90 ${
                confirming
                  ? 'translate-y-0 bg-red-500 text-white opacity-100 shadow-lg shadow-red-500/40'
                  : 'translate-y-1 text-slate-400 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 hover:-translate-y-0.5 hover:bg-red-500/10 hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400'
              }`}
            >
              {confirming ? 'Точно?' : <Trash2 className="size-4" />}
            </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-slate-500 dark:text-slate-400">
              🔥 <span className={streak > 0 ? 'text-orange-500' : ''}>{streak}</span>
              <span className="font-normal text-slate-400 dark:text-slate-500">дн.</span>
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              🏆 {best}
            </span>
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              ✅ {total}
            </span>
          </div>

          {/* Мини-календарь: последние 7 дней */}
          <div className="mt-4 flex items-center gap-1.5">
            {days.map((day) => (
              <div key={day.key} className="flex flex-col items-center gap-1" title={day.key}>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {weekdayLabel(parseKey(day.key).getDay())}
                </span>
                <span
                  className={`size-6 rounded-lg transition-all duration-300 ${
                    day.done
                      ? `bg-gradient-to-br ${cat.gradient} shadow-md`
                      : day.partial
                        ? 'bg-gradient-to-br from-amber-300 to-orange-400 shadow-sm'
                        : day.due
                          ? day.isToday
                            ? 'bg-slate-200 ring-2 ring-indigo-400/70 ring-offset-1 dark:bg-slate-600/40'
                            : 'bg-rose-200/80 dark:bg-rose-400/30'
                          : 'bg-slate-100 opacity-40 dark:bg-slate-700/40'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {renderControls()}
    </div>
  );
}