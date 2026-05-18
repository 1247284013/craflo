import { type ReactNode } from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({ children, className = '', hover, onClick, style }: CardProps) {
  const { appearance } = useSettingsStore();
  const isDark = appearance === 'dark';

  return (
    <div
      onClick={onClick}
      style={style}
      className={`
        rounded-2xl shadow-sm border
        ${isDark
          ? 'bg-slate-800 border-slate-700 text-gray-100'
          : 'bg-white border-gray-100 text-gray-900'
        }
        ${hover ? 'hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
