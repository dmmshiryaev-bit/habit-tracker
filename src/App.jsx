import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar as CalendarIcon,
  CalendarPlus as CalendarPlusIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileJson,
  FileSpreadsheet,
  Hourglass,
  LayoutGrid,
  Plus as PlusIcon,
  Search,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Calendar from './components/Calendar';
import HabitForm from './components/HabitForm';
import HabitList from './components/HabitList';
import Stats from './components/Stats';
import ThemeToggle from './components/ThemeToggle';
import { useLocalStorage } from './hooks/useLocalStorage';
import { CATEGORY_LIST, getCategory } from './utils/categories';
import { isDue, scheduleLabel } from './utils/schedule';
import { addDays, formatRu, isDayDone, parseKey, toKey, todayKey, weekdayLabel } from './utils/dateHelpers';

const makeId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Простая система тостов-уведомлений
function Toast({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 2600);
    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div className="glass animate-pop-in fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl px-5 py-3 shadow-2xl">
      <span className="text-2xl">{toast.emoji}</span>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{toast.text}</p>
    </div>
  );
}

// Привычки, актуальные на конкретный день (по расписанию или уже отмеченные)
const relevantOnDay = (habits, key) =>
  habits.filter((h) => isDue(h.schedule, parseKey(key)) || h.completedDates.includes(key));

const VALID_SCHEDULE = new Set(['daily', 'weekly', 'monthly', 'once']);

// Приводим импортированные данные к ожидаемой структуре (аккуратный импорт)
const sanitizeHabit = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const schedule =
    raw.schedule && VALID_SCHEDULE.has(raw.schedule.type)
      ? raw.schedule
      : { type: 'daily' };
  const id = typeof raw.id === 'string' && raw.id ? raw.id : makeId();
  return {
    id,
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name.trim() : 'Привычка',
    categoryId: CATEGORY_LIST.some((c) => c.id === raw.categoryId)
      ? raw.categoryId
      : CATEGORY_LIST[0].id,
    emoji: typeof raw.emoji === 'string' ? raw.emoji : '',
    schedule,
    goal: Number(raw.goal) > 0 ? Number(raw.goal) : 1,
    counts: raw.counts && typeof raw.counts === 'object' ? raw.counts : {},
    time: typeof raw.time === 'string' ? raw.time : null,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : todayKey(),
    completedDates: Array.isArray(raw.completedDates) ? raw.completedDates : [],
  };
};

export default function App() {
  const [habits, setHabits] = useLocalStorage('habit-tracker-habits', []);
  const [theme, setTheme] = useLocalStorage(
    'habit-tracker-theme',
    () =>
      window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );
  const [filter, setFilter] = useState('all');
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [viewDate, setViewDate] = useState(null); // выбранный день (key) или null = все дни
  const [presetDate, setPresetDate] = useState(null); // дата для новой задачи
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [justAddedId, setJustAddedId] = useState(null);
  const [toast, setToast] = useState(null);

  const formRef = useRef(null);
  const importRef = useRef(null);
  const exportRef = useRef(null);
  const toastId = useRef(0);
  const today = todayKey();

  // Закрывать выпадающее меню «Скачать» по клику вне его
  useEffect(() => {
    if (!exportOpen) return;
    const onDocClick = (e) => {
      if (exportRef.current && !exportRef.current.contains(e.target)) setExportOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [exportOpen]);

  const editingHabit = useMemo(
    () => habits.find((h) => h.id === editingId) || null,
    [habits, editingId]
  );

  // Сдвиг выбранного дня на n дней
  const shiftDay = (n) => {
    const base = viewDate || today;
    setViewDate(toKey(addDays(parseKey(base), n)));
  };

  // Заголовок и подпись выбранного дня
  const dayInfo = useMemo(() => {
    if (!viewDate) return { title: 'Все дни', date: formatRu(new Date()) };
    const date = parseKey(viewDate);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const diff = Math.round((date - startOfToday) / 86400000);
    let title = `День ${date.getDate()}`;
    if (diff === 0) title = 'Сегодня';
    else if (diff === 1) title = 'Завтра';
    else if (diff === 2) title = 'Послезавтра';
    else if (diff === -1) title = 'Вчера';
    return { title, date: formatRu(date), weekday: weekdayLabel(date.getDay()) };
  }, [viewDate]);

  // Применяем тему к <html> для Tailwind dark-режима
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const notify = (emoji, text) =>
    setToast({ id: ++toastId.current, emoji, text });

  const handleAdd = (data) => {
    const habit = { id: makeId(), ...data, createdAt: today };
    setHabits((prev) => [habit, ...prev]);
    setJustAddedId(habit.id);
    setPresetDate(null);
    setSearch('');
    notify('🎉', `Привычка «${habit.name}» добавлена!`);
  };

  const handleUpdate = (data) => {
    if (!editingId) return;
    setHabits((prev) =>
      prev.map((h) => (h.id === editingId ? { ...h, ...data } : h))
    );
    notify('✏️', `Привычка «${data.name}» обновлена!`);
    setEditingId(null);
  };

  const handleDelete = (id) => {
    const habit = habits.find((h) => h.id === id);
    setHabits((prev) => prev.filter((h) => h.id !== id));
    if (editingId === id) setEditingId(null);
    notify('🗑️', `Привычка «${habit?.name}» удалена`);
  };

  // Шаг прогресса: +1 / -1 выполнение за конкретный день (по умолчанию — сегодня)
  const handleStep = (id, delta, key = today) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const goal = h.goal && h.goal > 0 ? h.goal : 1;
        const current = h.counts?.[key] || 0;
        const next = Math.max(0, Math.min(goal, current + delta));

        const counts = { ...(h.counts || {}) };
        if (next === 0) delete counts[key];
        else counts[key] = next;

        // Полное выполнение дня дублируем в completedDates (нужно для серий/графиков)
        const completedDates = h.completedDates.filter((d) => d !== key);
        if (next >= goal) completedDates.push(key);

        return { ...h, counts, completedDates };
      })
    );
  };

  // Перестановка карточек перетаскиванием (drag-and-drop)
  const handleReorder = (result) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    setHabits((prev) => {
      const next = [...prev];
      const [moved] = next.splice(result.source.index, 1);
      next.splice(result.destination.index, 0, moved);
      return next;
    });
  };

  // Запланировать новую задачу на выбранный день (прокрутка к форме)
  const planOnDay = (key) => {
    setPresetDate(key);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Экспорт данных в Excel (по умолчанию)
  const handleExportExcel = () => {
    const rows = habits.map((h) => ({
      Название: h.name,
      Категория: getCategory(h.categoryId).name,
      Расписание: scheduleLabel(h.schedule),
      'Цель (раз/день)': h.goal || 1,
      'Выполнено раз': h.completedDates?.length ?? 0,
      Создана: h.createdAt || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 30 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Привычки');
    XLSX.writeFile(wb, 'habit-tracker.xlsx');
    notify('📊', `Excel сохранён: ${habits.length} привычек`);
  };

  // Экспорт данных в JSON (резервный формат)
  const handleExport = () => {
    const blob = new Blob([JSON.stringify(habits, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'habit-tracker-data.json';
    a.click();
    URL.revokeObjectURL(url);
    notify('📤', `JSON экспортирован: ${habits.length} привычек`);
  };

  // Импорт данных из JSON
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        const list = Array.isArray(data) ? data : data?.habits;
        if (!Array.isArray(list)) {
          notify('❌', 'Файл не похож на данные трекера');
          return;
        }
        const clean = list.map(sanitizeHabit).filter(Boolean);
        if (clean.length === 0) {
          notify('❌', 'В файле нет валидных привычек');
          return;
        }
        setHabits((prev) => {
          const ids = new Set(prev.map((h) => h.id));
          return [...prev, ...clean.filter((h) => !ids.has(h.id))];
        });
        notify('📥', `Импортировано привычек: ${clean.length}`);
      } catch {
        notify('❌', 'Не удалось прочитать файл');
      }
    };
    reader.readAsText(file);
  };

  // Привычки, актуальные на сегодня/завтра
  const todayHabits = relevantOnDay(habits, today);
  const tomorrowKey = toKey(addDays(parseKey(today), 1));
  const tomorrowHabits = relevantOnDay(habits, tomorrowKey);

  // Не выполненные сегодня (для счётчика на переключателе)
  const todayIncomplete = todayHabits.filter((h) => !isDayDone(h, today));

  // Итоговая фильтрация: день + категория + «не выполнено» + поиск по названию
  const filteredHabits = useMemo(() => {
    let list = habits;
    if (viewDate) list = relevantOnDay(list, viewDate);
    if (filter !== 'all') list = list.filter((h) => h.categoryId === filter);
    if (incompleteOnly) {
      const activeKey = viewDate || today;
      list = list.filter(
        (h) => isDue(h.schedule, parseKey(activeKey)) && !isDayDone(h, activeKey)
      );
    }
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((h) => h.name.toLowerCase().includes(q));
    return list;
  }, [habits, viewDate, filter, incompleteOnly, search, today]);

  const countByCategory = useMemo(() => {
    const map = {};
    for (const h of habits) map[h.categoryId] = (map[h.categoryId] || 0) + 1;
    return map;
  }, [habits]);

  return (
    <div className="relative min-h-screen text-slate-900 dark:text-slate-100">
      {/* Фон и декоративные блобы */}
      <div className="app-bg" />
      <div className="blob size-96 bg-indigo-400/40" style={{ top: '-120px', left: '-80px' }} />
      <div
        className="blob size-80 bg-pink-400/30"
        style={{ top: '30%', right: '-100px', animationDelay: '-4s' }}
      />
      <div
        className="blob size-72 bg-purple-500/30"
        style={{ bottom: '-80px', left: '25%', animationDelay: '-2s' }}
      />

      {toast && <Toast toast={toast} onClose={() => setToast(null)} />}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Шапка: прилипает сверху и лежит поверх всего контента */}
        <header className="animate-fade-up glass sticky top-2 z-40 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl px-4 py-3 shadow-xl shadow-purple-500/5 sm:mb-8 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="animate-float flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-2xl shadow-xl shadow-purple-500/30">
              🚀
            </span>
            <div>
              <h1 className="font-display text-xl font-bold sm:text-2xl">
                <span className="text-shine">Трекер привычек</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatRu(new Date())}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="glass hidden items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 md:flex dark:text-slate-200">
              📌 {habits.length} {habits.length === 1 ? 'привычка' : habits.length < 5 ? 'привычки' : 'привычек'}
            </span>

            {/* Скачивание данных: раскрывающийся список (Excel / JSON) */}
            <div ref={exportRef} className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                title="Скачать данные (Excel или JSON)"
                className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${
                  exportOpen
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 shadow-indigo-500/30'
                    : 'bg-gradient-to-r from-emerald-400 to-green-600 shadow-emerald-500/30'
                }`}
              >
                <Download className="size-4" />
                <span className="hidden sm:inline">Скачать</span>
                <ChevronDown
                  className={`size-4 transition-transform duration-200 ${exportOpen ? 'rotate-180' : ''}`}
                />
              </button>
              {exportOpen && (
                <div className="glass animate-fade-up absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl p-2 shadow-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      handleExportExcel();
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-emerald-500/10"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-300">
                      <FileSpreadsheet className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-700 dark:text-slate-100">
                        Excel (.xlsx)
                      </span>
                      <span className="block text-xs font-normal text-slate-400 dark:text-slate-500">
                        Таблица для просмотра
                      </span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      handleExport();
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-indigo-500/10"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500 dark:text-indigo-300">
                      <FileJson className="size-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-slate-700 dark:text-slate-100">
                        JSON (.json)
                      </span>
                      <span className="block text-xs font-normal text-slate-400 dark:text-slate-500">
                        Резервная копия / импорт
                      </span>
                    </span>
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => importRef.current?.click()}
              title="Импорт данных (JSON)"
              className="glass flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 dark:text-slate-200"
            >
              <Upload className="size-4" />
              <span className="hidden sm:inline">Импорт</span>
            </button>
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleImportFile}
            />

            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </header>

        {/* Аннонс для зрителей портфолио */}
        <div className="animate-fade-up mb-6 rounded-2xl border border-indigo-200/50 bg-gradient-to-r from-indigo-100/70 via-purple-100/70 to-pink-100/70 px-4 py-3 text-sm text-indigo-900/80 dark:border-indigo-400/20 dark:from-night-700/60 dark:via-purple-900/40 dark:to-pink-900/40 dark:text-indigo-200">
          ✨ Личный трекер привычек: LocalStorage, React + Vite + Tailwind — всё
          сохраняется прямо в браузере.
        </div>

        {/* Статистика и графики */}
        <Stats habits={habits} />

        {/* Форма добавления / редактирования */}
        <div className="mt-6" id="add-habit-form" ref={formRef}>
          <HabitForm
            key={editingHabit ? editingHabit.id : 'new'}
            onAdd={handleAdd}
            onUpdate={handleUpdate}
            initial={editingHabit}
            onCancelEdit={() => setEditingId(null)}
            presetDate={editingHabit ? null : presetDate}
            onClearPreset={() => setPresetDate(null)}
          />
        </div>

        {/* Карта выполнения */}
        {habits.length > 0 && (
          <div className="mt-6">
            <Calendar habits={habits} />
          </div>
        )}

        {/* Список привычек: фильтр, поиск и категории */}
        <div className="mt-6">
          {habits.length > 0 && (
            <>
              <div className="animate-fade-up mb-3 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
                  Фильтр:
                </span>

                {/* Навигация по дням */}
                <div
                  className={`flex items-center gap-1 rounded-full border-2 p-1 transition-colors ${
                    viewDate
                      ? 'border-indigo-400/60 bg-indigo-500/10'
                      : 'border-slate-200/70 bg-white/50 dark:border-slate-600/50 dark:bg-night-700/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => shiftDay(-1)}
                    aria-label="Предыдущий день"
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-indigo-500 transition-all duration-200 hover:bg-indigo-500/10 active:scale-90 dark:text-indigo-300"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                  <div className="min-w-28 px-1 text-center">
                    <p className="text-sm font-bold leading-tight text-slate-800 dark:text-slate-100">
                      {dayInfo.title}
                    </p>
                    <p className="text-[11px] leading-tight text-slate-400 dark:text-slate-500">
                      {dayInfo.weekday}, {dayInfo.date}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => shiftDay(1)}
                    aria-label="Следующий день"
                    className="flex size-9 cursor-pointer items-center justify-center rounded-full text-indigo-500 transition-all duration-200 hover:bg-indigo-500/10 active:scale-90 dark:text-indigo-300"
                  >
                    <ChevronRight className="size-5" />
                  </button>
                </div>

                <FilterChip
                  active={viewDate === today}
                  onClick={() => setViewDate(today)}
                  icon={<CalendarIcon className="size-4" />}
                  label="Сегодня"
                  count={todayHabits.length}
                />
                <FilterChip
                  active={viewDate === tomorrowKey}
                  onClick={() => setViewDate(tomorrowKey)}
                  icon={<CalendarPlusIcon className="size-4" />}
                  label="Завтра"
                  count={tomorrowHabits.length}
                />

                {/* Показать только не выполненные задачи (на выбранный день / сегодня) */}
                <FilterChip
                  active={incompleteOnly}
                  onClick={() => {
                    const next = !incompleteOnly;
                    setIncompleteOnly(next);
                    if (next && !viewDate) setViewDate(today);
                  }}
                  icon={<Hourglass className="size-4" />}
                  label="Не выполнено"
                  count={todayIncomplete.length}
                />

                {/* Планирование на выбранный день */}
                {viewDate && (
                  <button
                    type="button"
                    onClick={() => planOnDay(viewDate)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 px-3.5 py-1.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                  >
                    <PlusIcon className="size-4" />
                    <span className="hidden sm:inline">Запланировать на </span>
                    {dayInfo.date}
                  </button>
                )}
              </div>

              {/* Поиск по привычкам */}
              <div className="animate-fade-up mb-5 flex flex-wrap items-center gap-2">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="🔍 Поиск по привычкам…"
                    className="w-full rounded-full border-2 border-slate-200/70 bg-white/50 py-2 pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white/80 focus:shadow-lg focus:shadow-indigo-500/20 dark:border-slate-600/50 dark:bg-night-700/50 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label="Очистить поиск"
                      className="absolute right-2.5 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-600 dark:hover:bg-slate-600/50 dark:hover:text-slate-200"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <FilterChip
                  active={!viewDate && filter === 'all' && !search && !incompleteOnly}
                  onClick={() => {
                    setViewDate(null);
                    setFilter('all');
                    setIncompleteOnly(false);
                    setSearch('');
                  }}
                  icon={<LayoutGrid className="size-4" />}
                  label="Все"
                  count={habits.length}
                />
                {CATEGORY_LIST.map((cat) => (
                  <FilterChip
                    key={cat.id}
                    active={filter === cat.id}
                    onClick={() => setFilter(cat.id)}
                    label={`${cat.emoji} ${cat.name}`}
                    count={countByCategory[cat.id] || 0}
                  />
                ))}
              </div>
            </>
          )}
          <HabitList
            habits={filteredHabits}
            totalHabits={habits.length}
            activeDateKey={viewDate}
            onStep={handleStep}
            onDelete={handleDelete}
            onEdit={setEditingId}
            onReorder={handleReorder}
            justAddedId={justAddedId}
          />
        </div>

        <footer className="mt-10 pb-4 text-center text-xs text-slate-400 dark:text-slate-500">
          Сделано с 💜 на React + Vite + Tailwind CSS
        </footer>
      </main>
    </div>
  );
}

// Чип фильтра по категории/дню с иконкой
function FilterChip({ active, onClick, label, count, icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-300 active:scale-95 ${
        active
          ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
          : 'glass text-slate-600 hover:-translate-y-0.5 dark:text-slate-300'
      }`}
    >
      {icon && <span>{icon}</span>}
      {label}
      <span
        className={`rounded-full px-1.5 text-xs ${
          active ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-600/50'
        }`}
      >
        {count}
      </span>
    </button>
  );
}