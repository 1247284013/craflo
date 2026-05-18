import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  Circle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Target,
  Award,
  Clock,
  ArrowRight,
  Sparkles,
  X,
  Send,
  Loader2,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Card, Badge, Progress, PageHeader, EmptyState } from '../../components/UI';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../hooks/useT';
import type { WeeklyTask } from '../../types';
import { adjustLearningPath } from '../../lib/agentAPI';

// ── AI 调整状态 ─────────────────────────────────────────────────────────────
type AdjustStatus = 'idle' | 'thinking' | 'preview' | 'done';

interface AdjustedTask extends WeeklyTask {
  _modified?: boolean;
  _autoCompleted?: boolean;
}

export default function LearningPathPage() {
  const navigate = useNavigate();
  const { learningPath, currentWeek, completeWeekTask, setCurrentWeek, updateWeeklyTasks } = useAppStore();
  const [expandedWeek, setExpandedWeek] = useState<number | null>(currentWeek);
  const tl = useT();
  const tpath = tl.learningPath;

  // AI 调整面板状态
  const [panelOpen, setPanelOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [adjustStatus, setAdjustStatus] = useState<AdjustStatus>('idle');
  const [previewTasks, setPreviewTasks] = useState<AdjustedTask[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleAIAdjust = async () => {
    if (!inputValue.trim() || !learningPath) return;
    setAdjustStatus('thinking');
    setErrorMsg('');
    try {
      const adjusted = await adjustLearningPath<WeeklyTask>(learningPath.weeklyTasks, inputValue);
      // Mark which tasks changed
      const withFlags: AdjustedTask[] = adjusted.map((t, i) => {
        const orig = learningPath.weeklyTasks[i];
        const modified =
          t.completed !== orig?.completed ||
          t.learningContent?.join() !== orig?.learningContent?.join() ||
          t.practicalTasks?.join() !== orig?.practicalTasks?.join();
        return { ...t, _modified: modified, _autoCompleted: t.completed && !orig?.completed };
      });
      setPreviewTasks(withFlags);
      setAdjustStatus('preview');
    } catch {
      setErrorMsg('AI 调整失败，请检查后端服务是否运行');
      setAdjustStatus('idle');
    }
  };

  const handleApply = () => {
    if (!previewTasks) return;
    const cleanTasks: WeeklyTask[] = previewTasks.map(({ _modified: _m, _autoCompleted: _a, ...t }) => t);
    updateWeeklyTasks(cleanTasks);
    setAdjustStatus('done');
    setTimeout(() => { setPanelOpen(false); setAdjustStatus('idle'); setPreviewTasks(null); setInputValue(''); }, 1500);
  };

  if (!learningPath) {
    return (
      <div className="p-8">
        <PageHeader title={tpath.title} subtitle={tpath.emptyTitle} />
        <EmptyState
          icon={BookOpen}
          title={tpath.emptyTitle}
          description={tpath.emptyDesc}
          action={{ label: tpath.emptyAction, onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  const { totalWeeks, phases, weeklyTasks, recommendedProject, summary } = learningPath;
  const completedCount = weeklyTasks.filter((t) => t.completed).length;
  const progress = Math.round((completedCount / totalWeeks) * 100);

  return (
    <div className="p-8 max-w-5xl mx-auto" style={{ position: 'relative' }}>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{tpath.title}</h1>
          <p className="text-sm text-gray-500">{tpath.subtitle.replace('{n}', String(totalWeeks))}</p>
          <span className="inline-block mt-1 text-xs text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-0.5 font-medium">
            {tpath.badge.replace('{done}', String(completedCount)).replace('{total}', String(totalWeeks))}
          </span>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            flexShrink: 0,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(99,102,241,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)')}
        >
          <Sparkles size={15} />
          AI 调整路径
        </button>
      </div>

      {/* Summary card */}
      <Card className="p-5 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
            <Target size={20} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900 mb-1">{tpath.summary}</div>
            <p className="text-sm text-gray-600 leading-relaxed">{summary}</p>
          </div>
        </div>
        <div className="mt-4">
          <Progress value={progress} showPercent color="indigo" size="md" />
        </div>
      </Card>

      {/* Phases */}
      <div className="mb-6">
        <div className="text-sm font-semibold text-gray-700 mb-3">{tpath.phases}</div>
        <div className="grid grid-cols-4 gap-3">
          {phases.map((phase, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-emerald-500' : i === 2 ? 'bg-amber-500' : 'bg-purple-500'
                }`}>
                  {i + 1}
                </div>
                <div className="text-xs text-gray-400">{phase.weeks}</div>
              </div>
              <div className="text-sm font-semibold text-gray-800 mb-1">{phase.title}</div>
              <div className="text-xs text-gray-500">{phase.description}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Recommended project */}
      <Card className="p-5 mb-6 border-2 border-indigo-100 bg-indigo-50/30">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
              <Award size={18} className="text-indigo-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-indigo-500 uppercase tracking-wider mb-0.5">{tpath.recommendedProject}</div>
              <div className="font-bold text-gray-900 mb-1">{recommendedProject.name}</div>
              <div className="text-sm text-gray-600">{recommendedProject.background}</div>
              <div className="flex items-center gap-2 mt-2">
                <Badge color="indigo">{tpath.difficulty[recommendedProject.difficulty as keyof typeof tpath.difficulty]}</Badge>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Clock size={12} />
                  <span>{tpath.aboutWeeks.replace('{n}', String(recommendedProject.estimatedWeeks))}</span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/project')}
            className="shrink-0 flex items-center gap-1 text-xs text-indigo-600 font-medium px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
          >
            {tpath.startProject} <ArrowRight size={12} />
          </button>
        </div>
      </Card>

      {/* Weekly tasks */}
      <div>
        <div className="text-sm font-semibold text-gray-700 mb-3">{tpath.weeklyTasks}</div>
        <div className="space-y-2">
          {weeklyTasks.map((task) => {
            const isExpanded = expandedWeek === task.week;
            const isCurrent = task.week === currentWeek;

            return (
              <motion.div
                key={task.week}
                layout
                className={`rounded-xl border-2 overflow-hidden ${
                  task.completed
                    ? 'border-emerald-200 bg-emerald-50/30'
                    : isCurrent
                    ? 'border-indigo-300'
                    : 'border-gray-200'
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setExpandedWeek(isExpanded ? null : task.week);
                    setCurrentWeek(task.week);
                  }}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="shrink-0">
                      {task.completed ? (
                        <CheckCircle size={20} className="text-emerald-500" />
                      ) : isCurrent ? (
                        <div className="w-5 h-5 rounded-full border-2 border-indigo-500 bg-indigo-50 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        </div>
                      ) : (
                        <Circle size={20} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{tl.common.week} {task.week}</span>
                        {isCurrent && <Badge color="indigo" size="sm">{tl.common.current}</Badge>}
                        {task.completed && <Badge color="emerald" size="sm">{tl.common.done}</Badge>}
                      </div>
                      <div className="font-medium text-gray-800 text-sm">{task.title}</div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-gray-400 shrink-0" />
                    ) : (
                      <ChevronDown size={16} className="text-gray-400 shrink-0" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 bg-white">
                    <div className="pt-3 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{tpath.objective}</div>
                        <p className="text-sm text-gray-700 mb-3">{task.objective}</p>

                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{tpath.content}</div>
                        {task.learningContent.map((c, i) => (
                          <div key={i} className="text-sm text-gray-600 flex items-start gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            {c}
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{tpath.tasks}</div>
                        {task.practicalTasks.map((t, i) => (
                          <div key={i} className="text-sm text-gray-600 flex items-start gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            {t}
                          </div>
                        ))}

                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 mt-3">{tpath.deliverables}</div>
                        {task.deliverables.map((d, i) => (
                          <div key={i} className="text-xs text-gray-500 flex items-center gap-1.5 mb-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            {d}
                          </div>
                        ))}

                        {!task.completed && (
                          <button
                            onClick={() => completeWeekTask(task.week)}
                            className="mt-3 w-full py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
                          >
                            {tpath.markDone}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── AI 调整侧边面板 ─────────────────────────────────────────── */}
      <AnimatePresence>
        {panelOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (adjustStatus !== 'thinking') setPanelOpen(false); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
            />
            {/* 面板 */}
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: 480,
                background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.08)',
                zIndex: 70, display: 'flex', flexDirection: 'column',
              }}
            >
              {/* 面板头部 */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={15} color="#6366f1" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>AI 学习路径调整</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>告诉 AI 你已经掌握了什么</div>
                  </div>
                </div>
                <button onClick={() => { if (adjustStatus !== 'thinking') setPanelOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex' }}>
                  <X size={18} />
                </button>
              </div>

              {/* 面板内容 */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {adjustStatus === 'idle' && (
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.8 }}>
                    <p style={{ marginBottom: 16 }}>例如你可以说：</p>
                    {[
                      '"我已经熟练使用 SolidWorks，零件建模和装配都没问题"',
                      '"DFM 基础我已经学过了，脱模方向和壁厚都了解"',
                      '"工程图出图我完全会，公差标注也没问题"',
                    ].map((s, i) => (
                      <button key={i} onClick={() => setInputValue(s.replace(/"/g, ''))}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px', marginBottom: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6, transition: 'all 0.15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.4)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.8)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
                      >{s}</button>
                    ))}
                  </div>
                )}

                {adjustStatus === 'thinking' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 16 }}>
                    <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>AI 正在分析你的学习路径…</div>
                  </div>
                )}

                {adjustStatus === 'preview' && previewTasks && (
                  <div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ color: '#10b981' }}>●</span> 绿色 = 已标记完成 &nbsp;
                      <span style={{ color: '#f59e0b' }}>●</span> 黄色 = 内容已调整
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {previewTasks.map(t => (
                        <div key={t.week} style={{
                          background: t._autoCompleted ? 'rgba(16,185,129,0.08)' : t._modified ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${t._autoCompleted ? 'rgba(16,185,129,0.3)' : t._modified ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
                          borderRadius: 10, padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>第 {t.week} 周</span>
                            {t._autoCompleted && <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.15)', borderRadius: 6, padding: '1px 7px', fontWeight: 700 }}>自动完成</span>}
                            {t._modified && !t._autoCompleted && <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', borderRadius: 6, padding: '1px 7px', fontWeight: 700 }}>已调整</span>}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 6 }}>{t.title}</div>
                          {t._modified && !t._autoCompleted && (
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                              {t.learningContent.length} 条学习内容 · {t.practicalTasks.length} 个实践任务
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {adjustStatus === 'done' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 200, gap: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={22} color="#10b981" />
                    </div>
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>学习路径已更新！</div>
                  </div>
                )}

                {errorMsg && (
                  <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#ef4444' }}>
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* 底部输入区 */}
              {(adjustStatus === 'idle' || adjustStatus === 'preview') && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {adjustStatus === 'preview' ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setAdjustStatus('idle'); setPreviewTasks(null); }}
                        style={{ flex: 1, padding: '10px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>
                        重新描述
                      </button>
                      <button onClick={handleApply}
                        style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Check size={14} /> 应用修改
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 14px' }}>
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAIAdjust(); } }}
                        placeholder="描述你已经掌握的内容，AI 会自动调整任务…"
                        rows={2}
                        style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 13, resize: 'none', fontFamily: 'inherit', lineHeight: 1.6 }}
                      />
                      <button onClick={handleAIAdjust} disabled={!inputValue.trim()}
                        style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: inputValue.trim() ? '#6366f1' : 'rgba(255,255,255,0.08)', cursor: inputValue.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Send size={13} color={inputValue.trim() ? '#fff' : 'rgba(255,255,255,0.3)'} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
