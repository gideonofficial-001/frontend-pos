import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'jungle' | 'pink' | 'aqua' | 'cyan' | 'obsidian-sleek' | 'sleek-tech';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme: (theme as string) === 'sleek-tech' ? 'obsidian-sleek' : theme }),
      toggleTheme: () =>
        set((state) => {
          if (state.theme === 'light') return { theme: 'dark' };
          if (state.theme === 'dark') return { theme: 'jungle' };
          if (state.theme === 'jungle') return { theme: 'pink' };
          if (state.theme === 'pink') return { theme: 'aqua' };
          if (state.theme === 'aqua') return { theme: 'cyan' };
          if (state.theme === 'cyan') return { theme: 'obsidian-sleek' };
          return { theme: 'light' };
        }),
    }),
    { name: 'njugush-theme' }
  )
);
