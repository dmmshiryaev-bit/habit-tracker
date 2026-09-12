// Переключатель тёмной/светлой темы с плавной анимацией.

export default function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
      className="theme-switch relative flex h-11 w-20 cursor-pointer items-center rounded-full border border-indigo-200/60 bg-gradient-to-r from-indigo-100 to-pink-100 p-1 shadow-lg shadow-indigo-500/20 transition-colors dark:border-indigo-400/20 dark:from-night-700 dark:to-night-600 dark:shadow-black/40"
    >
      {/* Ползунок */}
      <span
        className={`pointer-events-none absolute top-1 size-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md transition-all duration-500 ${
          isDark ? 'left-[calc(100%-2.5rem)]' : 'left-1'
        }`}
      />
      {/* Иконки */}
      <span className="relative z-10 flex w-full items-center justify-between px-1.5 text-base leading-none">
        <span className={isDark ? 'opacity-40 transition-opacity' : 'opacity-100'}>☀️</span>
        <span className={isDark ? 'opacity-100' : 'opacity-40 transition-opacity'}>🌙</span>
      </span>
    </button>
  );
}