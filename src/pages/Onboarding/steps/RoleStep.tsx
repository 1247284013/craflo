import { useState } from 'react';
import { CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { ROLES } from '../../../utils/roleData';
import type { TargetRole } from '../../../types';
import { Button, Badge } from '../../../components/UI';
import { useT } from '../../../hooks/useT';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

export function RoleStep({ onNext, onBack }: Props) {
  const { targetRole, setTargetRole } = useAppStore();
  const [selected, setSelected] = useState<TargetRole | null>(targetRole);
  const [expanded, setExpanded] = useState<string | null>(null);
  const t = useT();
  const tr = t.onboarding.role;

  const handleSelect = (role: TargetRole) => {
    setSelected(role);
    setExpanded(role);
  };

  const handleNext = () => {
    if (!selected) return;
    setTargetRole(selected);
    onNext();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 mb-4">{tr.hint}</p>

      {ROLES.map((role) => {
        const isSelected = selected === role.id;
        const isExpanded = expanded === role.id;

        return (
          <div
            key={role.id}
            className={`border-2 rounded-xl transition-all overflow-hidden ${
              isSelected ? 'border-indigo-500' : 'border-gray-200 hover:border-indigo-200'
            }`}
          >
            <button
              type="button"
              className="w-full text-left"
              onClick={() => handleSelect(role.id as TargetRole)}
            >
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      isSelected ? 'border-indigo-500 bg-indigo-500' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <CheckCircle size={14} className="text-white" />}
                  </div>
                  <div>
                    <div className={`font-semibold text-sm ${isSelected ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {role.name}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5 line-clamp-1">{role.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={12} />
                    <span>{role.recommendedWeeks}{tr.recommendedWeeks}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpanded(isExpanded ? null : role.id);
                    }}
                    className="p-1 rounded-lg hover:bg-gray-100"
                  >
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                </div>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
                <div className="pt-3 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                      {t.rolePage.coreSkills}
                    </div>
                    <div className="space-y-1">
                      {role.coreSkills.slice(0, 4).map((s, i) => (
                        <div key={i} className="text-xs text-gray-600 flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {s}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">
                      {t.rolePage.software}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {role.requiredSoftware.slice(0, 3).map((sw, i) => (
                        <Badge key={i} color="indigo" size="sm">{sw}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} size="lg" className="flex-1">{t.common.back}</Button>
        <Button onClick={handleNext} disabled={!selected} size="lg" className="flex-2 flex-1">
          {tr.nextBtn}
        </Button>
      </div>
    </div>
  );
}
