import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AccentColor = 'indigo' | 'emerald' | 'violet' | 'rose' | 'amber';
export type AppearanceMode = 'light' | 'dark' | 'system';
export type FontSize = 'sm' | 'md' | 'lg';
export type SidebarMode = 'expanded' | 'collapsed';
export type LayoutMode = 'cards' | 'list';
export type Language = 'zh-CN' | 'en-US';

export interface AccentColorConfig {
  label: string;
  sidebarBg: string;
  sidebarBorder: string;
  sidebarHover: string;
  activeBtn: string;
  activeBtnHover: string;
  sidebarText: string;
  sidebarMuted: string;
  logoIcon: string;
  cssHue: string;
}

export const ACCENT_COLORS: Record<AccentColor, AccentColorConfig> = {
  indigo: {
    label: '靛紫蓝（默认）',
    sidebarBg: '#ffffff',
    sidebarBorder: 'rgba(0,0,0,0.07)',
    sidebarHover: 'rgba(99,102,241,0.08)',
    activeBtn: '#4F46E5',
    activeBtnHover: '#4338CA',
    sidebarText: '#374151',
    sidebarMuted: '#9ca3af',
    logoIcon: '#6366f1',
    cssHue: '239',
  },
  emerald: {
    label: '翠绿色',
    sidebarBg: '#ffffff',
    sidebarBorder: 'rgba(0,0,0,0.07)',
    sidebarHover: 'rgba(16,185,129,0.08)',
    activeBtn: '#059669',
    activeBtnHover: '#047857',
    sidebarText: '#374151',
    sidebarMuted: '#9ca3af',
    logoIcon: '#10b981',
    cssHue: '160',
  },
  violet: {
    label: '梦幻紫',
    sidebarBg: '#ffffff',
    sidebarBorder: 'rgba(0,0,0,0.07)',
    sidebarHover: 'rgba(124,58,237,0.08)',
    activeBtn: '#7C3AED',
    activeBtnHover: '#6D28D9',
    sidebarText: '#374151',
    sidebarMuted: '#9ca3af',
    logoIcon: '#8b5cf6',
    cssHue: '263',
  },
  rose: {
    label: '玫瑰红',
    sidebarBg: '#ffffff',
    sidebarBorder: 'rgba(0,0,0,0.07)',
    sidebarHover: 'rgba(225,29,72,0.08)',
    activeBtn: '#E11D48',
    activeBtnHover: '#BE123C',
    sidebarText: '#374151',
    sidebarMuted: '#9ca3af',
    logoIcon: '#f43f5e',
    cssHue: '347',
  },
  amber: {
    label: '暖琥珀',
    sidebarBg: '#ffffff',
    sidebarBorder: 'rgba(0,0,0,0.07)',
    sidebarHover: 'rgba(217,119,6,0.08)',
    activeBtn: '#D97706',
    activeBtnHover: '#B45309',
    sidebarText: '#374151',
    sidebarMuted: '#9ca3af',
    logoIcon: '#f59e0b',
    cssHue: '38',
  },
};

export interface SettingsState {
  accentColor: AccentColor;
  appearance: AppearanceMode;
  fontSize: FontSize;
  sidebarMode: SidebarMode;
  layoutMode: LayoutMode;
  language: Language;
  notifyDailyTask: boolean;
  notifyWeeklyReview: boolean;
  compactCards: boolean;
  showProgressBar: boolean;
  autoSave: boolean;
}

interface SettingsStore extends SettingsState {
  setAccentColor: (color: AccentColor) => void;
  setAppearance: (mode: AppearanceMode) => void;
  setFontSize: (size: FontSize) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setLanguage: (lang: Language) => void;
  setNotifyDailyTask: (v: boolean) => void;
  setNotifyWeeklyReview: (v: boolean) => void;
  setCompactCards: (v: boolean) => void;
  setShowProgressBar: (v: boolean) => void;
  setAutoSave: (v: boolean) => void;
  resetSettings: () => void;
}

const defaultSettings: SettingsState = {
  accentColor: 'indigo',
  appearance: 'light',
  fontSize: 'md',
  sidebarMode: 'expanded',
  layoutMode: 'cards',
  language: 'zh-CN',
  notifyDailyTask: true,
  notifyWeeklyReview: true,
  compactCards: false,
  showProgressBar: true,
  autoSave: true,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setAccentColor: (accentColor) => set({ accentColor }),
      setAppearance: (appearance) => set({ appearance }),
      setFontSize: (fontSize) => set({ fontSize }),
      setSidebarMode: (sidebarMode) => set({ sidebarMode }),
      setLayoutMode: (layoutMode) => set({ layoutMode }),
      setLanguage: (language) => set({ language }),
      setNotifyDailyTask: (notifyDailyTask) => set({ notifyDailyTask }),
      setNotifyWeeklyReview: (notifyWeeklyReview) => set({ notifyWeeklyReview }),
      setCompactCards: (compactCards) => set({ compactCards }),
      setShowProgressBar: (showProgressBar) => set({ showProgressBar }),
      setAutoSave: (autoSave) => set({ autoSave }),
      resetSettings: () => set(defaultSettings),
    }),
    { name: 'designpath-settings' }
  )
);
