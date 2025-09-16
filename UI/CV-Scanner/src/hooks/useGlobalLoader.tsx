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

