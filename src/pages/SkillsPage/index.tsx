import { useNavigate } from 'react-router-dom';
import { Brain, TrendingUp, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ROLES } from '../../utils/roleData';
import { Card, Progress, Badge, PageHeader, EmptyState, RadarChart } from '../../components/UI';
import { useT } from '../../hooks/useT';

export default function SkillsPage() {
  const navigate = useNavigate();
  const { skillAssessment, targetRole } = useAppStore();
  const role = ROLES.find((r) => r.id === targetRole);
  const tl = useT();
  const ts = tl.skillsPage;
  const LEVEL_LABELS = tl.skillsPage.levels;

  if (!skillAssessment) {
    return (
      <div className="p-8">
        <PageHeader title={ts.title} subtitle={ts.radarTitle} />
        <EmptyState
          icon={Brain}
          title={ts.emptyTitle}
          description={ts.emptyDesc}
          action={{ label: ts.emptyAction, onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  const { dimensions, strengths, weaknesses, priorityAreas, gapSummary } = skillAssessment;

  const overallCurrent = dimensions.reduce((s, d) => s + d.currentLevel, 0);
  const overallTarget = dimensions.reduce((s, d) => s + d.targetLevel, 0);
  const overallPct = Math.round((overallCurrent / overallTarget) * 100);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={ts.title}
        subtitle={ts.subtitle.replace('{role}', role?.name ?? '')}
        badge={ts.badge.replace('{n}', String(overallPct))}
      />

      {/* Summary */}
      <Card className="p-5 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Brain size={18} className="text-indigo-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-1">{ts.aiReportTitle}</div>
            <p className="text-sm text-gray-600 leading-relaxed">{gapSummary}</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Radar Chart */}
        <Card className="p-5">
          <div className="font-semibold text-gray-900 text-sm mb-4">{ts.radarTitle}</div>
          <RadarChart dimensions={dimensions} size={280} />
        </Card>

        {/* Strengths & Weaknesses */}
        <div className="space-y-4">
          {/* Overall score */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={16} className="text-indigo-600" />
              <div className="font-semibold text-gray-900 text-sm">{ts.overallMatch}</div>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <div className="text-4xl font-bold text-indigo-600">{overallPct}</div>
              <div className="text-xl text-gray-400 mb-1">%</div>
            </div>
            <Progress
              value={overallPct}
              color={overallPct >= 70 ? 'emerald' : overallPct >= 40 ? 'indigo' : 'amber'}
              size="lg"
            />
            <div className="text-xs text-gray-400 mt-2">
              {overallPct >= 70 ? ts.matchHint.high : overallPct >= 40 ? ts.matchHint.mid : ts.matchHint.low}
            </div>
          </Card>

          {/* Strengths */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle size={16} className="text-emerald-600" />
              <div className="font-semibold text-gray-900 text-sm">{ts.strengths}</div>
            </div>
            {strengths.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {strengths.map((s, i) => (
                  <Badge key={i} color="emerald">{s}</Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">{ts.keepGoing}</div>
            )}
          </Card>

          {/* Priority */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-600" />
              <div className="font-semibold text-gray-900 text-sm">{ts.priority}</div>
            </div>
            {priorityAreas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {priorityAreas.map((area, i) => (
                  <Badge key={i} color="amber">{area}</Badge>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-400">{ts.noBias}</div>
            )}
          </Card>
        </div>
      </div>

      {/* Detailed dimensions */}
      <Card className="p-5 mb-6">
        <div className="font-semibold text-gray-900 text-sm mb-4">{ts.dimensions}</div>
        <div className="space-y-4">
          {dimensions.map((dim) => {
            const gap = dim.targetLevel - dim.currentLevel;
            const pct = Math.round((dim.currentLevel / dim.targetLevel) * 100);

            return (
              <div key={dim.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{dim.name}</span>
                    {gap <= 0 ? (
                      <Badge color="emerald" size="sm">{ts.reachTarget}</Badge>
                    ) : gap === 1 ? (
                      <Badge color="amber" size="sm">{ts.close}</Badge>
                    ) : (
                      <Badge color="red" size="sm">{ts.gap.replace('{n}', String(gap))}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {LEVEL_LABELS[dim.currentLevel]} / {LEVEL_LABELS[dim.targetLevel]}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={dim.currentLevel}
                    max={5}
                    color={gap <= 0 ? 'emerald' : gap === 1 ? 'amber' : 'red'}
                    size="md"
                  />
                  <div className="flex gap-0.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <div
                        key={l}
                        className={`w-5 h-2 rounded-sm ${
                          l <= dim.targetLevel ? 'bg-indigo-200' : 'bg-gray-100'
                        } ${l <= dim.currentLevel ? 'opacity-100' : 'opacity-30'}`}
                      />
                    ))}
                  </div>
                  <div className="text-xs font-bold text-gray-700 w-8 text-right shrink-0">{pct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Weaknesses */}
      {weaknesses.length > 0 && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="font-semibold text-gray-900 text-sm">{ts.weaknesses}</div>
            <button
              onClick={() => navigate('/learning-path')}
              className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
            >
              {ts.viewPlan} <ArrowRight size={12} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {weaknesses.map((w, i) => (
              <div key={i} className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                <AlertTriangle size={14} className="text-red-400 shrink-0" />
                <span className="text-sm text-red-700">{w}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
