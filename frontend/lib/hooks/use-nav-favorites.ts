"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "erp_nav_favorites";
const MAX_FAVORITES = 12;

function readFavorites(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function useNavFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

  const persist = useCallback((next: string[]) => {
    setFavorites(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const toggleFavorite = useCallback(
    (href: string) => {
      setFavorites((current) => {
        const exists = current.includes(href);
        const next = exists
          ? current.filter((item) => item !== href)
          : [href, ...current.filter((item) => item !== href)].slice(0, MAX_FAVORITES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [],
  );

  const isFavorite = useCallback(
    (href: string) => favorites.includes(href),
    [favorites],
  );

  return { favorites, toggleFavorite, isFavorite };
}
