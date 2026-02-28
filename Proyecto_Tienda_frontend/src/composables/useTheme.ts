import { ref } from 'vue';

export type Theme = 'classic' | 'modern' | 'ocean' | 'forest';

const currentTheme = ref<Theme>((localStorage.getItem('theme') as Theme) || 'classic');

export function useTheme() {
  const setTheme = (theme: Theme) => {
    currentTheme.value = theme;
    localStorage.setItem('theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  };

  const toggleTheme = () => {
    const themes: Theme[] = ['classic', 'modern', 'ocean', 'forest'];
    const currentIndex = themes.indexOf(currentTheme.value);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  };

  // Initialize theme on load
  document.documentElement.setAttribute('data-theme', currentTheme.value);

  return {
    currentTheme,
    setTheme,
    toggleTheme
  };
}
