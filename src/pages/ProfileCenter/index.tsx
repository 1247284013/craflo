import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Brain, Wrench, FolderOpen, MessageSquare, Tag,
  TrendingUp, AlertTriangle, CheckCircle, ArrowRight, User,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ROLES } from '../../utils/roleData';
import { Card, Badge, Progress, EmptyState, RadarChart } from '../../components/UI';
import { useT } from '../../hooks/useT';

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  bg:      '#f5f6fa',
  surface: '#ffffff',
  border:  'rgba(0,0,0,0.07)',
  text:    '#111827',
  textSec: '#6b7280',
  muted:   '#9ca3af',
  accent:  '#6366f1',
};

type TabId = 'role' | 'skills';

export default function ProfileCenter() {
  const navigate = useNavigate();
  const { targetRole, skillAssessment, userProfile } = useAppStore();
  const role = ROLES.find((r) => r.id === targetRole);
  const t = useT();
  const tr = t.rolePage;
  const ts = t.skillsPage;

  const [activeTab, setActiveTab] = useState<TabId>('role');

  const LEVEL_LABELS = ts.levels;

  // Skill stats
  const dimensions = skillAssessment?.dimensions ?? [];
  const overallCurrent = dimensions.reduce((s, d) => s + d.currentLevel, 0);
  const overallTarget = dimensions.reduce((s, d) => s + d.targetLevel, 0);
  const overallPct = overallTarget > 0 ? Math.round((overallCurrent / overallTarget) * 100) : 0;

  const tabs: { id: TabId; label: string; icon: typeof Target }[] = [
    { id: 'role',   label: tr.title,  icon: Target },
    { id: 'skills', label: ts.title,  icon: Brain  },
  ];

  return (
    <div style={{ minHeight: '100%', background: T.bg }}>
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: '28px 40px 0',
      }}>
        {/* User identity row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={26} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: T.text }}>
              个人中心
            </div>
            <div style={{ fontSize: 13, color: T.textSec, marginTop: 3 }}>
              {userProfile.major || 'Design Engineering'} ·{' '}
              {role
                ? <span style={{ color: T.accent, fontWeight: 500 }}>{role.name}</span>
                : <span style={{ color: T.muted }}>尚未设定目标岗位</span>
              }
              {skillAssessment && (
                <span style={{ color: T.muted }}> · 能力匹配 {overallPct}%</span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px',
                  fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? T.accent : T.textSec,
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: `2px solid ${isActive ? T.accent : 'transparent'}`,
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '32px 40px', maxWidth: 960, margin: '0 auto' }}>

        {/* ── 目标岗位 Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'role' && (
          !role ? (
            <div className="p-0">
              <EmptyState
                icon={Target}
                title={tr.emptyTitle}
                description={tr.emptyDesc}
                action={{ label: tr.emptyAction, onClick: () => navigate('/') }}
              />
            </div>
          ) : (
            <>
              {/* Role hero */}
              <Card className="p-6 mb-6 border-0" style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#fff',
              }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                      {tr.targetRoleLabel}
                    </div>
                    <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{role.name}</h2>
                    <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.7, maxWidth: 520 }}>{role.description}</p>
                  </div>
                  <div style={{
                    width: 52, height: 52, background: 'rgba(255,255,255,0.2)',
                    borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Target size={26} color="#fff" />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                  {role.suitableFor.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ padding: '3px 12px', background: 'rgba(255,255,255,0.18)', borderRadius: 20, fontSize: 12 }}>
                      {s}
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-5 mb-5">
                {/* Core skills */}
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Wrench size={15} className="text-indigo-600" />
                    <div className="font-semibold text-gray-900 text-sm">{tr.coreSkills}</div>
                  </div>
                  <div className="space-y-2">
                    {role.coreSkills.map((skill, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span className="text-sm text-gray-700">{skill}</span>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Software & Keywords */}
                <div className="space-y-4">
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Wrench size={15} className="text-emerald-600" />
                      <div className="font-semibold text-gray-900 text-sm">{tr.software}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.requiredSoftware.map((sw, i) => <Badge key={i} color="emerald">{sw}</Badge>)}
                    </div>
                  </Card>
                  <Card className="p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag size={15} className="text-indigo-600" />
                      <div className="font-semibold text-gray-900 text-sm">{tr.keywords}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {role.resumeKeywords.map((kw, i) => <Badge key={i} color="indigo" size="sm">{kw}</Badge>)}
                    </div>
                  </Card>
                </div>
              </div>

              {/* Typical work */}
              <Card className="p-5 mb-5">
                <div className="font-semibold text-gray-900 text-sm mb-4">{tr.typicalWork}</div>
                <div className="grid grid-cols-2 gap-2">
                  {role.typicalWork.map((work, i) => (
                    <div key={i} className="flex items-start gap-2 p-2">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700">{work}</span>
                    </div>
                  ))}
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-5 mb-5">
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen size={15} className="text-amber-600" />
                    <div className="font-semibold text-gray-900 text-sm">{tr.portfolioReq}</div>
                  </div>
                  <div className="space-y-1.5">
                    {role.portfolioRequirements.map((req, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        {req}
                      </div>
                    ))}
                  </div>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <FolderOpen size={15} className="text-purple-600" />
                    <div className="font-semibold text-gray-900 text-sm">{tr.commonProjects}</div>
                  </div>
                  <div className="space-y-1.5">
                    {role.commonProjects.map((proj, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                        {proj}
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Interview questions */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={15} className="text-indigo-600" />
                    <div className="font-semibold text-gray-900 text-sm">{tr.interviewQuestions}</div>
                  </div>
                  <button
                    onClick={() => navigate('/interview')}
                    className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    {tr.practiceBtn} <ArrowRight size={12} />
                  </button>
                </div>
                <div className="space-y-2">
                  {role.interviewQuestions.map((q, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 mt-0.5">Q</div>
                      <span className="text-sm text-gray-700">{q}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )
        )}

        {/* ── 能力画像 Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'skills' && (
          !skillAssessment ? (
            <EmptyState
              icon={Brain}
              title={ts.emptyTitle}
              description={ts.emptyDesc}
              action={{ label: ts.emptyAction, onClick: () => navigate('/') }}
            />
          ) : (
            <>
              {/* AI summary */}
              <Card className="p-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                    <Brain size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 mb-1">{ts.aiReportTitle}</div>
                    <p className="text-sm text-gray-600 leading-relaxed">{skillAssessment.gapSummary}</p>
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Radar Chart */}
                <Card className="p-5">
                  <div className="font-semibold text-gray-900 text-sm mb-4">{ts.radarTitle}</div>
                  <RadarChart dimensions={dimensions} size={280} />
                </Card>

                {/* Stats */}
                <div className="space-y-4">
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

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle size={16} className="text-emerald-600" />
                      <div className="font-semibold text-gray-900 text-sm">{ts.strengths}</div>
                    </div>
                    {skillAssessment.strengths.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {skillAssessment.strengths.map((s, i) => <Badge key={i} color="emerald">{s}</Badge>)}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">{ts.keepGoing}</div>
                    )}
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={16} className="text-amber-600" />
                      <div className="font-semibold text-gray-900 text-sm">{ts.priority}</div>
                    </div>
                    {skillAssessment.priorityAreas.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {skillAssessment.priorityAreas.map((area, i) => <Badge key={i} color="amber">{area}</Badge>)}
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
                                className={`w-5 h-2 rounded-sm ${l <= dim.targetLevel ? 'bg-indigo-200' : 'bg-gray-100'} ${l <= dim.currentLevel ? 'opacity-100' : 'opacity-30'}`}
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
              {skillAssessment.weaknesses.length > 0 && (
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
                    {skillAssessment.weaknesses.map((w, i) => (
                      <div key={i} className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl">
                        <AlertTriangle size={14} className="text-red-400 shrink-0" />
                        <span className="text-sm text-red-700">{w}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
