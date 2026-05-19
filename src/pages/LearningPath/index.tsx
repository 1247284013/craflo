import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Circle, ChevronDown, ChevronUp,
  BookOpen, Target, Award, Clock, ArrowRight,
  Sparkles, X, Send, Loader2, Check,
  BookMarked, Wrench, Package,
  TrendingUp,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Card, Progress, PageHeader, EmptyState, Badge } from '../../components/UI';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../hooks/useT';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import type { WeeklyTask, LearningPhase } from '../../types';
import { adjustLearningPath } from '../../lib/agentAPI';

// ── Types ────────────────────────────────────────────────────────────────────
type AdjustStatus = 'idle' | 'thinking' | 'preview' | 'done';
interface AdjustedTask extends WeeklyTask { _modified?: boolean; _autoCompleted?: boolean; }

// ── Phase color palette ───────────────────────────────────────────────────────
const PHASE_PALETTE = [
  { accent: '#6366f1', light: 'rgba(99,102,241,0.08)',  border: 'rgba(99,102,241,0.2)',  dot: '#6366f1' },
  { accent: '#10b981', light: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.2)',  dot: '#10b981' },
  { accent: '#f59e0b', light: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  dot: '#f59e0b' },
  { accent: '#8b5cf6', light: 'rgba(139,92,246,0.08)',  border: 'rgba(139,92,246,0.2)',  dot: '#8b5cf6' },
];

// ── Parse "第1-4周" / "5-8周" → [start, end] ─────────────────────────────────
function parsePhaseWeekRange(weeksStr: string): [number, number] {
  const m = weeksStr.match(/(\d+)[^\d]+(\d+)/);
  if (m) return [parseInt(m[1]), parseInt(m[2])];
  const s = weeksStr.match(/(\d+)/);
  return s ? [parseInt(s[1]), parseInt(s[1])] : [0, 0];
}

// ── Week status helpers ───────────────────────────────────────────────────────
type TaskStatus = 'done' | 'active' | 'upcoming';
function taskStatus(task: WeeklyTask, currentWeek: number): TaskStatus {
  if (task.completed) return 'done';
  if (task.week === currentWeek) return 'active';
  return 'upcoming';
}

// ─────────────────────────────────────────────────────────────────────────────
// WeekCard component
// ─────────────────────────────────────────────────────────────────────────────
function WeekCard({
  task, currentWeek, phaseIdx, selected, onSelect,
}: {
  task: WeeklyTask;
  currentWeek: number;
  phaseIdx: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const status = taskStatus(task, currentWeek);
  const pal = PHASE_PALETTE[phaseIdx];

  const statusStyles: Record<TaskStatus, React.CSSProperties> = {
    done:     { background: 'rgba(16,185,129,0.06)', border: '1.5px solid rgba(16,185,129,0.25)' },
    active:   { background: `${pal.light}`, border: `1.5px solid ${pal.border}` },
    upcoming: { background: '#ffffff', border: '1.5px solid rgba(0,0,0,0.07)' },
  };

  return (
    <motion.button
      layout
      whileHover={{ y: -2, boxShadow: '0 6px 20px rgba(0,0,0,0.10)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      style={{
        ...statusStyles[status],
        borderRadius: 14,
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        boxShadow: selected
          ? `0 0 0 2px ${pal.accent}`
          : '0 1px 4px rgba(0,0,0,0.06)',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      {/* Top row: week badge + status icon */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: status === 'done' ? 'rgba(16,185,129,0.12)' : `${pal.light}`,
          color: status === 'done' ? '#10b981' : pal.accent,
          border: `1px solid ${status === 'done' ? 'rgba(16,185,129,0.25)' : pal.border}`,
          borderRadius: 8, padding: '2px 9px',
          letterSpacing: '0.03em',
        }}>
          W{task.week}
        </span>
        <div style={{ flexShrink: 0 }}>
          {status === 'done' ? (
            <CheckCircle size={17} color="#10b981" />
          ) : status === 'active' ? (
            <div style={{
              width: 17, height: 17, borderRadius: '50%',
              border: `2px solid ${pal.accent}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: pal.accent }} />
            </div>
          ) : (
            <Circle size={17} color="rgba(0,0,0,0.18)" />
          )}
        </div>
      </div>

      {/* Title */}
      <div style={{
        fontSize: 13, fontWeight: 600,
        color: status === 'upcoming' ? '#6b7280' : '#111827',
        lineHeight: 1.45,
      }}>
        {task.title}
      </div>

      {/* Objective preview */}
      <div style={{
        fontSize: 11, color: '#9ca3af', lineHeight: 1.5,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {task.objective}
      </div>

      {/* Footer stats */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
        <StatChip icon={<BookMarked size={10} />} count={task.learningContent.length} color={pal.accent} label="知识" />
        <StatChip icon={<Wrench size={10} />} count={task.practicalTasks.length} color="#10b981" label="实践" />
        <StatChip icon={<Package size={10} />} count={task.deliverables.length} color="#f59e0b" label="交付" />
      </div>
    </motion.button>
  );
}

function StatChip({ icon, count, color, label }: {
  icon: React.ReactNode; count: number; color: string; label: string;
}) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 10, color,
      background: `${color}12`,
      border: `1px solid ${color}28`,
      borderRadius: 6, padding: '2px 7px', fontWeight: 600,
    }}>
      {icon}{count} {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TaskDetailPanel — right drawer
// ─────────────────────────────────────────────────────────────────────────────
function TaskDetailPanel({
  task, phaseIdx, onClose, onComplete,
}: {
  task: WeeklyTask;
  phaseIdx: number;
  onClose: () => void;
  onComplete: () => void;
}) {
  const pal = PHASE_PALETTE[phaseIdx];
  const status = task.completed;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 420, background: '#fff',
        borderLeft: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', flexDirection: 'column',
        zIndex: 55, boxShadow: '-8px 0 40px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            background: pal.light, color: pal.accent,
            border: `1px solid ${pal.border}`,
            borderRadius: 8, padding: '3px 10px',
          }}>
            第 {task.week} 周
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', lineHeight: 1.4 }}>{task.title}</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6, lineHeight: 1.6 }}>{task.objective}</div>
        {status && (
          <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '3px 10px' }}>
            <CheckCircle size={12} /> 已完成
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

        {/* Learning content */}
        <SectionBlock title="学习内容" color={pal.accent} icon={<BookMarked size={12} />}>
          {task.learningContent.map((c, i) => (
            <ContentItem key={i} text={c} dotColor={pal.accent} />
          ))}
        </SectionBlock>

        {/* Practical tasks */}
        <SectionBlock title="实践任务" color="#10b981" icon={<Wrench size={12} />}>
          {task.practicalTasks.map((t, i) => (
            <ContentItem key={i} text={t} dotColor="#10b981" />
          ))}
        </SectionBlock>

        {/* Deliverables */}
        <SectionBlock title="本周交付物" color="#f59e0b" icon={<Package size={12} />}>
          {task.deliverables.map((d, i) => (
            <ContentItem key={i} text={d} dotColor="#f59e0b" />
          ))}
        </SectionBlock>

        {/* Check criteria */}
        {task.checkCriteria?.length > 0 && (
          <SectionBlock title="完成标准" color="#8b5cf6" icon={<TrendingUp size={12} />}>
            {task.checkCriteria.map((c, i) => (
              <ContentItem key={i} text={c} dotColor="#8b5cf6" />
            ))}
          </SectionBlock>
        )}
      </div>

      {/* Footer */}
      {!status && (
        <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(0,0,0,0.06)', flexShrink: 0 }}>
          <button
            onClick={onComplete}
            style={{
              width: '100%', padding: '11px 0',
              background: `linear-gradient(135deg, ${pal.accent}, ${pal.accent}cc)`,
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: `0 4px 14px ${pal.accent}40`,
            }}
          >
            <Check size={15} /> 标记本周完成
          </button>
        </div>
      )}
    </motion.div>
  );
}

function SectionBlock({ title, color, icon, children }: {
  title: string; color: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <span style={{ color }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  );
}

function ContentItem({ text, dotColor }: { text: string; dotColor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: 5 }} />
      <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{text}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PhaseSection component
// ─────────────────────────────────────────────────────────────────────────────
function PhaseSection({
  phase, phaseIdx, tasks, currentWeek, selectedWeek, onSelectWeek,
}: {
  phase: LearningPhase;
  phaseIdx: number;
  tasks: WeeklyTask[];
  currentWeek: number;
  selectedWeek: number | null;
  onSelectWeek: (w: number | null) => void;
}) {
  const pal = PHASE_PALETTE[phaseIdx];
  const [open, setOpen] = useState(true);
  const completedCount = tasks.filter(t => t.completed).length;
  const progressPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;
  const hasActive = tasks.some(t => t.week === currentWeek);

  return (
    <div style={{
      borderRadius: 16,
      border: `1.5px solid ${open ? pal.border : 'rgba(0,0,0,0.07)'}`,
      overflow: 'hidden',
      transition: 'border-color 0.2s',
      background: '#fff',
    }}>
      {/* Phase header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
          padding: '16px 20px',
          background: open ? pal.light : '#fafafa',
          display: 'flex', alignItems: 'center', gap: 14,
          transition: 'background 0.2s',
        }}
      >
        {/* Phase number */}
        <div style={{
          width: 36, height: 36, borderRadius: 12, flexShrink: 0,
          background: pal.accent, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 15, fontWeight: 800,
          boxShadow: `0 4px 12px ${pal.accent}50`,
        }}>
          {phaseIdx + 1}
        </div>

        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{phase.title}</span>
            <span style={{ fontSize: 11, color: '#9ca3af', background: 'rgba(0,0,0,0.05)', borderRadius: 6, padding: '1px 8px' }}>
              {phase.weeks}
            </span>
            {hasActive && (
              <span style={{ fontSize: 10, fontWeight: 700, color: pal.accent, background: pal.light, border: `1px solid ${pal.border}`, borderRadius: 6, padding: '1px 8px' }}>
                进行中
              </span>
            )}
          </div>
          {/* Mini progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progressPct}%`, background: completedCount === tasks.length ? '#10b981' : pal.accent, borderRadius: 2, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>
              {completedCount}/{tasks.length} 周
            </span>
          </div>
        </div>

        {/* Toggle */}
        <div style={{ color: '#9ca3af', flexShrink: 0 }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Phase description */}
      {open && (
        <div style={{ padding: '0 20px 4px', borderBottom: `1px solid ${pal.border}` }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '8px 0 10px', lineHeight: 1.6 }}>
            {phase.description}
          </p>
          {phase.keyDeliverables?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {phase.keyDeliverables.map((d, i) => (
                <span key={i} style={{
                  fontSize: 11, color: pal.accent,
                  background: pal.light, border: `1px solid ${pal.border}`,
                  borderRadius: 6, padding: '2px 8px',
                }}>
                  {d}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Week cards grid */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22 }}
            style={{ padding: '16px 20px 20px' }}
          >
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}>
              {tasks.map(task => (
                <WeekCard
                  key={task.week}
                  task={task}
                  currentWeek={currentWeek}
                  phaseIdx={phaseIdx}
                  selected={selectedWeek === task.week}
                  onSelect={() => onSelectWeek(selectedWeek === task.week ? null : task.week)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function LearningPathPage() {
  const navigate = useNavigate();
  const { learningPath, currentWeek, completeWeekTask, setCurrentWeek, updateWeeklyTasks } = useAppStore();
  const { isMobile } = useBreakpoint();
  const tl = useT();
  const tpath = tl.learningPath;

  const [selectedWeek, setSelectedWeek] = useState<number | null>(currentWeek);
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
      const withFlags: AdjustedTask[] = adjusted.map((t, i) => {
        const orig = learningPath.weeklyTasks[i];
        const modified = t.completed !== orig?.completed || t.learningContent?.join() !== orig?.learningContent?.join() || t.practicalTasks?.join() !== orig?.practicalTasks?.join();
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
        <EmptyState icon={BookOpen} title={tpath.emptyTitle} description={tpath.emptyDesc} action={{ label: tpath.emptyAction, onClick: () => navigate('/') }} />
      </div>
    );
  }

  const { totalWeeks, phases, weeklyTasks, recommendedProject, summary } = learningPath;
  const completedCount = weeklyTasks.filter(t => t.completed).length;
  const progress = Math.round((completedCount / totalWeeks) * 100);

  // Map tasks to phases
  const phaseTaskMap = phases.map(phase => {
    const [start, end] = parsePhaseWeekRange(phase.weeks);
    return weeklyTasks.filter(t => t.week >= start && t.week <= end);
  });

  // Find selected task & its phase index
  const selectedTask = selectedWeek != null ? weeklyTasks.find(t => t.week === selectedWeek) ?? null : null;
  const selectedPhaseIdx = selectedTask
    ? phases.findIndex((_, i) => phaseTaskMap[i].some(t => t.week === selectedTask.week))
    : 0;

  return (
    <div style={{
      padding: isMobile ? '16px' : '32px',
      maxWidth: 900,
      margin: '0 auto',
      position: 'relative',
    }}>

      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, color: '#111827', margin: '0 0 4px' }}>{tpath.title}</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
            {tpath.subtitle.replace('{n}', String(totalWeeks))}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
              {tpath.badge.replace('{done}', String(completedCount)).replace('{total}', String(totalWeeks))}
            </span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{progress}% 完成</span>
          </div>
        </div>
        <button
          onClick={() => setPanelOpen(true)}
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
          }}
        >
          <Sparkles size={14} />
          {!isMobile && 'AI 调整路径'}
        </button>
      </div>

      {/* ── Summary + progress ── */}
      <Card className="p-5 mb-5">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Target size={19} color="#6366f1" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{tpath.summary}</div>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, margin: 0 }}>{summary}</p>
          </div>
        </div>
        <Progress value={progress} showPercent color="indigo" size="md" />
      </Card>

      {/* ── Recommended project ── */}
      <Card className="p-4 mb-6" style={{ borderColor: 'rgba(99,102,241,0.18)', background: 'rgba(99,102,241,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, background: 'rgba(99,102,241,0.1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Award size={17} color="#6366f1" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{tpath.recommendedProject}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{recommendedProject.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Badge color="indigo">{tpath.difficulty[recommendedProject.difficulty as keyof typeof tpath.difficulty]}</Badge>
              <span style={{ fontSize: 11, color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={11} /> {tpath.aboutWeeks.replace('{n}', String(recommendedProject.estimatedWeeks))}
              </span>
            </div>
          </div>
          <button
            onClick={() => navigate('/project')}
            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#6366f1', fontWeight: 600, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}
          >
            {tpath.startProject} <ArrowRight size={12} />
          </button>
        </div>
      </Card>

      {/* ── Phase sections (merged with weekly tasks) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {phases.map((phase, i) => (
          <PhaseSection
            key={i}
            phase={phase}
            phaseIdx={i}
            tasks={phaseTaskMap[i] ?? []}
            currentWeek={currentWeek}
            selectedWeek={selectedWeek}
            onSelectWeek={(w) => {
              setSelectedWeek(w);
              if (w != null) setCurrentWeek(w);
            }}
          />
        ))}
      </div>

      {/* ── Task detail panel ── */}
      <AnimatePresence>
        {selectedTask && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelectedWeek(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.2)', zIndex: 50 }}
            />
            <TaskDetailPanel
              task={selectedTask}
              phaseIdx={selectedPhaseIdx}
              onClose={() => setSelectedWeek(null)}
              onComplete={() => {
                completeWeekTask(selectedTask.week);
                setSelectedWeek(null);
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* ── AI 调整侧边面板 ── */}
      <AnimatePresence>
        {panelOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { if (adjustStatus !== 'thinking') setPanelOpen(false); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: '#111118', borderLeft: '1px solid rgba(255,255,255,0.08)', zIndex: 70, display: 'flex', flexDirection: 'column' }}
            >
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
                        <div key={t.week} style={{ background: t._autoCompleted ? 'rgba(16,185,129,0.08)' : t._modified ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${t._autoCompleted ? 'rgba(16,185,129,0.3)' : t._modified ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>第 {t.week} 周</span>
                            {t._autoCompleted && <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.15)', borderRadius: 6, padding: '1px 7px', fontWeight: 700 }}>自动完成</span>}
                            {t._modified && !t._autoCompleted && <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.15)', borderRadius: 6, padding: '1px 7px', fontWeight: 700 }}>已调整</span>}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>{t.title}</div>
                          {t._modified && !t._autoCompleted && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{t.learningContent.length} 条学习内容 · {t.practicalTasks.length} 个实践任务</div>}
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

              {(adjustStatus === 'idle' || adjustStatus === 'preview') && (
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  {adjustStatus === 'preview' ? (
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button onClick={() => { setAdjustStatus('idle'); setPreviewTasks(null); }} style={{ flex: 1, padding: '10px 0', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer' }}>重新描述</button>
                      <button onClick={handleApply} style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
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
                      <button onClick={handleAIAdjust} disabled={!inputValue.trim()} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', background: inputValue.trim() ? '#6366f1' : 'rgba(255,255,255,0.08)', cursor: inputValue.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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
