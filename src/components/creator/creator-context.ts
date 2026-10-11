"use client";

import { useSyncExternalStore } from "react";
import { CREATORS, creatorById } from "@/lib/domain/creators";
import type { Creator } from "@/lib/domain/types";

// "Viewing as" selection for the demo creator app. Persisted in localStorage and
// read through useSyncExternalStore so the server render (and hydration) always
// uses the default creator, then switches to the stored one on the client.

const KEY = "cc-creator-id";
export const DEFAULT_CREATOR_ID = "c1";

const listeners = new Set<() => void>();
let memory: string | null = null; // fallback when storage is unavailable

function valid(id: string | null | undefined): id is string {
  return !!id && CREATORS.some((c) => c.id === id);
}

function read(): string {
  try {
    const stored = localStorage.getItem(KEY);
    if (valid(stored)) return stored;
  } catch {
    // storage unavailable
  }
  return valid(memory) ? memory : DEFAULT_CREATOR_ID;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setCreatorId(id: string) {
  memory = id;
  try {
    localStorage.setItem(KEY, id);
  } catch {
    // keep in memory only
  }
  for (const l of listeners) l();
}

export function useCreatorId() {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_CREATOR_ID);
}

export function useCurrentCreator(): Creator {
  const id = useCreatorId();
  return creatorById(id) ?? creatorById(DEFAULT_CREATOR_ID)!;
}
