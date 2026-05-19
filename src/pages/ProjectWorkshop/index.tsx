import { useState, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { suggestProjectNodes, generatePortfolioFromAI } from '../../lib/agentAPI';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, FolderOpen, ZoomIn, Grid3x3, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import type { Project } from '../../types';
import {
  ProjectHeaderNode,
  FieldNode,
  MaterialsNode,
  AIPanelNode,
  GhostFieldNode,
  type FieldNodeData,
} from './ProjectNodes';

// ── node type registry ────────────────────────────────────────────────────────
const nodeTypes: NodeTypes = {
  'project-header': ProjectHeaderNode,
  'field': FieldNode,
  'materials': MaterialsNode,
  'ai-panel': AIPanelNode,
  'ghost-field': GhostFieldNode,
};

// ── Comprehensive library of all possible node types ─────────────────────────
// AI picks relevant subset; maps to existing Project fields where possible.
export interface NodeLibEntry {
  label: string;
  icon: string;
  description: string;
  fieldKey?: keyof Project;    // maps to a Project string field
  special?: 'materials' | 'ai-panel';
}

export const NODE_LIBRARY: Record<string, NodeLibEntry> = {
  background:    { label: '项目背景',     icon: 'BookOpen',   description: '描述项目的起源、场景与意义',          fieldKey: 'background' },
  designGoal:    { label: '设计目标',     icon: 'Target',     description: '明确希望达到的效果与衡量标准',        fieldKey: 'designGoal' },
  contribution:  { label: '个人贡献',     icon: 'User',       description: '在团队中承担的角色与具体工作',        fieldKey: 'personalContribution' },
  challenge:     { label: '核心挑战',     icon: 'Zap',        description: '项目中遇到的主要困难与限制',          fieldKey: 'mainChallenge' },
  solution:      { label: '方案探索',     icon: 'GitCompare', description: '备选方案对比与最终选择理由',          fieldKey: 'solutionComparison' },
  materials:     { label: '参考素材',     icon: 'Layers',     description: '项目参考资料与素材库',               special: 'materials' },
  materialChoice:{ label: '材料选型',     icon: 'Package',    description: '材料对比、选型依据与物理特性分析',    fieldKey: 'materialChoice' },
  manufacturing: { label: '制造工艺',     icon: 'Settings2',  description: '加工方式、生产流程与制造注意事项',    fieldKey: 'manufacturingConsideration' },
  improvement:   { label: '改进方向',     icon: 'Lightbulb',  description: '迭代想法、未来优化的可能路径',        fieldKey: 'improvementIdeas' },
  analysis:      { label: 'AI 综合分析',  icon: 'Sparkles',   description: '基于所有已填内容生成项目完整度报告',  special: 'ai-panel' },
};

// ── Layout: assign grid positions dynamically ────────────────────────────────
const HEADER_POS = { x: 320, y: 0 };
const OVERVIEW_POS = { x: 320, y: 220 };

function layerPositions(keys: string[], layer: number): Record<string, { x: number; y: number }> {
  const gap = 340;
  const y = 220 + layer * 240;
  const total = keys.length;
  const startX = 320 - ((total - 1) * gap) / 2;
  const result: Record<string, { x: number; y: number }> = {};
  keys.forEach((k, i) => { result[k] = { x: startX + i * gap, y }; });
  return result;
}

// ── Build edges from confirmed + suggested keys ───────────────────────────────
function buildEdges(
  pid: string,
  confirmed: string[],
  suggested: string[],
  extraFields: Project['extraFields'],
): Edge[] {
  const edges: Edge[] = [];
  const add = (source: string, target: string, dashed = false) => {
    const solid = !dashed && confirmed.includes(source) && confirmed.includes(target);
    edges.push({
      id: `${pid}-${source}-${target}`,
      source: `${pid}-${source}`,
      target: `${pid}-${target}`,
      type: 'smoothstep',
      style: {
        stroke: solid ? '#818cf8' : 'rgba(129,140,248,0.30)',
        strokeWidth: solid ? 1.5 : 1,
        strokeDasharray: solid ? undefined : '5 4',
        opacity: solid ? 0.65 : 0.35,
      },
    });
  };

  add('header', 'background');
  const allNext = [...new Set([...suggested, ...confirmed.filter(k => k !== 'header' && k !== 'background' && !k.startsWith('extra:'))])];
  allNext.forEach(k => add('background', k));
  const contentConfirmed = confirmed.filter(k => !['header', 'background', 'materials', 'analysis'].includes(k) && !k.startsWith('extra:'));
  if (contentConfirmed.length > 0 || suggested.includes('analysis')) {
    contentConfirmed.forEach(k => add(k, 'analysis'));
  }
  // extra node edges: parentKey → extra:id
  confirmed.filter(k => k.startsWith('extra:')).forEach(extraKey => {
    const id = extraKey.slice(6);
    const parentKey = extraFields?.[id]?.parentKey ?? 'background';
    add(parentKey, extraKey);
  });

  return edges;
}

// ── Build nodes from confirmed + suggested, with positions ───────────────────
function buildNodes(
  project: Project,
  confirmed: string[],
  suggested: string[],
  onConfirm: (key: string) => void,
  aiLoading: boolean,
  onAddAfter: (parentKey: string, label: string) => void,
): Node[] {
  const pid = project.id;
  const id = (k: string) => `${pid}-${k}`;

  const positions: Record<string, { x: number; y: number }> = {
    header:  HEADER_POS,
    background: OVERVIEW_POS,
  };

  const layer2Keys = [...new Set([
    ...confirmed.filter(k => k !== 'header' && k !== 'background' && k !== 'materials' && k !== 'analysis' && !k.startsWith('extra:')),
    ...suggested.filter(k => k !== 'materials' && k !== 'analysis'),
  ])];
  Object.assign(positions, layerPositions(layer2Keys, 2));

  if (confirmed.includes('materials') || suggested.includes('materials')) {
    const l2y = 220 + 2 * 240;
    positions['materials'] = { x: (positions[layer2Keys[0]]?.x ?? 60) - 380, y: l2y };
  }
  if (confirmed.includes('analysis') || suggested.includes('analysis')) {
    const l2y = 220 + 2 * 240;
    const lastX = layer2Keys.length > 0 ? (positions[layer2Keys[layer2Keys.length - 1]]?.x ?? 320) : 320;
    positions['analysis'] = { x: lastX + 380, y: l2y };
  }

  // Position extra:* nodes: group by parent, spread horizontally below parent
  const extraConfirmed = confirmed.filter(k => k.startsWith('extra:'));
  const extraByParent: Record<string, string[]> = {};
  extraConfirmed.forEach(extraKey => {
    const eid = extraKey.slice(6);
    const parentKey = project.extraFields?.[eid]?.parentKey ?? 'background';
    if (!extraByParent[parentKey]) extraByParent[parentKey] = [];
    extraByParent[parentKey].push(extraKey);
  });
  Object.entries(extraByParent).forEach(([parentKey, keys]) => {
    const parentPos = positions[parentKey] ?? OVERVIEW_POS;
    const total = keys.length;
    const startX = parentPos.x - ((total - 1) * 290) / 2;
    keys.forEach((extraKey, i) => {
      positions[extraKey] = { x: startX + i * 290, y: parentPos.y + 270 };
    });
  });

  const nodes: Node[] = [];

  nodes.push({ id: id('header'), type: 'project-header', position: HEADER_POS, data: { projectId: pid } });

  const allKeys = ['background', ...layer2Keys, 'materials', 'analysis'];
  for (const key of allKeys) {
    const entry = NODE_LIBRARY[key];
    if (!entry) continue;
    const pos = positions[key] ?? { x: 320, y: 460 };
    const isConfirmed = confirmed.includes(key);
    const isSuggested = suggested.includes(key) && !isConfirmed;

    if (isConfirmed) {
      if (entry.special === 'materials') {
        nodes.push({ id: id('materials'), type: 'materials', position: pos, data: { projectId: pid } });
      } else if (entry.special === 'ai-panel') {
        nodes.push({ id: id('analysis'), type: 'ai-panel', position: pos, data: { projectId: pid } });
      } else if (entry.fieldKey) {
        nodes.push({
          id: id(key), type: 'field', position: pos,
          data: {
            projectId: pid, fieldKey: entry.fieldKey,
            label: entry.label, placeholder: entry.description,
            category: key, iconName: entry.icon,
            nodeKey: key, onAddAfter,
          } satisfies FieldNodeData,
        });
      }
    } else if (isSuggested) {
      nodes.push({
        id: id(key), type: 'ghost-field', position: pos,
        data: {
          label: aiLoading && key === suggested[0] ? '正在分析项目…' : entry.label,
          iconName: aiLoading && key === suggested[0] ? 'Loader2' : entry.icon,
          description: aiLoading ? '' : entry.description,
          onConfirm: () => onConfirm(key),
        },
      });
    }
  }

  // Extra custom nodes
  extraConfirmed.forEach(extraKey => {
    const eid = extraKey.slice(6);
    const field = project.extraFields?.[eid];
    if (!field) return;
    const pos = positions[extraKey] ?? { x: 320, y: 700 };
    nodes.push({
      id: id(extraKey), type: 'field', position: pos,
      data: {
        projectId: pid, fieldKey: '__extra__' as keyof Project,
        customId: eid, label: field.label,
        placeholder: `在这里记录「${field.label}」相关内容…`,
        category: extraKey, iconName: 'Lightbulb',
        nodeKey: extraKey, onAddAfter,
      } satisfies FieldNodeData,
    });
  });

  return nodes;
}

// ── Next-node suggestions: delegate to Agent backend ─────────────────────────
async function askNextNodes(projectName: string, overview: string): Promise<string[]> {
  try {
    const keys = await suggestProjectNodes(projectName, overview);
    const valid = keys.filter(k => NODE_LIBRARY[k]);
    if (valid.length >= 2) return valid.slice(0, 4);
  } catch {
    // backend not running → graceful fallback
  }
  return ['designGoal', 'challenge', 'contribution'];
}

// ── new project factory ───────────────────────────────────────────────────────
function createBlankProject(): Project {
  return {
    id: `project-${Date.now()}`,
    name: '',
    background: '', designGoal: '', personalContribution: '', mainChallenge: '',
    solutionComparison: '', materialChoice: '', manufacturingConsideration: '',
    hasPrototypeTesting: false, improvementIdeas: '',
    materials: [], aiFeedback: '', missingElements: [], completionRate: 0,
    confirmedNodes: ['header'],
    suggestedNodes: ['background'],
  };
}

// ── A2A Handoff overlay ───────────────────────────────────────────────────────
type HandoffStage = 'idle' | 'agent1' | 'agent2' | 'done' | 'error';

interface HandoffState {
  stage: HandoffStage;
  agent1Result?: { completionScore: number; coreStrengths: string[]; portfolioAngle: string };
  error?: string;
}

function HandoffOverlay({
  state,
  onClose,
  onNavigate,
}: {
  state: HandoffState;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const steps = [
    { id: 'agent1', label: 'Agent 1 · 项目分析', desc: '评估完整度、提炼叙事弧线与核心亮点' },
    { id: 'agent2', label: 'Agent 2 · 作品集生成', desc: '根据分析结果生成页面结构与内容建议' },
  ];

  const getStepStatus = (id: string) => {
    if (state.stage === 'idle') return 'idle';
    if (state.stage === 'error') return 'idle';
    if (id === 'agent1') return state.stage === 'agent1' ? 'running' : 'done';
    if (id === 'agent2') return state.stage === 'agent2' ? 'running' : state.stage === 'done' ? 'done' : 'idle';
    return 'idle';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: -16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        style={{ background: '#ffffff', borderRadius: 24, padding: 36, width: 480, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', border: '1px solid rgba(0,0,0,0.06)' }}
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
            转入作品集工作台
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            双 Agent 协作 · 自动分析项目并生成作品集结构
          </div>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
          {steps.map((step) => {
            const status = getStepStatus(step.id);
            return (
              <div key={step.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14,
                background: status === 'running' ? 'rgba(99,102,241,0.06)' : status === 'done' ? 'rgba(16,185,129,0.05)' : 'rgba(0,0,0,0.02)',
                border: `1px solid ${status === 'running' ? 'rgba(99,102,241,0.25)' : status === 'done' ? 'rgba(16,185,129,0.20)' : 'rgba(0,0,0,0.06)'}`,
                transition: 'all 0.3s ease',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: status === 'done' ? 'rgba(16,185,129,0.12)' : status === 'running' ? 'rgba(99,102,241,0.12)' : 'rgba(0,0,0,0.04)' }}>
                  {status === 'done' ? (
                    <CheckCircle2 size={16} style={{ color: '#10b981' }} />
                  ) : status === 'running' ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                      <Loader2 size={16} style={{ color: '#6366f1' }} />
                    </motion.div>
                  ) : (
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: 'rgba(0,0,0,0.15)' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: status === 'idle' ? '#9ca3af' : '#111827' }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Agent 1 result preview */}
        {state.agent1Result && state.stage !== 'agent1' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, padding: '12px 14px', marginBottom: 20 }}
          >
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6366f1', marginBottom: 8 }}>
              Agent 1 交接摘要 · 完整度 {state.agent1Result.completionScore}%
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {state.agent1Result.coreStrengths.slice(0, 3).map((s, i) => (
                <span key={i} style={{ fontSize: 11, background: 'rgba(99,102,241,0.10)', color: '#4f46e5', padding: '2px 8px', borderRadius: 20 }}>{s}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.5 }}>{state.agent1Result.portfolioAngle}</div>
          </motion.div>
        )}

        {/* Error */}
        {state.stage === 'error' && (
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.20)', borderRadius: 12, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#ef4444' }}>
            {state.error ?? '生成失败，请确认后端服务已启动'}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          {state.stage !== 'agent1' && state.stage !== 'agent2' && (
            <button
              onClick={onClose}
              style={{ flex: 1, padding: '10px 0', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 12, background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}
            >
              {state.stage === 'done' ? '留在这里' : '取消'}
            </button>
          )}
          {state.stage === 'done' && (
            <button
              onClick={onNavigate}
              style={{ flex: 2, padding: '10px 0', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              前往作品集工作台
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProjectWorkshop() {
  const navigate = useNavigate();
  const { projects, addProject, updateProject, addPortfolio, targetRole } = useAppStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [handoff, setHandoff] = useState<HandoffState>({ stage: 'idle' });

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedId), [projects, selectedId]);
  const confirmed = useMemo(() => selectedProject?.confirmedNodes ?? ['header'], [selectedProject]);
  const suggested = useMemo(() => selectedProject?.suggestedNodes ?? ['background'], [selectedProject]);

  // Confirm a ghost node → add to confirmedNodes
  const confirmNode = useCallback((key: string) => {
    if (!selectedId) return;
    const project = projects.find(p => p.id === selectedId);
    if (!project) return;
    const nextConfirmed = [...new Set([...(project.confirmedNodes ?? ['header']), key])];
    const nextSuggested = (project.suggestedNodes ?? []).filter(k => k !== key);
    updateProject(selectedId, { confirmedNodes: nextConfirmed, suggestedNodes: nextSuggested } as Partial<Project>);
  }, [selectedId, projects, updateProject]);

  // Add a free-form custom node from any existing node
  const addCustomNode = useCallback((parentKey: string, label: string) => {
    if (!selectedId) return;
    const project = projects.find(p => p.id === selectedId);
    if (!project) return;
    const customId = `c${Date.now()}`;
    const extraKey = `extra:${customId}`;
    const nextConfirmed = [...new Set([...(project.confirmedNodes ?? ['header']), extraKey])];
    const nextExtra = {
      ...(project.extraFields ?? {}),
      [customId]: { label, content: '', parentKey },
    };
    updateProject(selectedId, {
      confirmedNodes: nextConfirmed,
      extraFields: nextExtra,
    } as Partial<Project>);
  }, [selectedId, projects, updateProject]);

  // After background is confirmed with content → ask AI for next nodes
  useEffect(() => {
    if (!selectedProject) return;
    if (!confirmed.includes('background')) return;
    if (!selectedProject.background?.trim()) return;
    if ((selectedProject.suggestedNodes ?? []).filter(k => k !== 'background').length > 0) return;
    // Trigger AI suggestion
    setAiLoading(true);
    askNextNodes(selectedProject.name, selectedProject.background).then(keys => {
      updateProject(selectedProject.id, { suggestedNodes: keys } as Partial<Project>);
      setAiLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed.join(','), selectedProject?.background]);

  // Rebuild canvas
  const extraFieldsKey = JSON.stringify(selectedProject?.extraFields ?? {});
  useEffect(() => {
    if (!selectedId || !selectedProject) { setNodes([]); setEdges([]); return; }
    setNodes(buildNodes(selectedProject, confirmed, suggested, confirmNode, aiLoading, addCustomNode));
    setEdges(buildEdges(selectedId, confirmed, suggested, selectedProject.extraFields));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, confirmed.join(','), suggested.join(','), aiLoading, extraFieldsKey]);

  // Create project directly — no modal
  const handleNewProject = useCallback(() => {
    const p = createBlankProject();
    addProject(p);
    setSelectedId(p.id);
  }, [addProject]);

  // Agent-to-Agent handoff: Project Workshop → Portfolio Studio
  const handleHandoff = useCallback(async () => {
    if (!selectedProject) return;
    setHandoff({ stage: 'agent1' });
    try {
      const role = (targetRole as string) ?? 'product-design-engineer';
      const result = await generatePortfolioFromAI(
        selectedProject as unknown as Record<string, unknown>,
        role,
      );

      // After Agent 1 analysis is visible, transition to Agent 2 phase
      setHandoff({
        stage: 'agent2',
        agent1Result: result.handoffAnalysis
          ? {
              completionScore: result.handoffAnalysis.completionScore,
              coreStrengths: result.handoffAnalysis.coreStrengths,
              portfolioAngle: result.handoffAnalysis.portfolioAngle,
            }
          : undefined,
      });

      // Small delay to show Agent 2 running state before done
      await new Promise(r => setTimeout(r, 600));

      // Save portfolio to store
      addPortfolio(result.portfolio as Parameters<typeof addPortfolio>[0]);

      setHandoff(prev => ({ ...prev, stage: 'done' }));
    } catch (err) {
      setHandoff({ stage: 'error', error: (err as Error).message });
    }
  }, [selectedProject, targetRole, addPortfolio]);

  return (
    <>
    <AnimatePresence>
      {handoff.stage !== 'idle' && (
        <HandoffOverlay
          state={handoff}
          onClose={() => setHandoff({ stage: 'idle' })}
          onNavigate={() => { setHandoff({ stage: 'idle' }); navigate('/portfolio'); }}
        />
      )}
    </AnimatePresence>
    <div className="flex h-screen" style={{ height: 'calc(100vh - 0px)', background: '#f5f6fa' }}>
      {/* ── Left project panel ─────────────────────────────────────────── */}
      <div className="w-52 shrink-0 flex flex-col" style={{ background: '#ffffff', borderRight: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(0,0,0,0.25)' }}>Projects</div>
          <button
            onClick={handleNewProject}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.35)' }}
          >
            <Plus size={13} />
            新建项目
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <AnimatePresence>
            {projects.map(p => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: selectedId === p.id ? 'rgba(99,102,241,0.10)' : 'transparent',
                  border: `1px solid ${selectedId === p.id ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={12} style={{ color: selectedId === p.id ? '#6366f1' : 'rgba(0,0,0,0.25)' }} />
                  <span className="text-xs font-medium truncate" style={{ color: selectedId === p.id ? '#4f46e5' : '#374151' }}>
                    {p.name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>未命名项目</span>}
                  </span>
                </div>
                {p.completionRate > 0 && (
                  <div className="mt-1.5 h-px" style={{ background: 'rgba(0,0,0,0.06)' }}>
                    <div className="h-px transition-all" style={{ width: `${p.completionRate}%`, background: '#6366f1', opacity: 0.7 }} />
                  </div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>

          {projects.length === 0 && (
            <div className="text-center py-8 text-xs" style={{ color: 'rgba(0,0,0,0.20)' }}>
              <Grid3x3 size={22} className="mx-auto mb-2 opacity-40" />
              暂无项目
            </div>
          )}
        </div>

        {/* ── Transfer to Portfolio button ─────────────────────────── */}
        {selectedProject && (
          <div className="p-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
            <button
              onClick={handleHandoff}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-85"
              style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))', color: '#6366f1', border: '1px solid rgba(99,102,241,0.30)' }}
            >
              <ArrowRight size={12} />
              转入作品集
            </button>
          </div>
        )}
      </div>

      {/* ── Canvas ────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {selectedProject ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#f5f6fa' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(0,0,0,0.10)" />
            <Controls
              style={{
                background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              }}
            />
            <MiniMap
              style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12 }}
              nodeColor="rgba(99,102,241,0.35)"
              maskColor="rgba(245,246,250,0.7)"
            />
            <Panel position="top-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1' }} />
                <span className="text-sm font-medium" style={{ color: '#374151' }}>
                  {selectedProject.name || '未命名项目'}
                </span>
                {aiLoading && (
                  <>
                    <div className="w-px h-4 mx-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
                    <span className="text-xs" style={{ color: '#6366f1' }}>AI 分析中…</span>
                  </>
                )}
                <div className="w-px h-4 mx-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
                <div className="flex items-center gap-1 text-xs" style={{ color: '#9ca3af' }}>
                  <ZoomIn size={11} />
                  <span>scroll · drag</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
              <Grid3x3 size={28} style={{ color: 'rgba(99,102,241,0.6)' }} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: '#374151' }}>还没有项目</h3>
            <p className="text-sm mb-6 max-w-xs" style={{ color: '#9ca3af' }}>
              点击左侧「新建项目」开始
            </p>
            <button
              onClick={handleNewProject}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.30)' }}
            >
              <Plus size={13} />
              新建项目
            </button>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
