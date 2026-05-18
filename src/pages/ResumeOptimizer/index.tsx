import { useState } from 'react';
import { FileText, Plus, Sparkles, Copy, CheckCircle, Trash2, X } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { generateResumeItem } from '../../utils/mockAI';
import type { TargetRole } from '../../types';
import { Card, Badge, PageHeader, EmptyState, AIFeedbackBox } from '../../components/UI';
import { Button } from '../../components/UI';
import { useT } from '../../hooks/useT';

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
