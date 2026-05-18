import { useSettingsStore } from '../store/useSettingsStore';
import { getT } from '../utils/i18n';
import type { Translations } from '../utils/i18n';

export function useT(): Translations {
  const { language } = useSettingsStore();
  return getT(language);
}
