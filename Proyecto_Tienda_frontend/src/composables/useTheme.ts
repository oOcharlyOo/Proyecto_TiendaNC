import { ref } from 'vue';

export type Theme = 'classic' | 'modern' | 'ocean' | 'forest';

const STORAGE_KEY = 'theme';

const currentTheme = ref<Theme>((localStorage.getItem(STORAGE_KEY) as Theme) || 'classic');

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

applyTheme(currentTheme.value);

export function useTheme() {
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme;
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['classic', 'modern', 'ocean', 'forest'];
    const currentIndex = themes.indexOf(currentTheme.value);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  return {
    currentTheme,
    setTheme,
    toggleTheme
  };
}
