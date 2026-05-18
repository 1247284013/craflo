import { useEffect } from 'react';
import { useSettingsStore, ACCENT_COLORS } from '../../store/useSettingsStore';

const FONT_SIZE_MAP = {
  sm: '13px',
  md: '14px',
  lg: '16px',
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { accentColor, appearance, fontSize } = useSettingsStore();

  useEffect(() => {
    const root = document.documentElement;
    const config = ACCENT_COLORS[accentColor];

    // Apply accent color CSS variables
    root.style.setProperty('--accent-sidebar-bg', config.sidebarBg);
    root.style.setProperty('--accent-sidebar-border', config.sidebarBorder);
    root.style.setProperty('--accent-sidebar-hover', config.sidebarHover);
    root.style.setProperty('--accent-active', config.activeBtn);
    root.style.setProperty('--accent-active-hover', config.activeBtnHover);
    root.style.setProperty('--accent-sidebar-text', config.sidebarText);
    root.style.setProperty('--accent-sidebar-muted', config.sidebarMuted);
    root.style.setProperty('--accent-logo', config.logoIcon);
    root.style.setProperty('--accent-hue', config.cssHue);

    // Apply font size
    root.style.fontSize = FONT_SIZE_MAP[fontSize];
  }, [accentColor, fontSize]);

  useEffect(() => {
    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const isDark = appearance === 'dark' || (appearance === 'system' && prefersDark);

    if (isDark) {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#0f172a';
      document.body.style.color = '#f1f5f9';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#F0F4F8';
      document.body.style.color = '#1F2937';
    }
  }, [appearance]);

  return <>{children}</>;
}
