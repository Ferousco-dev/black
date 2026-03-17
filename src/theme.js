const THEME_KEY = 'chronicles-theme';

export const getTheme = () => {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme || 'light';
};

export const applyTheme = (theme) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(THEME_KEY, theme);
};

export const initTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const stored = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const initial = stored || (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = initial;
  document.documentElement.style.colorScheme = initial;
  return initial;
};

export const toggleTheme = () => {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
};

export const listenToSystemTheme = (onChange) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (event) => onChange(event.matches ? 'dark' : 'light');
  media.addEventListener?.('change', handler);
  return () => media.removeEventListener?.('change', handler);
};
