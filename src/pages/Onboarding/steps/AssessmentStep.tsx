import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import { generateSkillAssessment } from '../../../utils/mockAI';
import { ROLES } from '../../../utils/roleData';
import { Button, RadarChart, Progress } from '../../../components/UI';
import { useT } from '../../../hooks/useT';

interface Props {
  onComplete: () => void;
  onBack: () => void;
}

export function AssessmentStep({ onComplete, onBack }: Props) {
  const { userProfile, targetRole, setSkillAssessment, skillAssessment } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [done, setDone] = useState(!!skillAssessment);
  const [assessment, setAssessment] = useState(skillAssessment);
  const t = useT();
  const ta = t.onboarding.assessment;

  const role = ROLES.find((r) => r.id === targetRole);

  useEffect(() => {
    if (!assessment && targetRole) {
      setIsGenerating(true);
      const timer = setTimeout(() => {
        const result = generateSkillAssessment(userProfile, targetRole);
        setAssessment(result);
        setSkillAssessment(result);
        setIsGenerating(false);
        setDone(true);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, []);

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Sparkles size={28} className="text-indigo-600 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-2xl border-2 border-indigo-400 animate-ping opacity-30" />
        </div>
        <div className="text-lg font-semibold text-gray-800">{ta.analyzing}</div>
        <div className="text-sm text-gray-500 text-center max-w-xs">{ta.analyzingDesc}</div>
        <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
          <motion.div
            className="h-full bg-indigo-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.6, ease: 'linear' }}
          />
        </div>
      </div>
    );
  }

  if (!assessment || !done) return null;

  const avgGap = assessment.dimensions.reduce((sum, d) => sum + (d.targetLevel - d.currentLevel), 0) / assessment.dimensions.length;
  const overallPct = Math.round(
    (assessment.dimensions.reduce((sum, d) => sum + d.currentLevel, 0) /
      assessment.dimensions.reduce((sum, d) => sum + d.targetLevel, 0)) * 100
  );

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
        <div className="flex items-start gap-3">
          <Sparkles size={20} className="text-indigo-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-sm font-semibold text-indigo-700 mb-1">{ta.aiReport}</div>
            <p className="text-sm text-indigo-600 leading-relaxed">{assessment.gapSummary}</p>
          </div>
        </div>
      </div>

      {/* Radar Chart */}
      <div className="bg-white border border-gray-100 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold text-gray-700">{ta.radarTitle}</div>
          <div className="text-xs text-gray-400">{ta.compareWith.replace('{role}', role?.name ?? '')}</div>
        </div>
        <RadarChart dimensions={assessment.dimensions} size={240} />
        <div className="mt-3">
          <Progress
            value={overallPct}
            label={ta.matchRate}
            showPercent
            color={overallPct > 70 ? 'emerald' : overallPct > 40 ? 'amber' : 'red'}
          />
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <CheckCircle size={14} className="text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">{ta.strengths}</span>
          </div>
          {assessment.strengths.length > 0 ? (
            assessment.strengths.map((s, i) => (
              <div key={i} className="text-xs text-emerald-600 py-0.5">· {s}</div>
            ))
          ) : (
            <div className="text-xs text-emerald-500">—</div>
          )}
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={14} className="text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">{ta.weaknesses}</span>
          </div>
          {assessment.weaknesses.slice(0, 4).map((w, i) => (
            <div key={i} className="text-xs text-amber-600 py-0.5">· {w}</div>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="bg-gray-50 rounded-xl p-3">
        <div className="text-xs font-semibold text-gray-600 mb-2">{ta.priority}</div>
        <div className="flex flex-wrap gap-1.5">
          {assessment.priorityAreas.map((area, i) => (
            <span key={i} className="px-2.5 py-1 bg-indigo-600 text-white text-xs rounded-full font-medium">
              {area}
            </span>
          ))}
        </div>
      </div>

      {/* Gap info */}
      {avgGap > 0 && (
        <div className="text-xs text-gray-400 text-center">
          {ta.avgGap} {avgGap.toFixed(1)} · {Math.round(avgGap * 3 + 4)} {ta.suggestedWeeks}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="flex-1">{t.common.back}</Button>
        <Button onClick={onComplete} size="lg" className="flex-1 gap-2">
          {ta.nextBtn}
          <ArrowRight size={16} />
        </Button>
      </div>
    </div>
  );
}
