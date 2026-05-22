import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Briefcase, GraduationCap, Sparkles, Loader2,
  ChevronDown, ChevronUp, FileText, Plus, Trash2,
  CheckCircle2, Clock, CircleDot, XCircle, Trophy,
  CalendarDays, BarChart2, BookOpen, AlertCircle,
  CheckCircle, Circle, ExternalLink, GripVertical,
  Star, Edit2, Check, X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAppStore } from '../../store/useAppStore';
import { Card, PageHeader, Progress } from '../../components/UI';
import { orchestrateLearningPath, matchTargets, type OrchestrateInput } from '../../lib/agentAPI';
import type {
  TargetItem, TargetTier, ApplicationRecord,
  ApplicationStage, CareerMode, WeeklyTask, CareerDirection,
} from '../../types';

// ── Tier / Stage configs ──────────────────────────────────────────────────────
const TIER_CFG: Record<TargetTier, { label: string; colorClass: string; badgeBg: string; badgeText: string; dot: string }> = {
  reach:  { label: '冲刺', colorClass: 'text-amber-500',  badgeBg: 'bg-amber-50  dark:bg-amber-900/20', badgeText: 'text-amber-600 dark:text-amber-400', dot: '#f59e0b' },
  target: { label: '目标', colorClass: 'text-indigo-500', badgeBg: 'bg-indigo-50 dark:bg-indigo-900/20', badgeText: 'text-indigo-600 dark:text-indigo-400', dot: '#6366f1' },
  safety: { label: '保底', colorClass: 'text-emerald-500',badgeBg: 'bg-emerald-50 dark:bg-emerald-900/20', badgeText: 'text-emerald-600 dark:text-emerald-400', dot: '#10b981' },
};

const TIER_ICON: Record<TargetTier, string> = { reach: '🎯', target: '📌', safety: '🛡' };

const STAGE_CFG: Record<ApplicationStage, { label: string; colorClass: string; icon: React.ReactNode }> = {
  preparing:  { label: '准备中',     colorClass: 'text-gray-400',   icon: <Clock size={12} /> },
  submitted:  { label: '已投递',     colorClass: 'text-indigo-500', icon: <CircleDot size={12} /> },
  assessment: { label: '笔试/提交',  colorClass: 'text-amber-500',  icon: <FileText size={12} /> },
  interview:  { label: '面试中',     colorClass: 'text-purple-500', icon: <BarChart2 size={12} /> },
  offer:      { label: '已拿 Offer', colorClass: 'text-emerald-500',icon: <Trophy size={12} /> },
  rejected:   { label: '已拒绝',     colorClass: 'text-red-400',    icon: <XCircle size={12} /> },
};

// ── TargetCard ────────────────────────────────────────────────────────────────
function TargetCard({ item, mode, onAdd }: {
  item: TargetItem; mode: CareerMode; onAdd: (item: TargetItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const tier = TIER_CFG[item.tier];
  const score = mode === 'job' ? item.matchScore : item.offerChance;

  return (
    <Card className="p-4 mb-2" hover>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md shrink-0 ${tier.badgeBg} ${tier.badgeText}`}>
          {TIER_ICON[item.tier]} {tier.label}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{item.name}</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {mode === 'job'
              ? [item.industry, item.city, item.size].filter(Boolean).join(' · ')
              : [item.country, item.program].filter(Boolean).join(' · ')}
          </div>
        </div>
        {score !== undefined && (
          <div className="text-right shrink-0">
            <div className={`text-lg font-bold ${tier.colorClass}`}>{score}</div>
            <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
              {mode === 'job' ? '匹配度' : '录取几率'}
            </div>
          </div>
        )}
        <button
          onClick={() => setExpanded(v => !v)}
          className="p-1 rounded-md transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
          style={{ color: 'var(--text-faint)' }}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{item.highlights}</p>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}
          >
            <div className="mt-3 flex flex-col gap-2">
              {(mode === 'job' ? item.resumeTip : item.portfolioTip) && (
                <div className="rounded-lg p-3 text-xs bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/40">
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {mode === 'job' ? '简历建议 · ' : '作品集建议 · '}
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {mode === 'job' ? item.resumeTip : item.portfolioTip}
                  </span>
                </div>
              )}
              {mode === 'school' && item.deadline && (
                <p className="text-xs text-amber-500">
                  ⏰ 截止：{item.deadline}
                  {item.tuition && <span className="ml-3" style={{ color: 'var(--text-muted)' }}>学费：{item.tuition}</span>}
                </p>
              )}
              {mode === 'job' && item.roles && item.roles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.roles.map(r => (
                    <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8" style={{ color: 'var(--text-muted)' }}>{r}</span>
                  ))}
                </div>
              )}
              <button
                onClick={() => onAdd(item)}
                className="self-start flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
              >
                <Plus size={11} /> 加入申请追踪
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── ApplicationRow ────────────────────────────────────────────────────────────
function ApplicationRow({ record, onStage, onDelete }: {
  record: ApplicationRecord;
  onStage: (s: ApplicationStage) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const tier = TIER_CFG[record.tier];
  const stage = STAGE_CFG[record.stage];

  return (
    <Card className="px-4 py-3 flex items-center gap-3 relative">
      <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${tier.badgeBg} ${tier.badgeText}`}>
        {tier.label}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{record.name}</div>
        {record.role && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{record.role}</div>}
      </div>

      {/* Stage selector */}
      <div className="relative shrink-0">
        <button
          onClick={() => setOpen(v => !v)}
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/8 transition-colors ${stage.colorClass}`}
        >
          {stage.icon} {stage.label} <ChevronDown size={10} />
        </button>
        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg border"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-strong)', minWidth: 140 }}
          >
            {(Object.entries(STAGE_CFG) as [ApplicationStage, typeof STAGE_CFG[ApplicationStage]][]).map(([k, c]) => (
              <button key={k} onClick={() => { onStage(k); setOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${c.colorClass} ${k === record.stage ? 'font-semibold' : ''}`}
                style={{ background: k === record.stage ? 'var(--bg-hover)' : undefined }}
              >
                {c.icon} {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button onClick={onDelete} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-400 transition-colors">
        <Trash2 size={13} />
      </button>
    </Card>
  );
}

// ── Inline weekly task card ───────────────────────────────────────────────────
function WeekCard({ task, isCurrent, onToggle }: {
  task: WeeklyTask; isCurrent: boolean; onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const phase = task.phase as string | undefined;
  const PHASE_COLOR: Record<string, string> = {
    '基础': '#6366f1', '进阶': '#f59e0b', '实战': '#10b981', '冲刺': '#ef4444',
  };
  const phaseColor = (phase && PHASE_COLOR[phase]) ?? '#6366f1';

  return (
    <Card className={`mb-2 transition-all ${isCurrent ? 'ring-1 ring-indigo-300 dark:ring-indigo-600' : ''}`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          className="shrink-0 text-gray-300 hover:text-indigo-500 transition-colors"
        >
          {task.completed
            ? <CheckCircle size={18} className="text-indigo-500" />
            : <Circle size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: 'var(--text-faint)' }}>第 {task.week} 周</span>
            {phase && (
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ color: phaseColor, background: `${phaseColor}18` }}>
                {phase}
              </span>
            )}
            {isCurrent && !task.completed && (
              <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-indigo-50 dark:bg-indigo-900/25 text-indigo-600 dark:text-indigo-400">当前</span>
            )}
          </div>
          <div className={`text-sm font-semibold mt-0.5 ${task.completed ? 'line-through' : ''}`}
            style={{ color: task.completed ? 'var(--text-faint)' : 'var(--text-primary)' }}>
            {task.title}
          </div>
          {task.objective && !expanded && (
            <div className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{task.objective}</div>
          )}
        </div>
        <button className="shrink-0 p-1" style={{ color: 'var(--text-faint)' }}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
            <div className="px-4 pb-4 pt-0 grid grid-cols-2 gap-3">
              {task.objective && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>本周目标</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{task.objective}</p>
                </div>
              )}
              {task.learningContent?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>学习内容</p>
                  <ul className="space-y-0.5">
                    {task.learningContent.map((c, i) => <li key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>· {c}</li>)}
                  </ul>
                </div>
              )}
              {task.practicalTasks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>实践任务</p>
                  <ul className="space-y-0.5">
                    {task.practicalTasks.map((c, i) => <li key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>· {c}</li>)}
                  </ul>
                </div>
              )}
              {task.deliverables?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-xs font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>交付物</p>
                  <div className="flex flex-wrap gap-1.5">
                    {task.deliverables.map((d, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/8" style={{ color: 'var(--text-muted)' }}>{d}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ── Sortable direction item ───────────────────────────────────────────────────
function SortableDirectionItem({
  dir, onActivate, onDelete, onEdit, onGenerate, loading,
}: {
  dir: CareerDirection;
  onActivate: () => void;
  onDelete: () => void;
  onEdit: (label: string) => void;
  onGenerate: () => void;
  loading: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: dir.id });
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(dir.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const commitEdit = () => {
    if (editVal.trim()) onEdit(editVal.trim());
    setEditing(false);
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className={`mb-2 transition-all ${dir.isActive ? 'ring-1 ring-indigo-400 dark:ring-indigo-500' : ''}`}>
        <div className="flex items-center gap-2 p-3">
          {/* Drag handle */}
          <button
            {...attributes} {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 dark:hover:bg-white/8 touch-none"
            style={{ color: 'var(--text-faint)' }}
          >
            <GripVertical size={15} />
          </button>

          {/* Active dot */}
          <button onClick={onActivate} title="设为当前规划方向" className="shrink-0">
            {dir.isActive
              ? <Star size={14} className="text-amber-400 fill-amber-400" />
              : <Star size={14} className="text-gray-300 dark:text-gray-600 hover:text-amber-300 transition-colors" />}
          </button>

          {/* Label */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-1.5">
                <input
                  ref={inputRef}
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditVal(dir.label); setEditing(false); } }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm rounded border focus:outline-none focus:border-indigo-400"
                  style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
                />
                <button onClick={commitEdit} className="p-1 text-indigo-500 hover:text-indigo-600"><Check size={13} /></button>
                <button onClick={() => { setEditVal(dir.label); setEditing(false); }} className="p-1" style={{ color: 'var(--text-faint)' }}><X size={13} /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{dir.label}</span>
                {dir.isActive && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                    当前
                  </span>
                )}
                {dir.targets && dir.targets.length > 0 && (
                  <span className="text-xs" style={{ color: 'var(--text-faint)' }}>· {dir.targets.length} 个目标</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          {!editing && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => { setEditing(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/8 transition-colors"
                style={{ color: 'var(--text-faint)' }}
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={onGenerate}
                disabled={loading}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                AI 规划
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
type Tab = 'setup' | 'path' | 'targets' | 'tracker';

function TabBar({ active, onChange, counts }: {
  active: Tab;
  onChange: (t: Tab) => void;
  counts: { path?: number; targets?: number; tracker?: number };
}) {
  const tabs: { key: Tab; icon: React.ReactNode; label: string; count?: number }[] = [
    { key: 'setup',   icon: <Sparkles size={13} />,    label: 'AI 规划设定' },
    { key: 'path',    icon: <CalendarDays size={13} />, label: '学习路径',   count: counts.path },
    { key: 'targets', icon: <Target size={13} />,       label: '目标列表',   count: counts.targets },
    { key: 'tracker', icon: <CheckCircle2 size={13} />, label: '申请追踪',   count: counts.tracker },
  ];

  return (
    <div className="flex gap-1 border-b px-6" style={{ borderColor: 'var(--border)' }}>
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`
            flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors
            ${active === tab.key
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent hover:text-gray-700 dark:hover:text-gray-300'}
          `}
          style={{ color: active === tab.key ? undefined : 'var(--text-muted)' }}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              active === tab.key
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'bg-gray-100 dark:bg-white/8 text-gray-500'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CareerTargetsPage() {
  const navigate = useNavigate();
  const {
    userProfile, skillAssessment, targetRole,
    learningPath, setLearningPath, currentWeek, completeWeekTask,
    careerTargets, setCareerTargets,
    addCareerDirection, updateCareerDirection, deleteCareerDirection,
    reorderCareerDirections, setActiveCareerDirection,
    applications, addApplication, updateApplication, deleteApplication,
  } = useAppStore();

  const [mode, setMode]               = useState<CareerMode>(careerTargets?.mode ?? 'job');
  const [newDirInput, setNewDirInput] = useState('');
  const [preferences, setPreferences] = useState('');
  const [loadingDirId, setLoadingDirId] = useState<string | null>(null);
  const [error, setError]             = useState('');
  const [activeTab, setActiveTab]     = useState<Tab>(learningPath ? 'path' : 'setup');

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const directions = (careerTargets?.directions ?? []).filter(d => d.mode === mode);

  const buildProfile = () => {
    const parts: string[] = [];
    if (userProfile.educationLevel) parts.push(userProfile.educationLevel);
    if (userProfile.major) parts.push(userProfile.major);
    if (userProfile.workYears) parts.push(`${userProfile.workYears}年经验`);
    return parts.join('，') || '设计相关背景';
  };
  const buildSkills = () => {
    const s: string[] = [];
    if (skillAssessment?.strengths) s.push(...skillAssessment.strengths);
    if (skillAssessment?.priorityAreas) s.push(...skillAssessment.priorityAreas);
    return s.length ? s : ['设计', 'Figma'];
  };

  const handleAddDirection = () => {
    const label = newDirInput.trim();
    if (!label) return;
    const newDir: CareerDirection = {
      id: `dir-${Date.now()}`, label, mode,
      order: directions.length, isActive: directions.length === 0,
    };
    addCareerDirection(newDir);
    setNewDirInput('');
    setError('');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = directions.findIndex(d => d.id === active.id);
    const newIndex = directions.findIndex(d => d.id === over.id);
    const reordered = arrayMove(directions, oldIndex, newIndex);
    reorderCareerDirections(reordered.map(d => d.id));
  };

  const handleGenerate = async (dir: CareerDirection) => {
    setLoadingDirId(dir.id);
    setError('');
    try {
      const input: OrchestrateInput = {
        mode: dir.mode,
        profile: buildProfile(),
        currentSkills: buildSkills(),
        direction: dir.label,
        preferences,
      };
      const result = await orchestrateLearningPath(input);

      // Save targets back to this direction
      updateCareerDirection(dir.id, {
        targets: result.targets,
        tiers: result.tiers,
        resumeTips: result.resumeTips,
        portfolioTips: result.portfolioTips,
        generatedAt: new Date().toISOString(),
        isActive: true,
      });
      // Mark all others inactive
      directions.forEach(d => { if (d.id !== dir.id) updateCareerDirection(d.id, { isActive: false }); });

      // Save learning path if returned
      if (result.weeklyTasks?.length) {
        setLearningPath({
          totalWeeks: result.weeklyTasks.length, phases: [],
          weeklyTasks: result.weeklyTasks,
          recommendedProject: {
            id: 'ai', name: '待规划', suitableFor: [], background: '', targetUsers: '',
            designConstraints: [], functionalRequirements: [], structuralRequirements: [],
            deliverables: [], estimatedWeeks: 4, difficulty: 'intermediate',
          },
          summary: `基于「${dir.label}」方向的 ${result.weeklyTasks.length} 周成长路径`,
        });
      }

      // Update the global targets view with active direction's results
      setCareerTargets({
        mode: dir.mode, direction: dir.label,
        directions: careerTargets?.directions ?? [],
        targets: result.targets, tiers: result.tiers,
        resumeTips: result.resumeTips, portfolioTips: result.portfolioTips,
        generatedAt: new Date().toISOString(),
      });

      setActiveTab('path');
    } catch {
      setError(`「${dir.label}」规划失败，请检查后端服务`);
    } finally {
      setLoadingDirId(null);
    }
  };

  // Quick match targets only (no learning path)
  const handleMatchTargets = async (dir: CareerDirection) => {
    setLoadingDirId(dir.id);
    try {
      const result = await matchTargets({
        mode: dir.mode, profile: buildProfile(),
        skills: buildSkills(), direction: dir.label, preferences,
      });
      updateCareerDirection(dir.id, {
        targets: result.targets, tiers: result.tiers,
        resumeTips: result.resumeTips, portfolioTips: result.portfolioTips,
        generatedAt: new Date().toISOString(),
      });
      setCareerTargets({
        mode: dir.mode, direction: dir.label,
        directions: careerTargets?.directions ?? [],
        targets: result.targets, tiers: result.tiers,
        resumeTips: result.resumeTips, portfolioTips: result.portfolioTips,
        generatedAt: new Date().toISOString(),
      });
      setActiveTab('targets');
    } catch {
      setError(`「${dir.label}」匹配失败`);
    } finally {
      setLoadingDirId(null);
    }
  };

  const handleAddToTracker = (item: TargetItem) => {
    if (applications.find(a => a.name === item.name && a.mode === mode)) return;
    addApplication({
      id: `app-${Date.now()}`, mode, name: item.name,
      role: mode === 'job' ? (item.roles?.[0] ?? '') : (item.program ?? ''),
      tier: item.tier, stage: 'preparing', updatedAt: new Date().toISOString(),
    });
    setActiveTab('tracker');
  };

  const targets = careerTargets?.targets ?? [];
  const tiers   = careerTargets?.tiers   ?? { reach: [], target: [], safety: [] };
  const filteredApps = applications.filter(a => a.mode === mode);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Page header */}
      <div className="px-8 pt-8 pb-0">
        <PageHeader
          title="目标规划"
          subtitle="学习路径 · 目标公司 / 院校 · 申请追踪"
          badge={mode === 'job' ? '求职' : '申请学校'}
        />
      </div>

      {/* Tab bar */}
      <TabBar
        active={activeTab}
        onChange={setActiveTab}
        counts={{
          path:    learningPath?.weeklyTasks?.length,
          targets: targets.length || undefined,
          tracker: filteredApps.length || undefined,
        }}
      />

      {/* Tab content */}
      <AnimatePresence mode="wait">

        {/* ── AI 规划设定 ── */}
        {activeTab === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="px-8 py-6 max-w-2xl">

            {/* Mode toggle */}
            <div className="flex gap-2 mb-5">
              {(['job', 'school'] as CareerMode[]).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    mode === m
                      ? 'bg-indigo-50 dark:bg-indigo-900/25 border-indigo-300 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400'
                      : 'border-gray-200 dark:border-white/10 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {m === 'job' ? <><Briefcase size={14} />求职</> : <><GraduationCap size={14} />申请学校</>}
                </button>
              ))}
            </div>

            {/* Preferences */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                {mode === 'job' ? '偏好（城市 / 规模 / 行业）' : '偏好（国家 / 地区）'}
              </label>
              <input
                value={preferences}
                onChange={e => setPreferences(e.target.value)}
                placeholder={mode === 'job' ? '如：北京，大厂优先' : '如：美国，1-2 年制'}
                className="w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-indigo-400 transition-colors"
                style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Direction list */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
                  {mode === 'job' ? '目标岗位方向' : '目标专业方向'}
                  <span className="ml-1.5 font-normal" style={{ color: 'var(--text-faint)' }}>
                    拖动排序 · ★ 标记当前方向
                  </span>
                </label>
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{directions.length} 个</span>
              </div>

              {directions.length === 0 && (
                <div className="py-8 text-center rounded-xl border-2 border-dashed mb-3"
                  style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}>
                  <Target size={24} className="mx-auto mb-2 opacity-40" />
                  <p className="text-xs">添加你感兴趣的方向，可以有多个</p>
                </div>
              )}

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={directions.map(d => d.id)} strategy={verticalListSortingStrategy}>
                  {directions.map(dir => (
                    <SortableDirectionItem
                      key={dir.id}
                      dir={dir}
                      loading={loadingDirId === dir.id}
                      onActivate={() => setActiveCareerDirection(dir.id)}
                      onDelete={() => deleteCareerDirection(dir.id)}
                      onEdit={(label) => updateCareerDirection(dir.id, { label })}
                      onGenerate={() => handleGenerate(dir)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>

            {/* Add direction input */}
            <div className="flex gap-2 mb-4">
              <input
                value={newDirInput}
                onChange={e => setNewDirInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddDirection()}
                placeholder={mode === 'job' ? '输入岗位方向，如：AI 产品经理' : '输入专业方向，如：RCA 交互设计 MFA'}
                className="flex-1 px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-indigo-400 transition-colors"
                style={{ background: 'var(--bg-surface-2)', borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}
              />
              <button
                onClick={handleAddDirection}
                disabled={!newDirInput.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 disabled:opacity-40 transition-colors"
              >
                <Plus size={14} /> 添加
              </button>
            </div>

            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

            {learningPath && (
              <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
                已有学习路径（{learningPath.weeklyTasks.length} 周）·
                <button onClick={() => setActiveTab('path')} className="ml-1 text-indigo-500 hover:underline">查看 →</button>
              </p>
            )}
          </motion.div>
        )}

        {/* ── 学习路径 ── */}
        {activeTab === 'path' && (
          <motion.div key="path" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-8 py-6 max-w-3xl">
            {!learningPath ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <CalendarDays size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>还没有学习路径</p>
                <p className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>在「AI 规划设定」填写目标方向，一键生成</p>
                <button onClick={() => setActiveTab('setup')}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 transition-colors">
                  去 AI 规划设定 →
                </button>
              </div>
            ) : (
              <>
                {/* Progress summary */}
                <Card className="p-4 mb-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {learningPath.weeklyTasks.length} 周学习路径
                      </h3>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{learningPath.summary}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-indigo-500">
                        {learningPath.weeklyTasks.filter(t => t.completed).length}/{learningPath.weeklyTasks.length} 周
                      </span>
                      <button
                        onClick={() => navigate('/learning-path-detail')}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-white/10 hover:border-indigo-300 transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <ExternalLink size={11} /> 完整视图
                      </button>
                    </div>
                  </div>
                  <Progress
                    value={Math.round((learningPath.weeklyTasks.filter(t => t.completed).length / learningPath.weeklyTasks.length) * 100)}
                    color="indigo" size="sm"
                  />
                </Card>

                {/* Week task list */}
                <div>
                  {learningPath.weeklyTasks.map(task => (
                    <WeekCard
                      key={task.week}
                      task={task}
                      isCurrent={task.week === currentWeek && !task.completed}
                      onToggle={() => completeWeekTask(task.week)}
                    />
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* ── 目标列表 ── */}
        {activeTab === 'targets' && (
          <motion.div key="targets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-8 py-6 max-w-3xl">
            {targets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Target size={40} className="text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                  运行 AI 规划后会自动推荐目标{mode === 'job' ? '公司' : '院校'}
                </p>
                <button onClick={() => setActiveTab('setup')}
                  className="mt-3 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 transition-colors">
                  去 AI 规划设定 →
                </button>
              </div>
            ) : (
              <>
                {/* Tips cards */}
                {(careerTargets?.resumeTips || careerTargets?.portfolioTips) && (
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {careerTargets?.resumeTips && (
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={13} className="text-indigo-500" />
                          <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">简历建议</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{careerTargets.resumeTips}</p>
                      </Card>
                    )}
                    {careerTargets?.portfolioTips && (
                      <Card className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen size={13} className="text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">作品集建议</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{careerTargets.portfolioTips}</p>
                      </Card>
                    )}
                  </div>
                )}

                {/* Tier sections */}
                {(['reach', 'target', 'safety'] as TargetTier[]).map(tier => {
                  const items = tiers[tier];
                  if (!items.length) return null;
                  const cfg = TIER_CFG[tier];
                  return (
                    <div key={tier} className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-base">{TIER_ICON[tier]}</span>
                        <span className={`text-sm font-bold ${cfg.colorClass}`}>{cfg.label}</span>
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>· {items.length} 家</span>
                      </div>
                      {items.map((item, i) => (
                        <TargetCard key={i} item={item} mode={mode} onAdd={handleAddToTracker} />
                      ))}
                    </div>
                  );
                })}
              </>
            )}
          </motion.div>
        )}

        {/* ── 申请追踪 ── */}
        {activeTab === 'tracker' && (
          <motion.div key="tracker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="px-8 py-6 max-w-2xl">
            {filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <AlertCircle size={36} className="text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>还没有申请记录</p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>在目标列表里点「加入申请追踪」</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Stage summary */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {(Object.entries(STAGE_CFG) as [ApplicationStage, typeof STAGE_CFG[ApplicationStage]][]).map(([k, c]) => {
                    const n = filteredApps.filter(a => a.stage === k).length;
                    if (!n) return null;
                    return (
                      <div key={k} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-white/8 font-medium ${c.colorClass}`}>
                        {c.icon} {c.label} <strong>{n}</strong>
                      </div>
                    );
                  })}
                </div>
                {filteredApps.map(r => (
                  <ApplicationRow key={r.id} record={r}
                    onStage={s => updateApplication(r.id, { stage: s, updatedAt: new Date().toISOString() })}
                    onDelete={() => deleteApplication(r.id)}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
