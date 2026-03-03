"use client";

import { create } from "zustand";

export interface CartItem {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "link";
}

interface SendCartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  toggleItem: (item: CartItem) => void;
  hasItem: (id: string) => boolean;
  clear: () => void;
}

export const useSendCart = create<SendCartState>((set, get) => ({
  items: [],
  addItem: (item) =>
    set((state) => {
      if (state.items.some((i) => i.id === item.id)) return state;
      return { items: [...state.items, item] };
    }),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  toggleItem: (item) => {
    const has = get().items.some((i) => i.id === item.id);
    if (has) {
      get().removeItem(item.id);
    } else {
      get().addItem(item);
    }
  },
  hasItem: (id) => get().items.some((i) => i.id === id),
  clear: () => set({ items: [] }),
}));
