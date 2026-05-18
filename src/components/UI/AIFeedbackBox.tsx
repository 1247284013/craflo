import { Sparkles, AlertCircle, CheckCircle } from 'lucide-react';
import { useT } from '../../hooks/useT';

interface AIFeedbackBoxProps {
  feedback: string;
  missing?: string[];
  type?: 'info' | 'warning' | 'success';
  title?: string;
}

export function AIFeedbackBox({ feedback, missing, type = 'info', title }: AIFeedbackBoxProps) {
  const tl = useT();
  const resolvedTitle = title ?? tl.common.aiFeedback;
  const styles = {
    info: {
      wrapper: 'bg-indigo-50 border-indigo-200',
      icon: <Sparkles size={16} className="text-indigo-600" />,
      title: 'text-indigo-700',
      text: 'text-indigo-600',
      badge: 'bg-indigo-100 text-indigo-600',
    },
    warning: {
      wrapper: 'bg-amber-50 border-amber-200',
      icon: <AlertCircle size={16} className="text-amber-600" />,
      title: 'text-amber-700',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-600',
    },
    success: {
      wrapper: 'bg-emerald-50 border-emerald-200',
      icon: <CheckCircle size={16} className="text-emerald-600" />,
      title: 'text-emerald-700',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-600',
    },
  };

  const s = styles[type];

  return (
    <div className={`rounded-xl border p-4 ${s.wrapper}`}>
      <div className="flex items-center gap-2 mb-2">
        {s.icon}
        <span className={`text-sm font-semibold ${s.title}`}>{resolvedTitle}</span>
      </div>
      <p className={`text-sm leading-relaxed ${s.text}`}>{feedback}</p>
      {missing && missing.length > 0 && (
        <div className="mt-3">
          <div className={`text-xs font-medium mb-2 ${s.title}`}>{tl.common.missingLabel}</div>
          <div className="flex flex-wrap gap-1.5">
            {missing.map((item, i) => (
              <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${s.badge}`}>
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
