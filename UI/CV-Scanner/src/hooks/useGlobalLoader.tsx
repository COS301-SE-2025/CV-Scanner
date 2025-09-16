import React, { createContext, useContext, useMemo, useRef, useState } from "react";


export type LoaderState = {
open: boolean;
message?: string;
detail?: string;
percent?: number | null;
};


export type LoaderAPI = {
/** Show after an optional delay to avoid flicker */
show: (opts?: Partial<LoaderState> & { delayMs?: number }) => void;
/** Hide immediately */
hide: () => void;
/** Convenience: wraps an async function and shows loader automatically */
withLoader: <T,>(fn: () => Promise<T>, opts?: Partial<LoaderState> & { delayMs?: number }) => Promise<T>;
setProgress: (value: number | null) => void;
} & LoaderState;


const Ctx = createContext<LoaderAPI | null>(null);

export function GlobalLoaderProvider({ children }: { children: React.ReactNode }) {
const [state, setState] = useState<LoaderState>({ open: false, percent: null, message: "Loading…" });
const delayHandle = useRef<number | null>(null);


const api: LoaderAPI = useMemo(() => ({
...state,
show: (opts) => {
const { delayMs = 400, ...rest } = opts || {};
if (delayHandle.current) window.clearTimeout(delayHandle.current);
delayHandle.current = window.setTimeout(() => {
setState((s) => ({ ...s, open: true, ...rest }));
}, delayMs);
},
hide: () => {
if (delayHandle.current) window.clearTimeout(delayHandle.current);
delayHandle.current = null;
setState((s) => ({ ...s, open: false, percent: null }));
},
withLoader: async (fn, opts) => {
api.show(opts);
try {
const res = await fn();
return res;
} finally {
api.hide();
}
},
setProgress: (value) => setState((s) => ({ ...s, percent: value })),
}), [state]);


return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}


export function useGlobalLoader() {
const ctx = useContext(Ctx);
if (!ctx) throw new Error("useGlobalLoader must be used within GlobalLoaderProvider");
return ctx;
}