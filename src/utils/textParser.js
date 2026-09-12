// Разбор текста ввода: вытаскиваем дату и время из названия привычки.
// Пример: "добавить на 15 сентября физика в 11:20" ->
//   { name: 'физика', date: '2026-09-15', time: '11:20' }

const ACTION_VERBS_RE =
  /^(?:добавить|добавь|создать|создай|записать|запиши|напомни|отметь|поставить|поставь)\s+/i;

const MONTH_NAMES = [
  ['январь', 'января'],
  ['февраль', 'февраля'],
  ['март', 'марта'],
  ['апрель', 'апреля'],
  ['май', 'мая'],
  ['июнь', 'июня'],
  ['июль', 'июля'],
  ['август', 'августа'],
  ['сентябрь', 'сентября'],
  ['октябрь', 'октября'],
  ['ноябрь', 'ноября'],
  ['декабрь', 'декабря'],
];

const fill = (n) => String(n).padStart(2, '0');

const keyFromYMD = (y, m, d) => `${y}-${fill(m + 1)}-${fill(d)}`;

const todayKeyLocal = () => {
  const n = new Date();
  return keyFromYMD(n.getFullYear(), n.getMonth(), n.getDate());
};

/**
 * Разбирает строку и возвращает { name, date, time }.
 * date/time могут быть null. Если дата без года и уже прошла — берём следующий год.
 */
export function parseHabitInput(raw) {
  let text = (raw || '').trim().replace(ACTION_VERBS_RE, '');
  if (!text) return null;

  const parsed = { name: '', date: null, time: null };

  // 1) Время: "в 11:20", "11:20", "в 11.20"
  const timeMatch =
    text.match(/(в\s+)?(\d{1,2}):(\d{2})(?![\d:])/) ||
    text.match(/(в\s+)(\d{1,2})\.(\d{2})(?!\d)/);
  if (timeMatch) {
    const h = +timeMatch[2];
    const m = +timeMatch[3];
    if (h <= 23 && m <= 59) {
      parsed.time = `${fill(h)}:${fill(m)}`;
      text = text.replace(timeMatch[0], '');
    }
  }

  // 2) Дата словом: "15 сентября", "15-го сентября", "на 15 сентября"
  const monthRe = MONTH_NAMES.flat().join('|');
  const dateByName = text.match(
    new RegExp(`(?:на\\s+)?(\\d{1,2})(?:-го)?\\s+(${monthRe})`, 'i')
  );
  if (dateByName) {
    const day = +dateByName[1];
    const monthIdx = MONTH_NAMES.findIndex((m) =>
      m.includes(dateByName[2].toLowerCase())
    );
    if (day >= 1 && day <= 31 && monthIdx !== -1) {
      const year = new Date().getFullYear();
      let date = new Date(year, monthIdx, day);
      if (keyFromYMD(date.getFullYear(), date.getMonth(), date.getDate()) < todayKeyLocal()) {
        date = new Date(year + 1, monthIdx, day);
      }
      parsed.date = keyFromYMD(date.getFullYear(), date.getMonth(), date.getDate());
      text = text.replace(dateByName[0], '');
    }
  }

  // 3) Числовая дата: "15.09", "15.09.2026", "15/09"
  if (!parsed.date) {
    const numMatch = text.match(/(?:на\s+)?(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?/);
    if (numMatch) {
      const day = +numMatch[1];
      const month = +numMatch[2];
      const yearRaw = numMatch[3] ? +numMatch[3] : null;
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        let year = yearRaw || new Date().getFullYear();
        let date = new Date(year, month - 1, day);
        if (!yearRaw && keyFromYMD(date.getFullYear(), date.getMonth(), date.getDate()) < todayKeyLocal()) {
          date = new Date(year + 1, month - 1, day);
        }
        parsed.date = keyFromYMD(date.getFullYear(), date.getMonth(), date.getDate());
        text = text.replace(numMatch[0], '');
      }
    }
  }

  // 4) Относительные даты: сегодня / завтра / послезавтра
  if (!parsed.date) {
    const rel = text.match(/(?:^|\s)(сегодня|завтра|послезавтра)(?=\s|$)/i);
    if (rel) {
      const n = new Date();
      if (/завтра/i.test(rel[1])) n.setDate(n.getDate() + 1);
      else if (/послезавтра/i.test(rel[1])) n.setDate(n.getDate() + 2);
      parsed.date = keyFromYMD(n.getFullYear(), n.getMonth(), n.getDate());
      text = text.replace(rel[0], ' ');
    }
  }

  // 5) Убираем одиночные "на" в начале строки
  text = text.replace(/^на\s+/i, '').replace(/[,\s]+$/, '').trim();

  parsed.name = text;
  return parsed;
}