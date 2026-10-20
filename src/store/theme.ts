import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'jungle' | 'pink' | 'aqua' | 'cyan' | 'sleek-tech';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => {
          if (state.theme === 'light') return { theme: 'dark' };
          if (state.theme === 'dark') return { theme: 'jungle' };
          if (state.theme === 'jungle') return { theme: 'pink' };
          if (state.theme === 'pink') return { theme: 'aqua' };
          if (state.theme === 'aqua') return { theme: 'cyan' };
          if (state.theme === 'cyan') return { theme: 'sleek-tech' };
          return { theme: 'light' };
        }),
    }),
    { name: 'njugush-theme' }
  )
);
