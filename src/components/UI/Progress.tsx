interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  color?: 'indigo' | 'emerald' | 'amber' | 'red';
  size?: 'sm' | 'md' | 'lg';
}

const colorClasses = {
  indigo: 'bg-indigo-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const sizeClasses = {
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-3.5',
};

export function Progress({
  value,
  max = 100,
  label,
  showPercent,
  color = 'indigo',
  size = 'md',
}: ProgressProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-gray-600">{label}</span>}
          {showPercent && <span className="text-sm font-semibold text-gray-800">{pct}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} rounded-full transition-all duration-700 ease-out ${sizeClasses[size]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
