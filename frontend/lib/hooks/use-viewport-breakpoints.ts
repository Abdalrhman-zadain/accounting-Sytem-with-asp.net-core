"use client";

import { useEffect, useState } from "react";

export const NAV_DESKTOP_MIN_PX = 1024;
export const POS_NAV_DESKTOP_MIN_PX = 1280;
export const POS_WIDE_MIN_PX = 960;
export const WAITER_WIDE_MIN_PX = 768;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

/** True when the fixed desktop sidebar layout is active (≥1024px). */
export function useNavDesktopLayout() {
  return useMediaQuery(`(min-width: ${NAV_DESKTOP_MIN_PX}px)`);
}

/** True when POS register uses side-by-side catalog + cart (≥960px). */
export function usePosWideLayout() {
  return useMediaQuery(`(min-width: ${POS_WIDE_MIN_PX}px)`);
}

/** True when waiter order uses side-by-side catalog + cart (≥768px). */
export function useWaiterWideLayout() {
  return useMediaQuery(`(min-width: ${WAITER_WIDE_MIN_PX}px)`);
}

/** True when POS routes show the fixed ERP sidebar (≥1280px). Below that, floating menu + full width. */
export function usePosNavDesktopLayout() {
  return useMediaQuery(`(min-width: ${POS_NAV_DESKTOP_MIN_PX}px)`);
}
