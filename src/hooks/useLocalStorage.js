import { useEffect, useState } from 'react';

/**
 * Хук для работы с LocalStorage.
 * Значение автоматически сериализуется/десериализуется и переживает перезагрузку.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch {
      // повреждённые данные игнорируем
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // LocalStorage может быть недоступен (приватный режим и т.п.)
    }
  }, [key, value]);

  return [value, setValue];
}