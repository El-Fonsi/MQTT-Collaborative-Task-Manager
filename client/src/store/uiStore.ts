import { create } from 'zustand';

interface UiState {
  darkMode: boolean;
  sidebarOpen: boolean;
  toggleDarkMode: () => void;
  setSidebarOpen: (v: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  darkMode: localStorage.getItem('darkMode') === 'true',
  sidebarOpen: false,

  toggleDarkMode: () => {
    set((s) => {
      const next = !s.darkMode;
      localStorage.setItem('darkMode', String(next));
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { darkMode: next };
    });
  },

  setSidebarOpen: (v) => set({ sidebarOpen: v }),
}));
