import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  BookOpen, Target, User, Zap, GitCompare, Package,
  Settings2, Lightbulb, Layers, ImagePlus, Sparkles,
  X, Upload, CheckCircle, Bot, CheckCircle2, Loader2, Expand, Plus,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import type { Project, ProjectMaterial } from '../../types';
import { completeProjectField, analyzeProject, researchProjectBackground } from '../../lib/agentAPI';

function buildProjectContext(project: Project): string {
  return [
    project.background       && `项目背景：${project.background}`,
    project.designGoal       && `设计目标：${project.designGoal}`,
    project.personalContribution && `个人贡献：${project.personalContribution}`,
    project.mainChallenge    && `主要挑战：${project.mainChallenge}`,
    project.solutionComparison && `方案对比：${project.solutionComparison}`,
    project.materialChoice   && `材料选择：${project.materialChoice}`,
    project.manufacturingConsideration && `制造考量：${project.manufacturingConsideration}`,
    project.improvementIdeas && `改进思路：${project.improvementIdeas}`,
  ].filter(Boolean).join('\n');
}

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  nodeBg:       '#ffffff',
  nodeBorder:   'rgba(0,0,0,0.08)',
  headerBg:     '#f8f9fb',
  textPrimary:  '#111827',
  textSecond:   '#6b7280',
  textMuted:    '#9ca3af',
  accent:       '#6366f1',
  accentDim:    'rgba(99,102,241,0.08)',
  accentBorder: 'rgba(99,102,241,0.28)',
  divider:      'rgba(0,0,0,0.05)',
  ring:         'rgba(99,102,241,0.30)',
};

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen, Target, User, Zap, GitCompare, Package, Settings2, Lightbulb, Layers, Sparkles, Loader2,
};

// ── Full-screen field editor (portal) ────────────────────────────────────────
function FieldEditor({
  label,
  icon: Icon,
  value,
  placeholder,
  onClose,
  onChange,
  onAISuggest,
  aiLoading,
  isBackground,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  placeholder: string;
  onClose: () => void;
  onChange: (v: string) => void;
  onAISuggest: () => void;
  aiLoading: boolean;
  isBackground: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const wordCount = value.trim() ? value.trim().length : 0;

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{ width: '680px', maxWidth: '92vw', maxHeight: '82vh', background: '#ffffff', borderRadius: 20, boxShadow: '0 32px 80px rgba(0,0,0,0.22)', border: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10, background: '#f8f9fb' }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(99,102,241,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={14} style={{ color: T.accent }} />
          </div>
          <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.textPrimary }}>{label}</span>
          <button
            onClick={onAISuggest}
            disabled={aiLoading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 9, background: aiLoading ? T.accentDim : 'rgba(99,102,241,0.08)', border: `1px solid ${T.accentBorder}`, color: T.accent, fontSize: 12, fontWeight: 500, cursor: aiLoading ? 'not-allowed' : 'pointer' }}
          >
            {aiLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={12} />}
            {aiLoading ? 'AI 生成中…' : isBackground && !value.trim() ? 'AI 调研背景' : 'AI 补全'}
          </button>
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={14} style={{ color: T.textMuted }} />
          </button>
        </div>

        {/* Editor body */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            style={{
              flex: 1, width: '100%', padding: '20px 24px',
              fontSize: 13.5, lineHeight: 1.8, color: T.textPrimary,
              background: 'transparent', border: 'none', outline: 'none',
              resize: 'none', fontFamily: 'inherit', caretColor: T.accent,
              minHeight: '320px',
            }}
          />
        </div>

        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafafa' }}>
          <span style={{ fontSize: 11, color: T.textMuted }}>{wordCount} 字 &nbsp;·&nbsp; Esc 关闭</span>
          <button
            onClick={onClose}
            style={{ padding: '6px 18px', borderRadius: 9, background: T.accent, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            完成
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

const handleStyle = {
  width: 8, height: 8,
  background: T.accent,
  border: `2px solid ${T.nodeBg}`,
};

const nodeBase = (selected: boolean) =>
  `rounded-2xl overflow-hidden transition-all duration-150 ${
    selected ? `ring-1 ring-[${T.accent}]/50` : ''
  }`;

// ── Project Header Node ───────────────────────────────────────────────────────
export const ProjectHeaderNode = memo(({ data, selected }: NodeProps) => {
  const { projects, updateProject } = useAppStore();
  const pid = (data as { projectId: string }).projectId;
  const project = projects.find(p => p.id === pid);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (project && !project.name) {
      setTimeout(() => nameRef.current?.focus(), 80);
    }
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!project) return null;

  return (
    <div
      className={nodeBase(selected)}
      style={{
        width: 288,
        background: T.nodeBg,
        border: `1px solid ${selected ? T.accentBorder : T.nodeBorder}`,
        boxShadow: selected ? `0 0 0 1px rgba(99,102,241,0.25), 0 4px 20px rgba(0,0,0,0.10)` : '0 1px 8px rgba(0,0,0,0.07)',
      }}
    >
      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.divider}` }} className="px-4 py-3 flex items-center gap-2">
        <BookOpen size={13} style={{ color: T.accent }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.textMuted }}>Project</span>
      </div>

      <div className="px-4 py-4">
        <input
          ref={nameRef}
          className="nodrag w-full bg-transparent text-base font-semibold outline-none mb-4"
          style={{ color: T.textPrimary }}
          value={project.name}
          onChange={e => updateProject(project.id, { name: e.target.value })}
          placeholder="给项目起个名字…"
          onClick={e => e.stopPropagation()}
        />
        <div className="flex items-center gap-2.5">
          <div className="flex-1 h-px" style={{ background: T.divider }}>
            <div
              className="h-px transition-all duration-500"
              style={{ width: `${project.completionRate}%`, background: T.accent }}
            />
          </div>
          <span className="text-xs font-medium tabular-nums" style={{ color: T.textSecond }}>
            {project.completionRate}%
          </span>
        </div>
        <div className="mt-2 text-xs" style={{ color: T.textMuted }}>
          {project.materials.length} materials
        </div>
      </div>
    </div>
  );
});
ProjectHeaderNode.displayName = 'ProjectHeaderNode';

// ── Field Node ────────────────────────────────────────────────────────────────
export type FieldNodeData = {
  projectId: string;
  fieldKey: keyof Project | '__extra__';
  customId?: string;          // only when fieldKey === '__extra__'
  label: string;
  placeholder: string;
  category: string;
  iconName: string;
  onAddAfter?: (parentKey: string, label: string) => void;
  nodeKey: string;            // the canvas key for this node (e.g. 'background', 'extra:abc')
};

// ── Add-child popover ─────────────────────────────────────────────────────────
function AddChildPopover({
  onConfirm,
  onClose,
}: {
  onConfirm: (label: string) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const confirm = () => { if (val.trim()) { onConfirm(val.trim()); onClose(); } };

  return (
    <div
      className="nodrag nopan"
      onClick={e => e.stopPropagation()}
      style={{
        position: 'absolute', top: 'calc(100% + 10px)', left: '50%',
        transform: 'translateX(-50%)', zIndex: 200,
        width: 220, background: '#fff',
        border: `1px solid ${T.accentBorder}`,
        borderRadius: 14, boxShadow: '0 8px 32px rgba(99,102,241,0.18)',
        padding: '12px 12px 10px',
      }}
    >
      <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 8, fontWeight: 500 }}>
        给新卡片起个名字
      </div>
      <input
        ref={inputRef}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') confirm(); if (e.key === 'Escape') onClose(); }}
        placeholder="例：用户洞察、成本分析…"
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '7px 10px', borderRadius: 9, fontSize: 12,
          border: `1px solid ${T.accentBorder}`, outline: 'none',
          color: T.textPrimary, background: '#f8f9fb', fontFamily: 'inherit',
        }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <button
          onClick={onClose}
          style={{ flex: 1, padding: '6px 0', border: `1px solid ${T.nodeBorder}`, borderRadius: 8, background: 'transparent', color: T.textMuted, fontSize: 11, cursor: 'pointer' }}
        >
          取消
        </button>
        <button
          onClick={confirm}
          disabled={!val.trim()}
          style={{ flex: 2, padding: '6px 0', border: 'none', borderRadius: 8, background: val.trim() ? T.accent : T.accentDim, color: val.trim() ? '#fff' : T.textMuted, fontSize: 11, fontWeight: 600, cursor: val.trim() ? 'pointer' : 'not-allowed' }}
        >
          添加
        </button>
      </div>
    </div>
  );
}

export const FieldNode = memo(({ data, selected }: NodeProps) => {
  const { projects, updateProject } = useAppStore();
  const d = data as FieldNodeData;
  const project = projects.find(p => p.id === d.projectId);

  // Read value: either from a top-level Project field or from extraFields
  const value = project
    ? d.fieldKey === '__extra__' && d.customId
      ? (project.extraFields?.[d.customId]?.content ?? '')
      : ((project[d.fieldKey as keyof Project] as string) || '')
    : '';

  const Icon = ICON_MAP[d.iconName] || BookOpen;
  const filled = value.trim().length > 0;
  const [aiLoading, setAiLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Press E while hovering → open editor
  useEffect(() => {
    if (!hovered || showAdd) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); setExpanded(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [hovered, showAdd]);

  // Write value back to store
  const handleChange = useCallback((v: string) => {
    if (!project) return;
    if (d.fieldKey === '__extra__' && d.customId) {
      const prev = project.extraFields ?? {};
      updateProject(project.id, {
        extraFields: { ...prev, [d.customId]: { ...prev[d.customId], content: v } },
      } as Partial<typeof project>);
    } else {
      updateProject(project.id, { [d.fieldKey as keyof Project]: v });
    }
  }, [project, d.fieldKey, d.customId, updateProject]);

  const runAISuggest = useCallback(async () => {
    if (!project || aiLoading) return;
    setAiLoading(true);
    try {
      let suggestion: string;
      const ctx = buildProjectContext(project);
      if (d.fieldKey === 'background' && !ctx.trim() && project.name?.trim()) {
        suggestion = await researchProjectBackground(project.name.trim());
      } else {
        suggestion = await completeProjectField(
          ctx || `项目名称：${project.name}`,
          d.label,
        );
      }
      handleChange(suggestion.trim());
    } catch { /* silent */ }
    finally { setAiLoading(false); }
  }, [project, d.label, d.fieldKey, handleChange, aiLoading]);

  const handleAISuggest = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); runAISuggest();
  }, [runAISuggest]);

  const preview = value.length > 90 ? value.slice(0, 90) + '…' : value;
  const isBackground = d.fieldKey === 'background';

  return (
    <>
      {/* Outer: position: relative, overflow: visible so + button can float below */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); }}
        style={{ position: 'relative', width: 252 }}
      >
        {/* Visual card (keeps overflow-hidden for border-radius clipping) */}
        <div
          style={{
            borderRadius: 16, overflow: 'hidden',
            background: T.nodeBg,
            border: `1px solid ${selected ? T.accentBorder : hovered ? 'rgba(99,102,241,0.22)' : T.nodeBorder}`,
            boxShadow: selected
              ? `0 0 0 1px rgba(99,102,241,0.25), 0 4px 20px rgba(0,0,0,0.10)`
              : hovered ? '0 4px 16px rgba(99,102,241,0.10)' : '0 1px 8px rgba(0,0,0,0.07)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
        >
          <Handle type="target" position={Position.Top} style={handleStyle} />
          <Handle type="source" position={Position.Bottom} style={handleStyle} />

          {/* Hover tooltip: press E */}
          {hovered && !expanded && !showAdd && (
            <div style={{
              position: 'absolute', top: -28, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(17,24,39,0.85)', color: '#fff', borderRadius: 7,
              padding: '3px 9px', fontSize: 11, whiteSpace: 'nowrap', pointerEvents: 'none',
              backdropFilter: 'blur(4px)', zIndex: 10,
            }}>
              按 <kbd style={{ background: 'rgba(255,255,255,0.18)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>E</kbd> 展开编辑
            </div>
          )}

          {/* Header */}
          <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.divider}` }} className="px-3 py-2.5 flex items-center gap-2">
            <Icon size={12} style={{ color: filled ? T.accent : T.textMuted }} />
            <span className="text-xs font-medium truncate flex-1" style={{ color: T.textSecond }}>{d.label}</span>
            {filled && <CheckCircle size={11} style={{ color: T.accent }} />}
            {hovered && (
              <button className="nodrag" onClick={e => { e.stopPropagation(); setExpanded(true); }} title="展开编辑 (E)"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 20, height: 20, borderRadius: 5, background: 'rgba(99,102,241,0.10)', border: 'none', cursor: 'pointer' }}>
                <Expand size={10} style={{ color: T.accent }} />
              </button>
            )}
          </div>

          {/* Preview body */}
          <div className="p-3">
            {filled ? (
              <p className="text-xs leading-relaxed cursor-text"
                style={{ color: T.textSecond, lineHeight: '1.65', wordBreak: 'break-all' }}
                onClick={e => { e.stopPropagation(); setExpanded(true); }}>
                {preview}
                {value.length > 90 && (
                  <span style={{ color: T.accent, marginLeft: 4 }} onClick={e => { e.stopPropagation(); setExpanded(true); }}>展开</span>
                )}
              </p>
            ) : (
              <p className="text-xs" style={{ color: T.textMuted, lineHeight: '1.6' }}>{d.placeholder}</p>
            )}
            <div className="mt-3 flex items-center justify-between">
              <button className="nodrag flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all hover:opacity-80"
                style={{ background: aiLoading ? T.accentDim : 'rgba(99,102,241,0.08)', color: T.accent, border: `1px solid ${T.accentBorder}`, cursor: aiLoading ? 'not-allowed' : 'pointer' }}
                onClick={handleAISuggest} disabled={aiLoading}>
                {aiLoading ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={10} />}
                {aiLoading ? 'AI 生成中…' : isBackground && !value.trim() ? 'AI 调研背景' : 'AI 补全'}
              </button>
              {value.length > 0 && <span className="text-xs" style={{ color: T.textMuted }}>{value.length} 字</span>}
            </div>
          </div>
        </div>

        {/* ── + button: float below card ──────────────────────────────── */}
        {hovered && (
          <div style={{ position: 'absolute', bottom: -14, left: '50%', transform: 'translateX(-50%)', zIndex: 50 }}>
            <button
              className="nodrag"
              onClick={e => { e.stopPropagation(); setShowAdd(v => !v); }}
              title="从这里添加新卡片"
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: showAdd ? T.accent : '#fff',
                border: `1.5px solid ${T.accentBorder}`,
                boxShadow: '0 2px 8px rgba(99,102,241,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Plus size={12} style={{ color: showAdd ? '#fff' : T.accent }} />
            </button>
            {/* tooltip */}
            {!showAdd && (
              <div style={{
                position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)',
                background: 'rgba(17,24,39,0.82)', color: '#fff', borderRadius: 6,
                padding: '2px 8px', fontSize: 10, whiteSpace: 'nowrap', pointerEvents: 'none',
              }}>
                添加关联卡片
              </div>
            )}
          </div>
        )}

        {/* Add-child popover */}
        {showAdd && (
          <AddChildPopover
            onConfirm={(label) => {
              d.onAddAfter?.(d.nodeKey, label);
              setShowAdd(false);
            }}
            onClose={() => setShowAdd(false)}
          />
        )}
      </div>

      {/* Full-screen editor portal */}
      {expanded && project && (
        <FieldEditor
          label={d.label}
          icon={Icon}
          value={value}
          placeholder={d.placeholder}
          onClose={() => setExpanded(false)}
          onChange={handleChange}
          onAISuggest={runAISuggest}
          aiLoading={aiLoading}
          isBackground={isBackground}
        />
      )}
    </>
  );
});
FieldNode.displayName = 'FieldNode';

// ── Ghost Field Node（虚线提示框，点击确认）────────────────────────────────────
export type GhostNodeData = {
  label: string;
  iconName: string;
  description: string;
  onConfirm: () => void;
};

export const GhostFieldNode = memo(({ data }: NodeProps) => {
  const d = data as GhostNodeData;
  const Icon = ICON_MAP[d.iconName] || BookOpen;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={e => { e.stopPropagation(); d.onConfirm(); }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 252, borderRadius: 16, overflow: 'hidden',
        border: `1.5px dashed ${hovered ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.18)'}`,
        background: hovered ? 'rgba(99,102,241,0.06)' : 'rgba(255,255,255,0.02)',
        cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: hovered ? '0 0 0 4px rgba(99,102,241,0.08)' : 'none',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ ...handleStyle, opacity: 0.4 }} />
      <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, opacity: 0.4 }} />

      <div style={{
        padding: '14px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 10, opacity: hovered ? 1 : 0.55, transition: 'opacity 0.2s',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: hovered ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.2s',
        }}>
          <Icon size={16} style={{ color: hovered ? T.accent : T.textMuted }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: hovered ? T.textPrimary : T.textSecond, marginBottom: 3 }}>
            {d.label}
          </div>
          <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.4 }}>
            {d.description}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 600,
          color: hovered ? T.accent : T.textMuted,
          border: `1px solid ${hovered ? T.accentBorder : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 8, padding: '4px 10px', transition: 'all 0.2s',
        }}>
          <span>+ 点击添加</span>
        </div>
      </div>
    </div>
  );
});
GhostFieldNode.displayName = 'GhostFieldNode';

// ── Materials Node ────────────────────────────────────────────────────────────
export const MaterialsNode = memo(({ data, selected }: NodeProps) => {
  const { projects, updateProject } = useAppStore();
  const pid = (data as { projectId: string }).projectId;
  const project = projects.find(p => p.id === pid);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  if (!project) return null;

  const handleAdd = () => {
    if (!newName.trim()) return;
    const mat: ProjectMaterial = {
      id: `mat-${Date.now()}`,
      type: 'image',
      name: newName.trim(),
      content: `[material: ${newName.trim()}]`,
      uploadedAt: new Date().toISOString(),
    };
    updateProject(project.id, { materials: [...project.materials, mat] });
    setNewName('');
    setAdding(false);
  };

  return (
    <div
      className={nodeBase(selected)}
      style={{
        width: 252,
        background: T.nodeBg,
        border: `1px solid ${selected ? T.accentBorder : T.nodeBorder}`,
        boxShadow: selected ? '0 0 0 1px rgba(99,102,241,0.25), 0 4px 20px rgba(0,0,0,0.10)' : '0 1px 8px rgba(0,0,0,0.07)',
      }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.divider}` }} className="px-3 py-2.5 flex items-center gap-2">
        <ImagePlus size={12} style={{ color: project.materials.length > 0 ? T.accent : T.textMuted }} />
        <span className="text-xs font-medium flex-1" style={{ color: T.textSecond }}>Materials</span>
        <span className="text-xs px-1.5 py-0.5 rounded-md font-medium tabular-nums"
          style={{ background: T.accentDim, color: T.accent }}>
          {project.materials.length}
        </span>
      </div>

      <div className="p-3 space-y-1.5 max-h-44 overflow-y-auto nowheel">
        {project.materials.length === 0 && (
          <div className="text-xs text-center py-3" style={{ color: T.textMuted }}>No materials yet</div>
        )}
        {project.materials.map(m => (
          <div key={m.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <CheckCircle2 size={11} style={{ color: T.accent }} className="shrink-0" />
            <span className="text-xs flex-1 truncate" style={{ color: T.textPrimary }}>{m.name}</span>
            <button
              onClick={e => { e.stopPropagation(); updateProject(project.id, { materials: project.materials.filter(x => x.id !== m.id) }); }}
              className="nodrag transition-opacity hover:opacity-80"
            >
              <X size={11} style={{ color: T.textMuted }} />
            </button>
          </div>
        ))}
      </div>

      <div className="px-3 pb-3">
        {adding ? (
          <div className="flex gap-1.5">
            <input
              autoFocus
              className="nodrag nopan flex-1 text-xs outline-none rounded-lg px-2 py-1.5"
              style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${T.accentBorder}`, color: T.textPrimary }}
              placeholder="材料名称…"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
              onClick={e => e.stopPropagation()}
            />
            <button className="nodrag text-xs px-2 rounded-lg" style={{ background: T.accentDim, color: T.accent }} onClick={e => { e.stopPropagation(); handleAdd(); }}>✓</button>
          </div>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); setAdding(true); }}
            className="nodrag w-full flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-xl transition-all hover:opacity-80"
            style={{ border: `1px dashed ${T.nodeBorder}`, color: T.textSecond }}
          >
            <Upload size={10} />
            添加材料
          </button>
        )}
      </div>
    </div>
  );
});
MaterialsNode.displayName = 'MaterialsNode';

// ── AI Panel Node ─────────────────────────────────────────────────────────────
export const AIPanelNode = memo(({ data, selected }: NodeProps) => {
  const { projects, updateProject } = useAppStore();
  const pid = (data as { projectId: string }).projectId;
  const project = projects.find(p => p.id === pid);
  if (!project) return null;

  const [analyzing, setAnalyzing] = useState(false);
  const hasResult = !!project.aiFeedback && project.aiFeedback !== '___analyzing___';

  const handleAnalyze = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (analyzing) return;
    setAnalyzing(true);
    updateProject(project.id, { aiFeedback: '___analyzing___', missingElements: [] });
    try {
      const ctx = buildProjectContext(project);
      if (!ctx.trim()) {
        updateProject(project.id, { aiFeedback: '请先填写一些项目字段，再进行 AI 分析。', missingElements: [] });
        return;
      }
      const result = await analyzeProject(ctx);
      updateProject(project.id, {
        aiFeedback: result.feedback,
        missingElements: result.missing,
        completionRate: result.completionRate,
      });
    } catch {
      updateProject(project.id, { aiFeedback: 'AI 分析失败，请稍后重试。', missingElements: [] });
    } finally {
      setAnalyzing(false);
    }
  }, [project, analyzing, updateProject]);

  return (
    <div
      className={nodeBase(selected)}
      style={{
        width: 280,
        background: T.nodeBg,
        border: `1px solid ${selected ? T.accentBorder : T.nodeBorder}`,
        boxShadow: hasResult
          ? `0 0 0 1px ${T.accentBorder}, 0 8px 40px rgba(99,102,241,0.08)`
          : '0 1px 8px rgba(0,0,0,0.07)',
      }}
    >
      <Handle type="target" position={Position.Top} style={handleStyle} />

      <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.divider}` }} className="px-3 py-2.5 flex items-center gap-2">
        <Bot size={12} style={{ color: T.accent }} />
        <span className="text-xs font-medium flex-1" style={{ color: T.textSecond }}>AI Analysis</span>
        {hasResult && <Sparkles size={11} style={{ color: T.accent }} />}
      </div>

      <div className="p-3">
        {analyzing ? (
          <div className="flex flex-col items-center py-5 gap-3">
            <Loader2 size={20} style={{ color: T.accent, animation: 'spin 1s linear infinite' }} />
            <span className="text-xs" style={{ color: T.textSecond }}>AI 正在分析项目…</span>
          </div>
        ) : hasResult ? (
          <div className="space-y-3">
            <p className="text-xs leading-relaxed" style={{ color: T.textSecond }}>
              {project.aiFeedback}
            </p>
            {project.missingElements && project.missingElements.length > 0 && (
              <div>
                <div className="text-xs mb-1.5 font-medium" style={{ color: T.textMuted }}>Missing</div>
                <div className="flex flex-wrap gap-1">
                  {project.missingElements.map((m, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-md"
                      style={{ background: 'rgba(255,255,255,0.06)', color: T.textSecond }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <button
              onClick={handleAnalyze}
              className="nodrag text-xs transition-opacity hover:opacity-70"
              style={{ color: T.textMuted }}
            >
              重新分析
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-5 gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.accentDim }}>
              <Bot size={18} style={{ color: T.accent }} />
            </div>
            <p className="text-xs text-center" style={{ color: T.textMuted }}>
              Fill in some fields, then let AI analyze
            </p>
            <button
              onClick={handleAnalyze}
              className="nodrag flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBorder}` }}
            >
              <Sparkles size={12} />
              AI 分析项目
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
AIPanelNode.displayName = 'AIPanelNode';
