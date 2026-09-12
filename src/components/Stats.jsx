import { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, CalendarRange, Flame, Trophy } from 'lucide-react';
import { isDue } from '../utils/schedule';
import { CATEGORY_LIST } from '../utils/categories';
import {
  bestStreak,
  completionFraction,
  currentStreak,
  isDayDone,
  isDayPartial,
  lastNDays,
  parseKey,
  todayKey,
  weekdayLabel,
} from '../utils/dateHelpers';

const RADIUS = 40;
const CIRCUM = 2 * Math.PI * RADIUS;

const RING_RADIUS = 34;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

const PIE_COLORS = ['#6366f1', '#f472b6', '#34d399', '#f59e0b'];

// Анимированное кольцо прогресса с числом внутри (для плиток в процентах)
function ProgressRing({ pct, gradientId, size = 56 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const done = Math.max(0, Math.min(100, pct));
  const offset = RING_CIRC * (1 - done / 100);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="9"
          className="stroke-slate-200/70 dark:stroke-slate-600/50"
        />
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke={`url(#${gradientId})`}
          strokeDasharray={RING_CIRC}
          strokeDashoffset={mounted ? offset : RING_CIRC}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-sm font-bold text-slate-800 dark:text-slate-100">
        {done}%
      </span>
    </div>
  );
}

// Круговая диаграмма прогресса на сегодня
function TodayRing({ done, total, partial, allTime }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const offset = total > 0 ? CIRCUM * (1 - done / total) : CIRCUM;

  return (
    <div className="flex items-center gap-5">
      <div className="relative size-24 shrink-0">
        <svg viewBox="0 0 100 100" className="size-full -rotate-90">
          <circle
            cx="50" cy="50" r={RADIUS}
            className="fill-none stroke-slate-200/70 dark:stroke-slate-600/50"
            strokeWidth="10"
          />
          <circle
            cx="50" cy="50" r={RADIUS}
            className="fill-none stroke-gradient"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUM}
            strokeDashoffset={mounted ? offset : CIRCUM}
            stroke="url(#todayGradient)"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
          <defs>
            <linearGradient id="todayGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-slate-800 dark:text-slate-100">
          {pct}%
        </span>
      </div>
      <div>
        <p className="font-display font-semibold text-slate-800 dark:text-slate-100">Сегодня</p>
        {total > 0 ? (
          <>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Выполнено <b className="text-slate-700 dark:text-slate-200">{done}</b> из{' '}
              <b className="text-slate-700 dark:text-slate-200">{total}</b> запланированных
              {partial > 0 && (
                <span className="text-amber-500 dark:text-amber-400">
                  {' '}({partial} частично)
                </span>
              )}
            </p>
            {pct === 100 && <p className="mt-1 font-semibold text-emerald-500">Всё сделано! 🎉</p>}
            {pct > 0 && pct < 100 && (
              <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
                Ещё {total - done} впереди — вперёд! 💪
              </p>
            )}
          </>
        ) : (
          <p className="mt-1 text-slate-500 dark:text-slate-400">Сегодня по плану ничего нет 🎈</p>
        )}
        <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
          Всего выполнений: <b className="text-slate-600 dark:text-slate-300">{allTime}</b>
        </p>
      </div>
    </div>
  );
}

// Общая статистика: серии, проценты, мотивация и графики.
export default function Stats({ habits }) {
  const today = todayKey();
  const now = new Date();

  // Привычки, запланированные на сегодня
  const dueHabits = habits.filter((h) => isDue(h.schedule, now));
  const doneToday = dueHabits.filter((h) => isDayDone(h, today)).length;
  const partialToday = dueHabits.filter((h) => isDayPartial(h, today)).length;

  const weekPercent = Math.round(completionFraction(habits, lastNDays(7)) * 100);
  const monthPercent = Math.round(completionFraction(habits, lastNDays(30)) * 100);

  const streakOf = (h) => currentStreak(h.completedDates, (d) => isDue(h.schedule, d));
  const bestStreakOf = (h) => bestStreak(h.completedDates, (d) => isDue(h.schedule, d));
  const currentStreakMax = habits.reduce((max, h) => Math.max(max, streakOf(h)), 0);
  const bestStreakMax = habits.reduce((max, h) => Math.max(max, bestStreakOf(h)), 0);
  const allTime = habits.reduce((s, h) => s + h.completedDates.length, 0);

  // Мотивационная фраза по прогрессу
  const motivation = useMemo(() => {
    if (habits.length === 0) return null;
    const missKey = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      d.setHours(0, 0, 0, 0);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    const missedYesterday =
      habits.some((h) => isDue(h.schedule, parseKey(missKey))) &&
      habits.filter((h) => isDue(h.schedule, parseKey(missKey))).every((h) => !isDayDone(h, missKey));
    if (missedYesterday) return 'Не сдавайся, сегодня новый день! 💪';
    if (currentStreakMax >= 7)
      return `Ты на огне! ${currentStreakMax} дней подряд! 🔥`;
    if (currentStreakMax >= 2)
      return `Отличное начало! ${currentStreakMax} ${currentStreakMax <= 4 ? 'дня' : 'дней'} подряд 🔥`;
    if (doneToday > 0) return 'Отличное начало! 🔥';
    return 'Сделай первый шаг сегодня ✨';
  }, [habits, currentStreakMax, doneToday]);

  // Данные для графиков
  const weekData = useMemo(
    () =>
      lastNDays(7).map((key) => {
        const due = habits.filter((h) => isDue(h.schedule, parseKey(key))).length;
        const done = habits.filter((h) => isDayDone(h, key)).length;
        return {
          name: weekdayLabel(parseKey(key).getDay()),
          pct: due > 0 ? Math.round((done / due) * 100) : 0,
        };
      }),
    [habits]
  );

  const monthData = useMemo(
    () =>
      lastNDays(30).map((key) => ({
        name: String(parseKey(key).getDate()),
        done: habits.filter((h) => isDayDone(h, key)).length,
      })),
    [habits]
  );

  const pieData = useMemo(
    () =>
      CATEGORY_LIST.map((cat, i) => ({
        name: cat.name,
        value: habits
          .filter((h) => h.categoryId === cat.id)
          .reduce((s, h) => s + h.completedDates.length, 0),
        color: PIE_COLORS[i % PIE_COLORS.length],
      })).filter((d) => d.value > 0),
    [habits]
  );

  const tiles = [
    { Icon: Flame, value: currentStreakMax, label: 'Текущая серия', suffix: 'дн.', accent: 'from-orange-400 to-red-500' },
    { Icon: Trophy, value: bestStreakMax, label: 'Лучшая серия', suffix: 'дн.', accent: 'from-amber-400 to-yellow-500' },
    { Icon: CalendarDays, value: weekPercent, label: 'За неделю', suffix: '%', percent: true, accent: 'from-sky-400 to-blue-600', gid: 'weekGrad' },
    { Icon: CalendarRange, value: monthPercent, label: 'За месяц', suffix: '%', percent: true, accent: 'from-purple-400 to-fuchsia-600', gid: 'monthGrad' },
  ];

  const chartTooltipStyle = {
    borderRadius: 16,
    border: '1px solid rgba(99,102,241,0.25)',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(8px)',
    fontSize: 13,
  };

  return (
    <section>
      {/* Мотивационное сообщение */}
      {motivation && (
        <div className="animate-fade-up mb-5 rounded-3xl bg-gradient-to-r from-orange-400/15 via-pink-400/15 to-purple-400/15 px-5 py-4 text-center text-base font-bold text-slate-700 ring-1 ring-orange-300/30 dark:text-slate-100 dark:ring-orange-400/20">
          {motivation}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Прогресс за сегодня */}
        <div className="premium animate-fade-up rounded-3xl p-5 sm:col-span-2 sm:p-6">
          <TodayRing done={doneToday} total={dueHabits.length} partial={partialToday} allTime={allTime} />
        </div>

        {/* Карточки статистики */}
        {tiles.map((tile, i) => (
          <div
            key={tile.label}
            className="glass card-lift animate-fade-up rounded-3xl p-5 sm:p-6"
            style={{ animationDelay: `${i * 80 + 100}ms` }}
          >
            <div
              className={`inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${tile.accent} text-white shadow-lg`}
            >
              <tile.Icon className="size-5" />
            </div>
            {tile.percent ? (
              <div className="mt-3">
                <ProgressRing pct={tile.value} gradientId={tile.gid} />
              </div>
            ) : (
              <div className="font-display mt-3 text-2xl font-bold text-slate-800 dark:text-slate-100">
                {tile.value}
                <span className="ml-1 text-sm font-semibold text-slate-400 dark:text-slate-500">
                  {tile.suffix}
                </span>
              </div>
            )}
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{tile.label}</p>
          </div>
        ))}
      </div>

      {/* Анимированные графики */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Столбчатая: выполнение по дням недели */}
        <div className="glass animate-fade-up rounded-3xl p-5">
          <h3 className="font-display mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Выполнение по дням недели
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekData} barSize={22}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" width={30} />
              <Tooltip
                cursor={{ fill: 'rgba(99,102,241,0.08)' }}
                contentStyle={chartTooltipStyle}
                formatter={(value) => [`${value}%`, 'выполнено']}
              />
              <Bar dataKey="pct" radius={[8, 8, 0, 0]}>
                {weekData.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#6366f1' : '#a855f7'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Линейный: прогресс за месяц */}
        <div className="glass animate-fade-up rounded-3xl p-5" style={{ animationDelay: '80ms' }}>
          <h3 className="font-display mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            Выполнено за месяц
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.15)" vertical={false} />
              <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" tickFormatter={(v) => (v % 5 === 0 ? v : '')} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#94a3b8" width={30} allowDecimals={false} />
              <Tooltip
                contentStyle={chartTooltipStyle}
                formatter={(value) => [value, 'выполнено']}
                labelFormatter={(label) => `${label} числа`}
              />
              <Line type="monotone" dataKey="done" stroke="#ec4899" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Круговая: выполнение по категориям */}
        <div className="glass animate-fade-up rounded-3xl p-5" style={{ animationDelay: '160ms' }}>
          <h3 className="font-display mb-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            По категориям
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                strokeWidth={0}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={chartTooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
            {pieData.map((entry) => (
              <span key={entry.name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="size-2.5 rounded-full" style={{ background: entry.color }} />
                {entry.name}
              </span>
            ))}
            {pieData.length === 0 && (
              <span className="text-xs text-slate-400 dark:text-slate-500">Пока нет выполнений</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}