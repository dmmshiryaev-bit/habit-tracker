import { useState } from 'react';
import { CATEGORY_LIST } from '../utils/categories';
import { SCHEDULE_TYPE_OPTIONS, WEEKDAY_NAMES } from '../utils/schedule';
import { parseHabitInput } from '../utils/textParser';
import { addDays, formatRu, parseKey, toKey, todayKey } from '../utils/dateHelpers';

// Регулярка для эмодзи в начале строки: "🏃 Бегать" -> эмодзи отдельно
const EMOJI_RE = /^\p{Extended_Pictographic}+/u;

// Варианты периодичности: базовые + "на дату" (для разовых задач и редактирования)
const SCHEDULE_OPTIONS = [...SCHEDULE_TYPE_OPTIONS, { id: 'once', label: 'На дату', emoji: '📌' }];

// Форма добавления/редактирования привычки.
export default function HabitForm({ onAdd, onUpdate, initial, onCancelEdit, presetDate, onClearPreset }) {
  const isEdit = Boolean(initial);

  const [name, setName] = useState(initial?.name || '');
  const [categoryId, setCategoryId] = useState(initial?.categoryId || CATEGORY_LIST[0].id);
  const [scheduleType, setScheduleType] = useState(initial?.schedule?.type || 'daily');
  const [weeklyDays, setWeeklyDays] = useState(initial?.schedule?.days || [1, 3, 5]);
  const [monthlyDay, setMonthlyDay] = useState(initial?.schedule?.day || 1);
  const [monthlyLastDay, setMonthlyLastDay] = useState(initial?.schedule?.lastDay || false);
  const [onceDate, setOnceDate] = useState(initial?.schedule?.date || todayKey());
  const [goal, setGoal] = useState(initial?.goal || 1);

  const toggleWeekday = (dow) => {
    setWeeklyDays((prev) => {
      if (prev.includes(dow)) {
        // Нельзя оставить пустым список дней
        return prev.length > 1 ? prev.filter((d) => d !== dow) : prev;
      }
      return [...prev, dow];
    });
  };

  const buildSchedule = () => {
    if (scheduleType === 'weekly') return { type: 'weekly', days: [...weeklyDays] };
    if (scheduleType === 'monthly') return { type: 'monthly', day: monthlyDay, lastDay: monthlyLastDay };
    if (scheduleType === 'once') return { type: 'once', date: onceDate };
    return { type: 'daily' };
  };

  const parseName = (trimmed) => {
    let habitName = trimmed;
    let emoji = initial?.emoji || '';
    const parsed = parseHabitInput(trimmed);
    if (parsed && parsed.name) {
      habitName = parsed.name;
      const match = parsed.name.match(EMOJI_RE);
      if (match) emoji = match[0];
    } else {
      const match = trimmed.match(EMOJI_RE);
      if (match) emoji = match[0];
    }
    return { habitName, emoji, parsed };
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    // Для "По дням недели" нужен хотя бы один выбранный день
    if (scheduleType === 'weekly' && weeklyDays.length === 0) return;

    const { habitName, emoji, parsed } = parseName(trimmed);

    // Дата из текста или выбранный день, иначе расписание из полей формы
    const schedule = parsed?.date
      ? { type: 'once', date: parsed.date }
      : presetDate
        ? { type: 'once', date: presetDate }
        : buildSchedule();

    // При редактировании сохраняем историю, а не сбрасываем её
    const history = isEdit
      ? { counts: initial.counts || {}, completedDates: initial.completedDates || [] }
      : { counts: {}, completedDates: [] };

    const payload = {
      name: habitName,
      categoryId,
      emoji,
      schedule,
      goal: Math.max(1, Math.min(99, goal || 1)),
      time: parsed?.time ?? initial?.time ?? null,
      ...history,
    };

    if (isEdit) onUpdate(payload);
    else {
      onAdd(payload);
      setName('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass animate-fade-up rounded-3xl p-5 sm:p-6"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-slate-800 dark:text-slate-100">
          {isEdit ? '✏️ Редактировать привычку' : 'Запланировать новое задание ✨'}
        </h2>
        {isEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="cursor-pointer rounded-full border-2 border-slate-200/70 px-3.5 py-1.5 text-sm font-semibold text-slate-500 transition-all duration-300 hover:bg-slate-200/40 active:scale-95 dark:border-slate-600/50 dark:text-slate-300 dark:hover:bg-slate-600/30"
          >
            ✕ Отмена
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="🏃 Бегать по утрам  ·  на 15 сентября физика в 11:20"
          maxLength={120}
          className="w-full rounded-2xl border-2 border-indigo-200/60 bg-white/60 px-4 py-3 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:shadow-lg focus:shadow-indigo-500/20 dark:border-indigo-400/20 dark:bg-night-700/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-indigo-400"
        />
        <div className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-indigo-200/60 bg-white/60 px-4 py-2.5 dark:border-indigo-400/20 dark:bg-night-700/60">
          <label htmlFor="habit-goal" className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            🎯 раз/день
          </label>
          <input
            id="habit-goal"
            type="number"
            min={1}
            max={99}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
            className="w-14 rounded-lg border border-slate-300/60 bg-white/70 px-2 py-1 text-center font-bold text-slate-800 outline-none focus:border-indigo-400 dark:border-slate-600/50 dark:bg-night-600/60 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          className="shrink-0 cursor-pointer rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-3 font-bold text-white shadow-lg shadow-indigo-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-purple-500/40 active:scale-95"
        >
          {isEdit ? 'Сохранить' : 'Добавить'}
        </button>
      </div>

      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        💡 Подсказка: кнопка «Только сегодня» создаст задачу ровно на один день.
        Или начни с «сегодня», «завтра» или «послезавтра» — получится разовая
        задача на этот день (например: «сегодня помыть полы», «15 сентября
        физика в 11:20»).
      </p>

      {/* Выбор категории */}
      <div className="mt-4 flex flex-wrap gap-2">
        {CATEGORY_LIST.map((cat) => {
          const active = cat.id === categoryId;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoryId(cat.id)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition-all duration-300 active:scale-95 ${
                active
                  ? `border-transparent bg-gradient-to-r ${cat.gradient} text-white shadow-lg`
                  : 'border-slate-200/70 bg-white/50 text-slate-600 hover:-translate-y-0.5 hover:border-indigo-300 dark:border-slate-600/50 dark:bg-night-700/50 dark:text-slate-300 dark:hover:border-indigo-400'
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Расписание и периодичность */}
      <div className="mt-5">
        {/* Выбранная дата для планирования */}
        {presetDate && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border-2 border-emerald-300/50 bg-emerald-500/10 px-3.5 py-2.5 text-sm font-semibold text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300">
            <span>🗓 Новое добавится на {formatRu(parseKey(presetDate))}</span>
            <button
              type="button"
              onClick={onClearPreset}
              className="cursor-pointer rounded-full px-2 py-0.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-500/15 dark:text-emerald-300"
            >
              ✕ сбросить
            </button>
          </div>
        )}

        <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          🔁 Периодичность
        </p>
        {/* Быстрое планирование: задача ровно на один день */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onClearPreset?.();
              setScheduleType('once');
              setOnceDate(todayKey());
            }}
            className="cursor-pointer rounded-full border-2 border-dashed border-emerald-300/70 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
          >
            🗓 Только сегодня
          </button>
          <button
            type="button"
            onClick={() => {
              onClearPreset?.();
              setScheduleType('once');
              setOnceDate(toKey(addDays(new Date(), 1)));
            }}
            className="cursor-pointer rounded-full border-2 border-dashed border-emerald-300/70 bg-emerald-500/10 px-3.5 py-1.5 text-sm font-semibold text-emerald-700 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300"
          >
            🗓 Только завтра
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCHEDULE_OPTIONS.map((opt) => {
            const active = scheduleType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setScheduleType(opt.id);
                  // При открытии вкладки "По дням недели" очищаем выбор, чтобы задать его заново
                  if (opt.id === 'weekly') setWeeklyDays([]);
                }}
                className={`cursor-pointer rounded-full border-2 px-3.5 py-2 text-sm font-semibold transition-all duration-300 active:scale-95 ${
                  active
                    ? 'border-transparent bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                    : 'border-slate-200/70 bg-white/50 text-slate-600 hover:-translate-y-0.5 hover:border-indigo-300 dark:border-slate-600/50 dark:bg-night-700/50 dark:text-slate-300 dark:hover:border-indigo-400'
                }`}
              >
                <span>{opt.emoji}</span> {opt.label}
              </button>
            );
          })}
        </div>

        {/* Выбор дней недели */}
        {scheduleType === 'weekly' && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_NAMES.map((label, i) => {
                const dow = i + 1;
                const active = weeklyDays.includes(dow);
                return (
                  <button
                    key={dow}
                    type="button"
                    onClick={() => toggleWeekday(dow)}
                    className={`size-10 cursor-pointer rounded-full text-sm font-bold transition-all duration-300 active:scale-90 ${
                      active
                        ? 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30'
                        : 'border-2 border-slate-200/70 bg-white/50 text-slate-500 hover:border-purple-300 dark:border-slate-600/50 dark:bg-night-700/50 dark:text-slate-400'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {weeklyDays.length === 0 && (
              <p className="mt-2 text-xs font-semibold text-amber-500">
                Выбери хотя бы один день недели
              </p>
            )}
          </div>
        )}

        {/* Выбор числа месяца */}
        {scheduleType === 'monthly' && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              value={monthlyDay}
              onChange={(e) => setMonthlyDay(Number(e.target.value))}
              disabled={monthlyLastDay}
              className="cursor-pointer rounded-xl border-2 border-slate-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-purple-400 disabled:opacity-50 dark:border-slate-600/50 dark:bg-night-700/60 dark:text-slate-200"
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day} числа
                </option>
              ))}
            </select>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={monthlyLastDay}
                onChange={(e) => setMonthlyLastDay(e.target.checked)}
                className="size-4 accent-purple-500"
              />
              В последний день месяца
            </label>
          </div>
        )}

        {/* Выбор даты для разовой задачи */}
        {scheduleType === 'once' && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">📌 Дата:</label>
            <input
              type="date"
              value={onceDate}
              onChange={(e) => setOnceDate(e.target.value)}
              className="cursor-pointer rounded-xl border-2 border-slate-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-indigo-400 dark:border-slate-600/50 dark:bg-night-700/60 dark:text-slate-200"
            />
          </div>
        )}
      </div>
    </form>
  );
}