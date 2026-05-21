import { useState } from 'react';
import { FileText, Plus, Sparkles, Copy, CheckCircle, Trash2, X, Briefcase, BarChart2, Target, Lightbulb, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { generateResumeItem } from '../../utils/mockAI';
import type { TargetRole } from '../../types';
import { Card, Badge, PageHeader, EmptyState, AIFeedbackBox } from '../../components/UI';
import { Button } from '../../components/UI';
import { useT } from '../../hooks/useT';
import { JDUploadDrawer } from '../../components/JDUploadDrawer';
import { analyzeJDGap } from '../../lib/agentAPI';
import type { ParsedJDResponse, GapAnalysis } from '../../lib/agentAPI';

function AddResumeModal({ onClose }: { onClose: () => void }) {
  const { projects, targetRole, addResumeItem } = useAppStore();
  const [tab, setTab] = useState<'project' | 'manual'>('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [manualOriginal, setManualOriginal] = useState('');
  const [manualName, setManualName] = useState('');
  const tl = useT();
  const tr = tl.resume;

  const handleGenerateFromProject = () => {
    if (!selectedProjectId || !targetRole) return;
    const project = projects.find((p) => p.id === selectedProjectId);
    if (!project) return;
    setIsGenerating(true);
    setTimeout(() => {
      const item = generateResumeItem(project, targetRole as TargetRole);
      addResumeItem(item);
      setIsGenerating(false);
      onClose();
    }, 2000);
  };

  const handleManualGenerate = () => {
    if (!manualOriginal || !targetRole) return;
    setIsGenerating(true);
    const fakeProject = {
      id: 'manual',
      name: manualName || tl.common.projectExperience,
      background: '',
      designGoal: '',
      personalContribution: manualOriginal,
      mainChallenge: '',
      solutionComparison: '',
      materialChoice: '',
      manufacturingConsideration: '',
      hasPrototypeTesting: false,
      improvementIdeas: '',
      materials: [],
      aiFeedback: '',
      missingElements: [],
      completionRate: 50,
    };
    setTimeout(() => {
      const item = generateResumeItem(fakeProject as any, targetRole as TargetRole);
      addResumeItem({ ...item, originalDescription: manualOriginal });
      setIsGenerating(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="font-bold text-gray-900">{tr.modalTitle}</div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'project' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
            onClick={() => setTab('project')}
          >
            {tr.tabFromProject}
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === 'manual' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
            onClick={() => setTab('manual')}
          >
            {tr.tabManual}
          </button>
        </div>

        <div className="p-6">
          {tab === 'project' ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-500 mb-3">{tr.selectProjectHint}</div>
              {projects.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">{tr.noProjectHint}</div>
              ) : (
                projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedProjectId(p.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      selectedProjectId === p.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-200'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-800">{p.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{p.completionRate}% · {p.materials.length}</div>
                  </button>
                ))
              )}
              <Button
                onClick={handleGenerateFromProject}
                loading={isGenerating}
                disabled={!selectedProjectId}
                className="w-full mt-2"
              >
                <Sparkles size={14} />
                {isGenerating ? tr.generatingBtn : tr.generateBtn}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{tr.manualNameLabel}</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder={tr.manualNamePlaceholder}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{tr.manualOriginalLabel}</label>
                <textarea
                  rows={4}
                  value={manualOriginal}
                  onChange={(e) => setManualOriginal(e.target.value)}
                  placeholder={tr.manualOriginalPlaceholder}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
              <Button
                onClick={handleManualGenerate}
                loading={isGenerating}
                disabled={!manualOriginal}
                className="w-full"
              >
                <Sparkles size={14} />
                {isGenerating ? tr.generatingBtn : tr.optimizeBtn}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JD Analysis Banner — "投递此岗位" section at the top
// ─────────────────────────────────────────────────────────────────────────────
function JDAnalysisBanner() {
  const { appliedJD, setAppliedJD, projects, skillAssessment } = useAppStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [gap, setGap] = useState<GapAnalysis | null>(appliedJD?.gapAnalysis ? {
    gapAnalysis: appliedJD.gapAnalysis,
    emphasize: appliedJD.emphasize ?? [],
    interviewFocus: appliedJD.interviewFocus ?? [],
    fitScore: 0,
  } : null);

  const handleParsed = async (raw: string, parsed: ParsedJDResponse, source: 'text' | 'image') => {
    const jd = { raw, parsed, source, savedAt: new Date().toISOString() };
    setAppliedJD(jd);
    setAnalyzing(true);
    try {
      const userSkills = [
        ...(skillAssessment?.strengths ?? []),
        ...(skillAssessment?.priorityAreas ?? []),
      ];
      const projectSummaries = projects.map(p => `${p.name}: ${p.background?.slice(0, 80) ?? ''}`);
      const analysis = await analyzeJDGap(parsed, userSkills, projectSummaries);
      setGap(analysis);
      setAppliedJD({ ...jd, gapAnalysis: analysis.gapAnalysis, emphasize: analysis.emphasize, interviewFocus: analysis.interviewFocus });
    } catch {
      // gap analysis is optional — don't block if it fails
    }
    setAnalyzing(false);
  };

  return (
    <div style={{ marginBottom: 24 }}>
      {!appliedJD ? (
        /* Empty state */
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            width: '100%', textAlign: 'left', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '16px 20px', borderRadius: 16,
            border: '2px dashed rgba(99,102,241,0.3)',
            background: 'rgba(99,102,241,0.03)', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.5)'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.03)'; }}
        >
          <div style={{ width: 44, height: 44, borderRadius: 13, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Briefcase size={20} color="#6366f1" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>投递此岗位</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>上传目标 JD，AI 分析技能 gap，优化简历重点和面试准备方向</div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 12px', flexShrink: 0 }}>
            上传 JD →
          </div>
        </button>
      ) : (
        /* Has JD — show summary + analysis */
        <div style={{ border: '1.5px solid rgba(99,102,241,0.2)', borderRadius: 16, overflow: 'hidden', background: '#fff' }}>
          {/* JD header bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'rgba(99,102,241,0.04)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Briefcase size={16} color="#6366f1" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {appliedJD.parsed.title}{appliedJD.parsed.company ? ` · ${appliedJD.parsed.company}` : ''}
              </div>
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>
                {appliedJD.parsed.summary ?? '已解析目标岗位'}
              </div>
            </div>
            <button
              onClick={() => setDrawerOpen(true)}
              style={{ fontSize: 12, fontWeight: 600, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', flexShrink: 0 }}
            >
              更换
            </button>
          </div>

          {/* Analysis results */}
          {analyzing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px', color: '#6b7280', fontSize: 13 }}>
              <Loader2 size={16} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
              AI 正在分析技能 gap…
            </div>
          ) : gap ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0 }}>
              <AnalysisSection icon={<BarChart2 size={14} color="#ef4444" />} title="技能 Gap" items={gap.gapAnalysis} color="#ef4444" bg="rgba(239,68,68,0.04)" />
              <AnalysisSection icon={<Target size={14} color="#6366f1" />} title="简历侧重点" items={gap.emphasize} color="#6366f1" bg="rgba(99,102,241,0.04)" />
              <AnalysisSection icon={<Lightbulb size={14} color="#f59e0b" />} title="面试准备方向" items={gap.interviewFocus} color="#f59e0b" bg="rgba(245,158,11,0.04)" />
            </div>
          ) : null}
        </div>
      )}

      <JDUploadDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onParsed={handleParsed}
        title="投递此岗位"
        subtitle="上传目标 JD，AI 分析技能 gap，给出简历优化建议"
      />
    </div>
  );
}

function AnalysisSection({ icon, title, items, color, bg }: {
  icon: React.ReactNode; title: string; items: string[]; color: string; bg: string;
}) {
  if (!items.length) return null;
  return (
    <div style={{ padding: '12px 16px', borderRight: '1px solid rgba(0,0,0,0.06)', background: bg }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {items.slice(0, 3).map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 6 }} />
            <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResumeOptimizer() {
  const { resumeItems, deleteResumeItem } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const tl = useT();
  const tr = tl.resume;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={tr.title}
        subtitle={tr.subtitle}
        badge={tr.badge.replace('{n}', String(resumeItems.length))}
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} />
            {tr.addBtn}
          </Button>
        }
      />

      {/* ── JD Analysis Banner ── */}
      <JDAnalysisBanner />

      {/* Tip */}
      <AIFeedbackBox
        feedback={tr.principleText}
        type="info"
        title={tr.principle}
      />

      <div className="mt-6">
        {resumeItems.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={tr.emptyTitle}
            description={tr.emptyDesc}
            action={{ label: tr.emptyAction, onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="space-y-4">
            {resumeItems.map((item) => {
              const isExpanded = expandedId === item.id;
              const allBullets = item.bulletPoints.join('\n· ');
              const copyText = `${item.optimizedTitle}\n${item.oneLiner}\n\n· ${allBullets}`;

              return (
                <Card key={item.id} className="overflow-hidden">
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="font-bold text-gray-900 mb-1">{item.projectName}</div>
                        <div className="text-sm font-semibold text-indigo-600">{item.optimizedTitle}</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <button
                          onClick={() => handleCopy(copyText, item.id)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                          title={tl.common.copy}
                        >
                          {copiedId === item.id ? (
                            <CheckCircle size={16} className="text-emerald-500" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => deleteResumeItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Before/After comparison */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                        <div className="text-xs font-semibold text-red-500 mb-2">{tr.before}</div>
                        <p className="text-sm text-gray-600 leading-relaxed">{item.originalDescription}</p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                        <div className="text-xs font-semibold text-emerald-600 mb-2">{tr.after}</div>
                        <p className="text-sm text-gray-700 leading-relaxed">{item.oneLiner}</p>
                      </div>
                    </div>

                    {/* Bullet points */}
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{tr.bullets}</div>
                      {item.bulletPoints.map((bp, i) => (
                        <div key={i} className="flex items-start gap-2 mb-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          <span className="text-sm text-gray-700">{bp}</span>
                        </div>
                      ))}
                    </div>

                    {/* Keywords */}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {item.keywords.map((kw, i) => (
                        <Badge key={i} color="indigo" size="sm">{kw}</Badge>
                      ))}
                    </div>

                    {/* Expand button */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-xs text-indigo-600 font-medium hover:underline"
                    >
                      {isExpanded ? tr.collapsePoints : tr.expandPoints}
                    </button>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 bg-gray-50">
                      <div className="pt-4 grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{tr.quantifiableResults}</div>
                          {item.quantifiableResults.map((r, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-600 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                              {r}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{tr.interviewPoints}</div>
                          {item.interviewExpandPoints.map((p, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm text-gray-600 mb-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                              {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <AddResumeModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
