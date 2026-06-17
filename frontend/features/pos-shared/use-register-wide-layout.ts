"use client";

import { useEffect, useState } from "react";

const REGISTER_WIDE_MIN_PX = 960;

export function useRegisterWideLayout() {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(`(min-width: ${REGISTER_WIDE_MIN_PX}px)`);
    const update = () => setIsWide(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isWide;
}
