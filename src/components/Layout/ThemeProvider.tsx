import { useEffect } from 'react';
import { useSettingsStore, ACCENT_COLORS } from '../../store/useSettingsStore';

const FONT_SIZE_MAP = { sm: '13px', md: '14px', lg: '16px' };

function applyDark(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { accentColor, appearance, fontSize } = useSettingsStore();

  // ── Accent color → CSS variables ───────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const c = ACCENT_COLORS[accentColor];
    root.style.setProperty('--accent-active',         c.activeBtn);
    root.style.setProperty('--accent-active-hover',   c.activeBtnHover);
    root.style.setProperty('--accent-sidebar-bg',     c.sidebarBg);
    root.style.setProperty('--accent-sidebar-border', c.sidebarBorder);
    root.style.setProperty('--accent-sidebar-hover',  c.sidebarHover);
    root.style.setProperty('--accent-sidebar-text',   c.sidebarText);
    root.style.setProperty('--accent-sidebar-muted',  c.sidebarMuted);
    root.style.setProperty('--accent-logo',           c.logoIcon);
    root.style.setProperty('--accent-hue',            c.cssHue);
    root.style.fontSize = FONT_SIZE_MAP[fontSize];
  }, [accentColor, fontSize]);

  // ── Appearance mode → .dark class ──────────────────────────────
  useEffect(() => {
    if (appearance === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      applyDark(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyDark(e.matches);
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    } else {
      applyDark(appearance === 'dark');
    }
  }, [appearance]);

  return <>{children}</>;
}
