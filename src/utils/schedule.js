// Расписания привычек: когда привычка "по плану".

export const WEEKDAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const SCHEDULE_TYPE_OPTIONS = [
  { id: 'daily', label: 'Ежедневно', emoji: '📆' },
  { id: 'weekly', label: 'По дням недели', emoji: '🗓️' },
  { id: 'monthly', label: 'Каждый месяц', emoji: '📅' },
];

const fill = (n) => String(n).padStart(2, '0');
const keyOf = (date) =>
  `${date.getFullYear()}-${fill(date.getMonth() + 1)}-${fill(date.getDate())}`;

/**
 * Проверка: является ли дата "плановой" для привычки.
 * schedule: { type: 'daily' }
 *         | { type: 'weekly', days: [1..7] }
 *         | { type: 'monthly', day: 1..31, lastDay?: bool }
 *         | { type: 'once', date: 'YYYY-MM-DD' } — разовая задача на конкретную дату
 */
export function isDue(schedule, date) {
  const s = schedule || { type: 'daily' };

  if (s.type === 'weekly') {
    // getDay(): Вс=0..Сб=6 -> Пн=1..Вс=7
    const dow = ((date.getDay() + 6) % 7) + 1;
    return (s.days || []).includes(dow);
  }

  if (s.type === 'monthly') {
    if (s.lastDay) {
      const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      return date.getDate() === lastDate;
    }
    return date.getDate() === (s.day || 1);
  }

  if (s.type === 'once') {
    return keyOf(date) === (s.date || '');
  }

  return true; // daily по умолчанию
}

/** Человекочитаемая подпись расписания */
export function scheduleLabel(schedule) {
  const s = schedule || { type: 'daily' };

  if (s.type === 'weekly') {
    const days = (s.days || []).slice().sort((a, b) => a - b);
    const names = days.map((d) => WEEKDAY_NAMES[d - 1]);
    return names.join(', ');
  }

  if (s.type === 'monthly') {
    return s.lastDay ? 'последний день месяца' : `${s.day} числа каждого месяца`;
  }

  if (s.type === 'once') {
    return 'разовая задача на дату';
  }

  return 'каждый день';
}