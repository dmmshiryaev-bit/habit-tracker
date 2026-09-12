import { useEffect, useRef } from 'react';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import confetti from 'canvas-confetti';
import HabitItem from './HabitItem';
import { isDayDone, todayKey } from '../utils/dateHelpers';

// Мотивационные фразы для 100% выполнения дня
const CONGRATS_MESSAGES = [
  { emoji: '🎉', title: 'Ты сегодня молодец!', text: 'Все цели достигнуты. Так держать!' },
  { emoji: '🔥', title: 'Огонь!', text: 'Ни одной пропущенной привычки. Ты машина!' },
  { emoji: '🏆', title: 'Чемпион!', text: 'Идеальный день. Гордись собой!' },
  { emoji: '⭐', title: 'Красавчик!', text: '100% выполнение. Это победа!' },
];

// Список привычек: перетаскивание, плавное появление, эмоциональное пустое состояние.
export default function HabitList({
  habits,
  onStep,
  onDelete,
  onEdit,
  onReorder,
  justAddedId,
  activeDateKey,
  totalHabits = habits.length,
}) {
  const today = todayKey();
  const completedToday = habits.filter((h) => isDayDone(h, today)).length;
  const allCompleted = habits.length > 0 && completedToday === habits.length;
  const burstDone = useRef(false);

  // Конфетти при 100% выполнении дня
  useEffect(() => {
    if (!allCompleted) {
      burstDone.current = false;
      return;
    }
    if (burstDone.current) return;
    burstDone.current = true;
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#a855f7', '#ec4899', '#eab308', '#22c55e'],
    });
  }, [allCompleted]);

  const scrollToForm = () =>
    document.getElementById('add-habit-form')?.scrollIntoView({ behavior: 'smooth' });

  // Нет ни одной привычки — призываем начать
  if (totalHabits === 0) {
    return (
      <EmptyShell>
        <div className="animate-bounce text-7xl">🌱</div>
        <h3 className="font-display mx-auto mb-4 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">
          Всё начинается с первого шага!
        </h3>
        <p className="mx-auto mb-6 max-w-md text-lg text-purple-200/80">
          Добавь свою первую привычку и начни путь к лучшей версии себя прямо сейчас.
        </p>
        <button
          type="button"
          onClick={scrollToForm}
          className="cursor-pointer rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-8 py-3 font-bold text-white shadow-lg shadow-purple-500/50 transition-all duration-300 hover:scale-105 hover:shadow-purple-500/70 active:scale-95"
        >
          ✨ Добавить первую привычку
        </button>
      </EmptyShell>
    );
  }

  // Фильтр/поиск ничего не нашёл
  if (habits.length === 0) {
    return (
      <EmptyShell>
        <div className="animate-bounce text-7xl">🔍</div>
        <h3 className="font-display mx-auto mb-4 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">
          Ничего не найдено
        </h3>
        <p className="mx-auto mb-6 max-w-md text-lg text-purple-200/80">
          По такому фильтру или поиску привычек нет — попробуй сбросить настройки, они никуда не делись 💜
        </p>
        <button
          type="button"
          onClick={scrollToForm}
          className="cursor-pointer rounded-full border-2 border-purple-400/40 px-6 py-2.5 font-semibold text-purple-200 transition-all duration-300 hover:scale-105 hover:border-purple-300 hover:bg-purple-500/10 active:scale-95"
        >
          ➕ Добавить привычку
        </button>
      </EmptyShell>
    );
  }

  // 100% выполнено — празднуем
  if (allCompleted) {
    const m = CONGRATS_MESSAGES[completedToday % CONGRATS_MESSAGES.length];
    return (
      <EmptyShell>
        <div className="animate-bounce text-7xl">{m.emoji}</div>
        <h3 className="font-display mx-auto mb-4 bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl">
          {m.title}
        </h3>
        <p className="mx-auto mb-4 max-w-md text-lg text-purple-200/80">{m.text}</p>
        <div className="mx-auto mt-2 max-w-sm">
          <div className="mb-2 flex justify-between text-sm text-purple-300">
            <span>Прогресс дня</span>
            <span className="font-bold">
              {completedToday} из {habits.length}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-purple-900/50">
            <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500" />
          </div>
        </div>
      </EmptyShell>
    );
  }

  return (
    <div className="space-y-4">
      {/* Мотивационный прогресс: часть выполнена */}
      {completedToday > 0 && (
        <div className="glass animate-fade-up rounded-2xl px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              💪 Ещё не всё, но ты справишься!
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {completedToday} из {habits.length} выполнено сегодня
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-600/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
              style={{ width: `${(completedToday / habits.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onReorder}>
        <Droppable droppableId="habits">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3"
            >
              {habits.map((habit, index) => {
                const isNew = habit.id === justAddedId;
                return (
                  <Draggable key={habit.id} draggableId={habit.id} index={index}>
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        className={isNew ? 'animate-pop-in' : 'animate-slide-up'}
                        style={{
                          ...dragProvided.draggableProps.style,
                          animationDelay: isNew ? undefined : `${Math.min(index * 60, 400)}ms`,
                          animation: snapshot.isDragging ? 'none' : undefined,
                          zIndex: snapshot.isDragging ? 30 : undefined,
                        }}
                      >
                        <div
                          {...dragProvided.dragHandleProps}
                          className={snapshot.isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                        >
                          <HabitItem
                            habit={habit}
                            activeDateKey={activeDateKey}
                            onStep={onStep}
                            onDelete={onDelete}
                            onEdit={onEdit}
                          />
                        </div>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

// «Оболочка» эмоционального пустого состояния с декоративными звёздочками
function EmptyShell({ children }) {
  return (
    <div className="animate-fade-up relative overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-br from-purple-900/40 via-indigo-900/30 to-pink-900/40 p-8 text-center md:p-12">
      <div className="absolute left-8 top-4 animate-pulse text-2xl">✨</div>
      <div className="absolute right-12 top-12 animate-pulse text-xl" style={{ animationDelay: '100ms' }}>⭐</div>
      <div className="absolute bottom-8 left-16 animate-pulse text-lg" style={{ animationDelay: '200ms' }}>💫</div>
      <div className="absolute bottom-12 right-20 animate-pulse text-2xl" style={{ animationDelay: '300ms' }}>✨</div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}