import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'jungle';

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
          return { theme: 'light' };
        }),
    }),
    { name: 'njugush-theme' }
  )
);
