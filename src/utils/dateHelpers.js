// Утилиты для работы с датами.
// Все даты храним в виде строк "YYYY-MM-DD" по локальному времени пользователя.
import { isDue } from './schedule';

const MONTHS = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
];

const MONTHS_SHORT = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const pad = (n) => String(n).padStart(2, '0');

/** Дата -> строка "YYYY-MM-DD" (локальная) */
export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Строка "YYYY-MM-DD" -> локальная дата в полночь */
export function parseKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Ключ сегодняшнего дня */
export function todayKey() {
  return toKey(new Date());
}

/** Дата, смещённая на n дней */
export function addDays(date, n) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + n);
  return copy;
}

/** Понедельник недели для даты */
export function startOfWeek(date) {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (copy.getDay() + 6) % 7; // Пн = 0
  return addDays(copy, -dow);
}

/** Ключи последних n дней включительно с сегодня, по возрастанию */
export function lastNDays(n) {
  const today = todayKey();
  return Array.from({ length: n }, (_, i) => toKey(addDays(parseKey(today), -(n - 1 - i))));
}

/** Сетка недель для contribution-графика: массивы колонок [неделя][день] */
export function buildWeeksGrid(weeks = 16) {
  const monday = startOfWeek(new Date());
  const grid = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const base = addDays(monday, -w * 7);
    const column = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(base, i);
      column.push({ date, key: toKey(date), dow: (date.getDay() + 6) % 7 });
    }
    grid.push(column);
  }
  return grid;
}

/** Русское название даты, напр. "12 сентября 2026" */
export function formatRu(date) {
  const day = date.getDate();
  const month = MONTHS[date.getMonth()].toLowerCase();
  const year = date.getFullYear();
  if (year === new Date().getFullYear()) return `${day} ${month}`;
  return `${day} ${month} ${year}`;
}

/** Название месяца с годом, напр. "Сентябрь 2026" */
export function formatMonthYear(date) {
  const month = MONTHS[date.getMonth()];
  return `${month} ${date.getFullYear()}`;
}

/** Короткое название месяца по ключу даты */
export function monthLabelFor(key) {
  return MONTHS_SHORT[parseKey(key).getMonth()];
}

/** Короткое название дня недели (Пн..Вс) */
export function weekdayLabel(dow) {
  return WEEKDAYS[dow];
}

/** Сколько раз фактически выполнена привычка за день */
export function dayCount(habit, key) {
  return habit.counts?.[key] || 0;
}

/** Целевое число выполнений в день (по умолчанию 1) */
export function dayGoal(habit) {
  return habit.goal && habit.goal > 0 ? habit.goal : 1;
}

/** День полностью выполнен? (добавлен в completedDates либо счётчик достиг цели) */
export function isDayDone(habit, key) {
  return habit.completedDates.includes(key) || dayCount(habit, key) >= dayGoal(habit);
}

/** День выполнен частично? (0 < счётчик < цель) */
export function isDayPartial(habit, key) {
  const c = dayCount(habit, key);
  const g = dayGoal(habit);
  return c > 0 && c < g;
}

/** Значение выполнения дня для статистики 0..1: частичное выполнение учитывается как доля от цели */
export function dayCompletionValue(habit, key) {
  return Math.min(1, dayCount(habit, key) / dayGoal(habit));
}

/** Текущая серия выполнения подряд по плановым дням */
export function currentStreak(completedDates, isDueCheck = () => true) {
  const set = new Set(completedDates);
  let streak = 0;
  let d = new Date();
  // Если сегодня ещё не отметил — серия может продолжаться со вчера
  if (isDueCheck(d) && !set.has(toKey(d))) d = addDays(d, -1);
  let guard = 0;
  while (guard++ < 5000) {
    if (!isDueCheck(d)) {
      d = addDays(d, -1);
      continue;
    }
    if (set.has(toKey(d))) {
      streak++;
      d = addDays(d, -1);
    } else {
      break;
    }
  }
  return streak;
}

/** Максимальная серия за всю историю (только по плановым дням) */
export function bestStreak(completedDates, isDueCheck = () => true) {
  const countDueDays = (from, to) => {
    let count = 0;
    for (let x = parseKey(from); toKey(x) <= toKey(to); x = addDays(x, 1)) {
      if (isDueCheck(x)) count++;
    }
    return count;
  };

  const keys = [...new Set(completedDates)].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const key of keys) {
    const d = parseKey(key);
    if (!isDueCheck(d)) continue;
    run = prev ? (countDueDays(prev, d) === 1 ? run + 1 : 1) : 1;
    prev = d;
    best = Math.max(best, run);
  }
  return best;
}

/** Доля выполнения множества привычек за отрезок (учитывает расписание и частичный прогресс) */
export function completionFraction(habits, dayKeys) {
  if (!habits.length) return 0;
  let sum = 0;
  let total = 0;
  for (const habit of habits) {
    for (const key of dayKeys) {
      const d = parseKey(key);
      if (!isDue(habit.schedule, d)) continue;
      total++;
      sum += dayCompletionValue(habit, key);
    }
  }
  return total ? sum / total : 0;
}