// Категории привычек с эмодзи и градиентами под цветовую палитру из ТЗ.

export const CATEGORIES = {
  health: {
    id: 'health',
    name: 'Здоровье',
    emoji: '🍏',
    gradient: 'from-emerald-400 to-green-600',
    accent: 'text-emerald-500',
    chip: 'bg-emerald-500/15 text-emerald-600',
    glow: 'group-hover:shadow-emerald-500/40',
  },
  study: {
    id: 'study',
    name: 'Учёба',
    emoji: '📚',
    gradient: 'from-sky-400 to-blue-600',
    accent: 'text-sky-500',
    chip: 'bg-sky-500/15 text-sky-600',
    glow: 'group-hover:shadow-sky-500/40',
  },
  sport: {
    id: 'sport',
    name: 'Спорт',
    emoji: '💪',
    gradient: 'from-amber-400 to-orange-600',
    accent: 'text-amber-500',
    chip: 'bg-amber-500/15 text-amber-600',
    glow: 'group-hover:shadow-orange-500/40',
  },
  mind: {
    id: 'mind',
    name: 'Развитие',
    emoji: '🧠',
    gradient: 'from-purple-400 to-fuchsia-600',
    accent: 'text-purple-500',
    chip: 'bg-purple-500/15 text-purple-600',
    glow: 'group-hover:shadow-purple-500/40',
  },
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

export function getCategory(id) {
  return CATEGORIES[id] || CATEGORIES.health;
}