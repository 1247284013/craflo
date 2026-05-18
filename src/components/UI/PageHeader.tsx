import { type ReactNode } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: string;
}

export function PageHeader({ title, subtitle, actions, badge }: PageHeaderProps) {
  const { appearance } = useSettingsStore();
  const isDark = appearance === 'dark';

  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{title}</h1>
          {badge && (
            <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-600 text-xs font-semibold rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
