import React, { createContext, useContext, useMemo, useRef, useState } from "react";

type State = { open: boolean };
type API = State & {
  show: (delayMs?: number) => void;
  hide: () => void;
};

const Ctx = createContext<API | null>(null);

export function BrandLoaderProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  const api: API = useMemo(() => ({
    open,
    show: (delayMs = 300) => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setOpen(true), delayMs); // avoid flash on tiny tasks
    },
    hide: () => {
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = null;
      setOpen(false);
    },
  }), [open]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useBrandLoader() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBrandLoader must be used within BrandLoaderProvider");
  return ctx;
}
